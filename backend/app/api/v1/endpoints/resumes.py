# app/api/v1/endpoints/resumes.py
import io
import logging
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Response
from pydantic import BaseModel
from pypdf import PdfReader

from app.api.dependencies import CurrentUser
from app.core.config import settings
from app.core.rate_limit import ats_rate_key, limiter
from app.db.supabase import get_db
from app.services.resume_pdf_generator import generate_resume_pdf, parse_issue_string, render_structured_resume_pdf
from app.services.resume_parser import parse_raw_text_to_structured
from app.services.credits import deduct_feature_credits, refund_feature_credits
from app.services.llm_client import chat_complete
from app.services.ai_retry import with_ai_retry
from app.schemas.resume_editor import StructuredResume

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload")
@limiter.limit(settings.RATE_LIMIT_UPLOAD, key_func=ats_rate_key)
async def upload_resume(request: Request, user: CurrentUser, file: UploadFile = File(...)):
    supabase = await get_db()

    # 0. Enforce per-user resume cap (prevents unbounded storage + slow dashboard queries)
    MAX_RESUMES_PER_USER = 20
    existing_res = await supabase.table("resumes") \
        .select("id, file_url") \
        .eq("user_id", user.id).execute()
    existing_resumes = existing_res.data or []
    current_count = len(existing_resumes)
    if current_count >= MAX_RESUMES_PER_USER:
        raise HTTPException(
            status_code=400,
            detail=f"You have reached the maximum of {MAX_RESUMES_PER_USER} resumes. "
                   f"Please delete old resumes before uploading a new one."
        )

    # 0b. Duplicate name check — compare original filename (strip timestamp prefix)
    incoming_name = Path(file.filename or "resume.pdf").name.replace("/", "_").replace("\\", "_")
    for existing in existing_resumes:
        existing_name = Path(existing.get("file_url", "")).name
        # Strip the leading timestamp prefix (e.g. "1716000000_resume.pdf" → "resume.pdf")
        existing_original = existing_name.split("_", 1)[1] if "_" in existing_name else existing_name
        if existing_original.lower() == incoming_name.lower():
            raise HTTPException(
                status_code=409,
                detail=f'A resume named "{incoming_name}" already exists. '
                       f"Please rename your file before uploading, or delete the existing one first."
            )

    # 1. Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > settings.MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail="PDF must be 5MB or smaller")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Content-Length header")

    # 2. Read file content into memory
    file_content = await file.read()
    if len(file_content) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="PDF must be 5MB or smaller")
    if not file_content.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid PDF")

    # 3. Extract text using pypdf (max 20 pages to prevent decompression abuse)
    MAX_PAGES = 20
    MAX_TEXT_CHARS = 100_000
    try:
        pdf_reader = PdfReader(io.BytesIO(file_content))
        if len(pdf_reader.pages) > MAX_PAGES:
            raise HTTPException(
                status_code=400,
                detail=f"PDF must not exceed {MAX_PAGES} pages.",
            )
        extracted_text = ""
        for page in pdf_reader.pages:
            extracted_text += page.extract_text() + "\n"
            if len(extracted_text) > MAX_TEXT_CHARS:
                extracted_text = extracted_text[:MAX_TEXT_CHARS]
                break
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to parse PDF text.")

    if len(extracted_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="PDF is empty or unreadable.")

    # 4. Upload to Supabase Storage with unique filename
    timestamp = int(time.time())
    safe_name = Path(file.filename or "resume.pdf").name.replace("/", "_").replace("\\", "_")
    unique_filename = f"{timestamp}_{safe_name}"
    file_path = f"{user.id}/{unique_filename}"
    try:
        await supabase.storage.from_("Resumes").upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": "application/pdf"}
        )
    except Exception as e:
        logger.error("Storage upload failed for user %s: %s", user.id, e)
        raise HTTPException(status_code=500, detail="An internal error occurred while storing the file.")

    # 5. Save metadata & text to database
    try:
        data = {
            "user_id": user.id,
            "file_url": file_path,
            "parsed_content": {"raw_text": extracted_text},
            "resume_quality_feedback": 0
        }
        result = await supabase.table("resumes").insert(data).execute()
        return {
            "msg": "Resume uploaded successfully",
            "id": result.data[0]['id'],
            "extracted_length": len(extracted_text)
        }
    except Exception as e:
        logger.error("Database insert failed for user %s: %s", user.id, e)
        # Clean up the orphaned storage file so it doesn't accumulate
        try:
            await supabase.storage.from_("Resumes").remove([file_path])
            logger.info("Cleaned up orphaned storage file: %s", file_path)
        except Exception as cleanup_err:
            logger.warning("Failed to clean up orphaned file %s: %s", file_path, cleanup_err)
        raise HTTPException(status_code=500, detail="An internal error occurred while saving the record.")


@router.get("/")
async def list_resumes(user: CurrentUser):
    supabase = await get_db()
    res = await supabase.table("resumes") \
        .select("id, file_url, resume_quality_feedback, created_at") \
        .eq("user_id", user.id) \
        .order("created_at", desc=True) \
        .limit(50) \
        .execute()
    return res.data


@router.get("/{resume_id}")
async def get_resume(resume_id: str, user: CurrentUser):
    supabase = await get_db()
    res = await supabase.table("resumes").select("*") \
        .eq("id", resume_id).eq("user_id", user.id).execute()
    if not res.data:
        raise HTTPException(404, "Not found")
    resume_data = res.data[0]

    # Generate signed URL for PDF preview in browser iframe
    file_path = resume_data.get("file_url")
    pdf_url = None
    if file_path:
        try:
            signed = await supabase.storage.from_("Resumes").create_signed_url(file_path, 3600)
            pdf_url = signed.get("signedUrl") or signed.get("signedURL")
        except Exception as e:
            logger.warning("Failed to create signed URL for resume %s: %s", resume_id, e)

    resume_data["pdf_url"] = pdf_url
    return resume_data


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, user: CurrentUser):
    files_to_delete = []
    supabase = await get_db()

    # 1. Get the resume PDF URL
    res_data = await supabase.table("resumes") \
        .select("file_url") \
        .eq("id", resume_id).eq("user_id", user.id).execute()

    if not res_data.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    if res_data.data[0].get("file_url"):
        files_to_delete.append(res_data.data[0]["file_url"])

    # 2. Get associated cover letter PDF URLs
    cl_data = await supabase.table("job_applications") \
        .select("cover_letter_file_url") \
        .eq("resume_id", resume_id).eq("user_id", user.id).execute()

    for record in cl_data.data:
        if record.get("cover_letter_file_url"):
            files_to_delete.append(record["cover_letter_file_url"])

    # 3. Delete files from storage
    if files_to_delete:
        try:
            await supabase.storage.from_("Resumes").remove(files_to_delete)
        except Exception as e:
            logger.warning("Storage cleanup warning: %s", e)

    # 4. Delete database records
    # NOTE: resume ownership is already verified above.
    # ai_analyses is filtered by both resume_id AND user_id for defense-in-depth.
    try:
        await supabase.table("job_applications").delete() \
            .eq("resume_id", resume_id).eq("user_id", user.id).execute()
        await supabase.table("ai_analyses").delete() \
            .eq("resume_id", resume_id).eq("user_id", str(user.id)).execute()
        await supabase.table("resumes").delete() \
            .eq("id", resume_id).eq("user_id", user.id).execute()
    except Exception as e:
        logger.error("Database deletion failed for resume %s: %s", resume_id, e)
        raise HTTPException(status_code=500, detail="An internal error occurred while deleting the record.")

    return {"msg": "Resume and all associated data successfully deleted."}


class OptimizedPdfRequest(BaseModel):
    replacements: list[dict] | None = None
    custom_text: str | None = None


@router.post("/{resume_id}/optimized_pdf")
@router.get("/{resume_id}/optimized_pdf")
async def get_optimized_resume_pdf(
    resume_id: str,
    user: CurrentUser,
    body: OptimizedPdfRequest | None = None
):
    supabase = await get_db()
    res = await supabase.table("resumes").select("*") \
        .eq("id", resume_id).eq("user_id", user.id).execute()
    if not res.data:
        raise HTTPException(404, "Resume not found")
    resume_data = res.data[0]

    # 1. Determine base resume text
    resume_text = (body.custom_text if body and body.custom_text else None)
    if not resume_text:
        parsed_content = resume_data.get("parsed_content") or {}
        resume_text = parsed_content.get("raw_text")

    # If raw_text is missing, fall back to downloading file from storage and extracting
    if not resume_text:
        file_path = resume_data.get("file_url")
        if file_path:
            try:
                storage_bytes = await supabase.storage.from_("Resumes").download(file_path)
                pdf_reader = PdfReader(io.BytesIO(storage_bytes))
                resume_text = "".join(p.extract_text() + "\n" for p in pdf_reader.pages)
            except Exception as e:
                logger.warning("Failed to extract text from storage for resume %s: %s", resume_id, e)

    if not resume_text or not resume_text.strip():
        raise HTTPException(400, "Resume text could not be found or extracted.")

    # 2. Determine replacements
    replacements = (body.replacements if body and body.replacements is not None else None)
    if replacements is None:
        replacements = []
        try:
            analyses_res = await supabase.table("ai_analyses") \
                .select("output_data") \
                .eq("resume_id", resume_id) \
                .eq("user_id", str(user.id)) \
                .eq("analysis_type", "deep_analysis") \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()
            if analyses_res.data:
                out = analyses_res.data[0].get("output_data") or {}
                # Extract from sections
                sections = out.get("sections") or {}
                for sec_name, sec_val in sections.items():
                    issues = sec_val.get("issues") or []
                    for iss in issues:
                        parsed = parse_issue_string(iss)
                        if parsed["is_structured"] and (parsed["original"] or parsed["fix"]):
                            replacements.append({
                                "original": parsed["original"],
                                "fix": parsed["fix"]
                            })
                # Extract from action items
                action_items = out.get("action_items") or []
                for item in action_items:
                    parsed = parse_issue_string(item)
                    if parsed["is_structured"] and (parsed["original"] or parsed["fix"]):
                        replacements.append({
                            "original": parsed["original"],
                            "fix": parsed["fix"]
                        })
        except Exception as e:
            logger.warning("Failed to fetch deep analysis fixes for resume %s: %s", resume_id, e)

    # 3. Generate PDF
    try:
        pdf_bytes = generate_resume_pdf(resume_text, replacements)
    except Exception as e:
        logger.error("Failed to generate optimized PDF for resume %s: %s", resume_id, e)
        raise HTTPException(500, "Failed to compile optimized resume PDF.")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'inline; filename="optimized_resume.pdf"',
            "Cache-Control": "no-cache",
        }
    )


# ─────────────────────────────────────────────────────────────────────────────
# Resume Editor Endpoints (Phase 3)
# ─────────────────────────────────────────────────────────────────────────────

class BulletRewriteRequest(BaseModel):
    bullet_text: str
    role_context: str
    instruction: str = ""


class CreateResumeRequest(BaseModel):
    title: str = "John Doe - Resume"
    template_id: str = "classic"
    use_mock_data: bool = True


# ── Endpoint 0: POST create new resume (template / mock) ─────────────────────

@router.post("/create")
async def create_resume_from_scratch(
    user: CurrentUser,
    body: Optional[CreateResumeRequest] = None,
):
    """
    Create a new resume document with starter content (defaulting to the John Doe mock template).
    Immediately returns the new resume ID so the client can navigate to /resumes/{id}/editor.
    """
    req = body or CreateResumeRequest()
    supabase = await get_db()
    new_id = str(uuid.uuid4())

    valid_template = req.template_id if req.template_id in ("classic", "modern", "minimal", "technical") else "classic"
    if req.use_mock_data:
        mock_doc = StructuredResume.create_john_doe_mock(template_id=valid_template)
        structured = mock_doc.to_editor_dict()
        raw_text = (
            f"{mock_doc.basics.name}\n"
            f"{mock_doc.basics.title}\n"
            f"{mock_doc.basics.email} | {mock_doc.basics.phone} | {mock_doc.basics.location}\n\n"
            f"{mock_doc.basics.summary}"
        )
    else:
        empty_doc = StructuredResume.create_empty()
        empty_doc.meta.template_id = valid_template
        structured = empty_doc.to_editor_dict()
        raw_text = ""

    filename = (req.title or "John Doe - Resume").strip()
    if not filename.lower().endswith(".pdf"):
        filename = f"{filename}.pdf"

    payload = {
        "id": new_id,
        "user_id": user.id,
        "original_filename": filename,
        "file_url": "",
        "parsed_content": {
            "raw_text": raw_text,
            "sections": {},
        },
        "structured_content": structured,
    }

    try:
        await supabase.table("resumes").insert(payload).execute()
    except Exception as exc:
        logger.error("create_resume failed for user %s: %s", user.id, exc)
        raise HTTPException(status_code=500, detail="Failed to create new resume.")

    return {
        "id": new_id,
        "resume_id": new_id,
        "original_filename": filename,
        "message": "Resume created successfully.",
    }


# ── Endpoint 1: GET editor state ──────────────────────────────────────────────

@router.get("/{resume_id}/editor")
async def get_resume_editor(resume_id: str, user: CurrentUser):
    """
    Fetch the structured editor state for a resume.

    On first access (structured_content is NULL), parses raw_text into a
    StructuredResume via Groq and persists the result. Subsequent calls return
    the stored structured_content directly.

    Also returns any existing Deep Analysis issues (for the AI Fix sidebar),
    enriched with a best-effort bullet_id match.

    Ownership: resumes.user_id must match the authenticated user.
    Credits: FREE — no deduction.
    """
    supabase = await get_db()

    # 1. Fetch resume — ownership isolation enforced by eq("user_id")
    try:
        data = await supabase.table("resumes") \
            .select("id, file_url, parsed_content, structured_content, created_at") \
            .eq("id", resume_id) \
            .eq("user_id", user.id) \
            .execute()
    except Exception as exc:
        if "structured_content" in str(exc):
            logger.warning("editor: structured_content column missing in Supabase, falling back to lazy parse: %s", exc)
            data = await supabase.table("resumes") \
                .select("id, file_url, parsed_content, created_at") \
                .eq("id", resume_id) \
                .eq("user_id", user.id) \
                .execute()
        else:
            raise

    if not data.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    row = data.data[0]

    # 2. Lazy parse: if structured_content is NULL, parse now and persist
    structured_content = row.get("structured_content")
    if not structured_content:
        raw_text = ""
        try:
            raw_text = (row.get("parsed_content") or {}).get("raw_text") or ""
        except (TypeError, AttributeError):
            pass

        logger.info("editor: lazy-parsing resume %s for user %s", resume_id, user.id)
        structured_content = await parse_raw_text_to_structured(raw_text)

        # Persist so next open is instant (fire-and-forget; non-fatal on failure)
        try:
            await supabase.table("resumes") \
                .update({"structured_content": structured_content}) \
                .eq("id", resume_id) \
                .eq("user_id", user.id) \
                .execute()
        except Exception as exc:
            logger.warning(
                "editor: failed to persist structured_content for resume %s: %s",
                resume_id, exc
            )

    # 3. Fetch latest Deep Analysis issues (best-effort; no 404 if absent)
    analysis_issues: list[dict] = []
    try:
        analyses = await supabase.table("ai_analyses") \
            .select("output_data") \
            .eq("resume_id", resume_id) \
            .eq("user_id", str(user.id)) \
            .eq("analysis_type", "deep_analysis") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if analyses.data:
            output = analyses.data[0].get("output_data") or {}
            raw_issues = output.get("issues") or []

            # Build a flat text→id lookup for bullet matching
            bullet_text_to_id: dict[str, str] = {}
            experience = (structured_content or {}).get("experience") or []
            for exp in experience:
                for b in (exp.get("bullets") or []):
                    txt = (b.get("text") or "").strip().lower()
                    if txt:
                        bullet_text_to_id[txt] = b.get("id", "")

            import uuid as _uuid
            for issue in raw_issues:
                original_lower = (issue.get("original") or "").strip().lower()
                matched_bullet_id: str | None = bullet_text_to_id.get(original_lower)
                analysis_issues.append({
                    "id": str(_uuid.uuid4()),
                    "section": issue.get("section", ""),
                    "original": issue.get("original", ""),
                    "critique": issue.get("critique", ""),
                    "fix": issue.get("fix", ""),
                    "matched_bullet_id": matched_bullet_id,
                })
    except Exception as exc:
        logger.warning(
            "editor: failed to fetch analysis issues for resume %s: %s", resume_id, exc
        )

    # 4. Build signed URL for the original PDF
    file_path = row.get("file_url") or ""
    signed_url = ""
    if file_path:
        try:
            signed = await supabase.storage.from_("Resumes").create_signed_url(file_path, 3600)
            signed_url = (signed or {}).get("signedUrl") or (signed or {}).get("signedURL") or file_path
        except Exception as e:
            logger.warning("editor: failed to create signed URL for resume %s: %s", resume_id, e)
            signed_url = file_path

    return {
        "id": resume_id,
        "structured_content": structured_content,
        "analysis_issues": analysis_issues,
        "file_url": signed_url,
        "last_saved": row.get("created_at"),
    }


# ── Endpoint 2: PUT editor (autosave + explicit save) ─────────────────────────

@router.put("/{resume_id}/editor")
async def save_resume_editor(resume_id: str, user: CurrentUser, body: dict):
    """
    Persist the structured editor state for a resume.

    Called by both the debounced autosave (every 2 seconds of inactivity)
    and the explicit "Save Changes" button. The payload is the full
    StructuredResume JSON document.

    Validates the payload against the StructuredResume Pydantic model before
    writing, ensuring the database always holds a schema-valid document.

    Ownership: enforced by eq("user_id").
    Credits: FREE — no deduction.
    """
    supabase = await get_db()

    # 1. Verify ownership before writing
    exists = await supabase.table("resumes") \
        .select("id") \
        .eq("id", resume_id) \
        .eq("user_id", user.id) \
        .execute()

    if not exists.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    # 2. Validate payload against StructuredResume schema
    try:
        validated = StructuredResume.model_validate(body)
        structured_dict = validated.to_editor_dict()
    except Exception as exc:
        logger.warning(
            "editor save: payload validation failed for resume %s: %s", resume_id, exc
        )
        raise HTTPException(
            status_code=422,
            detail=f"Invalid resume structure: {exc}",
        )

    # 3. Persist
    try:
        await supabase.table("resumes") \
            .update({"structured_content": structured_dict}) \
            .eq("id", resume_id) \
            .eq("user_id", user.id) \
            .execute()
    except Exception as exc:
        logger.error(
            "editor save: DB update failed for resume %s: %s", resume_id, exc
        )
        if "structured_content" in str(exc):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Database migration pending: 'structured_content' column has not been added to Supabase yet. "
                    "Please run the migration in supabase/migrations/20260913000001_add_structured_content_to_resumes.sql in your Supabase SQL Editor."
                ),
            )
        raise HTTPException(status_code=500, detail="Failed to save resume changes.")

    return {"ok": True, "resume_id": resume_id}


# ── Endpoint 3: POST export_pdf ───────────────────────────────────────────────

@router.post("/{resume_id}/export_pdf")
async def export_structured_resume_pdf(resume_id: str, user: CurrentUser):
    """
    Render the stored StructuredResume to a clean, ATS-optimised PDF
    using the template and layout settings in structured_content.meta.

    Falls back gracefully if structured_content is NULL (returns 409 with a
    clear instruction to open the editor first).

    Ownership: enforced by eq("user_id").
    Credits: FREE — export is not an AI operation.
    """
    supabase = await get_db()

    try:
        data = await supabase.table("resumes") \
            .select("structured_content") \
            .eq("id", resume_id) \
            .eq("user_id", user.id) \
            .execute()
    except Exception as exc:
        if "structured_content" in str(exc):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Database migration pending: 'structured_content' column has not been added to Supabase yet. "
                    "Please run the migration in supabase/migrations/20260913000001_add_structured_content_to_resumes.sql in your Supabase SQL Editor."
                ),
            )
        raise

    if not data.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    structured_content = data.data[0].get("structured_content")
    if not structured_content:
        raise HTTPException(
            status_code=409,
            detail=(
                "This resume has not been opened in the editor yet. "
                "Open it in the Resume Editor to generate a structured PDF."
            ),
        )

    # Read template from the document's own meta (respects user's choice)
    template_id = (structured_content.get("meta") or {}).get("template_id") or "classic"

    try:
        pdf_bytes = render_structured_resume_pdf(structured_content, template_id=template_id)
    except Exception as exc:
        logger.error(
            "export_pdf: render failed for resume %s (template=%s): %s",
            resume_id, template_id, exc
        )
        raise HTTPException(status_code=500, detail="Failed to render resume PDF.")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="kareerist_resume.pdf"',
            "Cache-Control": "no-store",
        },
    )


# ── Endpoint 4: POST rewrite_bullet ──────────────────────────────────────────

_BULLET_REWRITE_SYSTEM = """\
You are an elite resume writing coach. Rewrite the provided resume bullet point to be \
highly impactful, quantified where possible, action-verb-led, and ATS-friendly.

Rules:
1. Start with a strong past-tense action verb (e.g. Architected, Reduced, Delivered).
2. Include a measurable outcome if any numbers can be inferred from context.
3. Keep to a single sentence under 25 words.
4. Do NOT invent metrics that aren't supported by the context.
5. Return ONLY the rewritten bullet text — no quotes, no explanation, no prefix.
"""

@router.post("/{resume_id}/rewrite_bullet")
@limiter.limit(settings.RATE_LIMIT_ANALYSIS, key_func=ats_rate_key)
async def rewrite_bullet(
    request: Request,
    resume_id: str,
    user: CurrentUser,
    body: BulletRewriteRequest,
):
    """
    AI-powered bullet rewrite — rewrites a single resume bullet for maximum impact.

    Validates resume ownership, deducts 3 credits, calls Groq, and returns the
    rewritten bullet. Credits are refunded if the Groq call fails.

    Credit cost: 3
    Rate limit: inherits RATE_LIMIT_ANALYSIS setting.
    """
    if not body.bullet_text.strip():
        raise HTTPException(status_code=400, detail="bullet_text must not be empty")

    supabase = await get_db()

    # 1. Verify ownership
    exists = await supabase.table("resumes") \
        .select("id") \
        .eq("id", resume_id) \
        .eq("user_id", user.id) \
        .execute()

    if not exists.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    # 2. Deduct 3 credits before AI call
    BULLET_COST = 3
    skip_credits = (
        settings.ENVIRONMENT == "development"
        and getattr(settings, "DEV_BYPASS_USER_ID", None)
        and request.headers.get("X-Dev-Bypass") == "1"
    )
    credits_deducted = False

    if not skip_credits:
        await deduct_feature_credits(
            supabase=supabase,
            user_id=str(user.id),
            feature="rewrite_bullet",
            cost=BULLET_COST,
        )
        credits_deducted = True

    # 3. Call Groq with retry
    user_content = (
        f"Role context: {body.role_context.strip()}\n\n"
        f"Bullet to rewrite: {body.bullet_text.strip()}"
    )
    if body.instruction.strip():
        user_content += f"\n\nAdditional instruction: {body.instruction.strip()}"

    try:
        rewritten = await with_ai_retry(
            lambda: chat_complete(
                messages=[
                    {"role": "system", "content": _BULLET_REWRITE_SYSTEM},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.5,
                max_tokens=80,
                timeout=30,
            ),
            label="rewrite_bullet",
            max_attempts=3,
        )
        rewritten = rewritten.strip().strip('"').strip("'")

        if not rewritten:
            raise ValueError("LLM returned an empty response")

    except Exception as exc:
        # Refund on failure
        if credits_deducted:
            try:
                await refund_feature_credits(
                    supabase,
                    str(user.id),
                    "rewrite_bullet",
                    BULLET_COST,
                    "ai_failure_refund",
                )
            except Exception as ref_err:
                logger.error(
                    "rewrite_bullet: refund failed for user %s: %s", user.id, ref_err
                )

        logger.error("rewrite_bullet failed for resume %s: %s", resume_id, exc)
        raise HTTPException(
            status_code=502,
            detail="AI bullet rewrite failed — your credits have been refunded. Please try again.",
        )

    # 4. Fetch remaining credits to return in the response (best-effort)
    credits_remaining = 0
    try:
        profile = await supabase.table("profiles") \
            .select("remaining_credits") \
            .eq("id", str(user.id)) \
            .limit(1) \
            .execute()
        if profile.data:
            credits_remaining = profile.data[0].get("remaining_credits", 0)
    except Exception:
        pass

    return {
        "rewritten_bullet": rewritten,
        "credits_remaining": credits_remaining,
    }
