# app/api/v1/endpoints/cover_letter.py
import io
import logging
import time

from fastapi import HTTPException, APIRouter, Request
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch

from app.api.dependencies import CurrentUser, require_credits
from app.core.config import settings
from app.core.rate_limit import ats_rate_key, limiter
from app.db.supabase import get_db
from app.services.cover_letter_gen import cover_letter_generator, roast_cover_letter_generator
from app.services.humanizer import humanize_text
from app.services.credits import refund_feature_credits
from app.schemas.models import CoverLetterRequest, CoverLetterRoastRequest, HumanizeRequest, SavePDFRequest

logger = logging.getLogger(__name__)
router = APIRouter()


def create_pdf(text: str) -> bytes:
    """Converts plain text into a formatted PDF using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50
    )

    styles = getSampleStyleSheet()
    style = styles["Normal"]
    story = []

    for line in text.split("\n"):
        safe_line = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        story.append(Paragraph(safe_line, style))
        story.append(Spacer(1, 0.2 * inch))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/generate")
@limiter.limit(settings.RATE_LIMIT_COVER_LETTER, key_func=ats_rate_key)
async def create_cover_letter(
    request: Request,
    body: CoverLetterRequest,
    user: CurrentUser,
    _credits=require_credits("cover_letter", 10),
):
    """Step 1: AI generates a cover letter text draft."""
    supabase = await get_db()

    res_data = await supabase.table("resumes") \
        .select("parsed_content") \
        .eq("id", body.resume_id) \
        .eq("user_id", user.id).execute()

    if not res_data.data:
        raise HTTPException(404, "Resume not found")

    resume_text = res_data.data[0]['parsed_content']['raw_text']

    cover_letter_content = await cover_letter_generator(
        resume_text, 
        body.job_description,
        body.company_name,
        body.job_title
    )
    if not cover_letter_content:
        await refund_feature_credits(supabase, str(user.id), "cover_letter", 10)
        raise HTTPException(502, "AI failed to generate text")

    app_data = {
        "user_id": user.id,
        "resume_id": body.resume_id,
        "company_name": body.company_name,
        "job_title": body.job_title,
        "job_description": body.job_description,
        "status": "draft",
        "cover_letter_content": cover_letter_content
    }

    try:
        result = await supabase.table("job_applications").insert(app_data).execute()
    except Exception as e:
        logger.error("Cover letter DB insert failed for user %s: %s", user.id, e)
        raise HTTPException(400, detail="An internal error occurred while saving the record.")

    return {
        "msg": "Cover Letter Generated",
        "application_id": result.data[0]['id'],
        "content": cover_letter_content
    }


@router.post("/generate-roast")
@limiter.limit(settings.RATE_LIMIT_COVER_LETTER, key_func=ats_rate_key)
async def create_roast_cover_letter(
    request: Request,
    body: CoverLetterRoastRequest,
    user: CurrentUser,
    _credits=require_credits("cover_letter", 10),
):
    """Step 1 (Roast Mode): AI generates a savage, self-aware cover letter draft."""
    supabase = await get_db()

    res_data = await supabase.table("resumes") \
        .select("parsed_content") \
        .eq("id", body.resume_id) \
        .eq("user_id", user.id).execute()

    if not res_data.data:
        raise HTTPException(404, "Resume not found")

    resume_text = res_data.data[0]['parsed_content']['raw_text']

    cover_letter_content = await roast_cover_letter_generator(
        resume_text, 
        body.job_description, 
        body.language,
        body.company_name,
        body.job_title
    )
    if not cover_letter_content:
        await refund_feature_credits(supabase, str(user.id), "cover_letter", 10)
        raise HTTPException(502, "AI failed to generate roast cover letter")

    app_data = {
        "user_id": user.id,
        "resume_id": body.resume_id,
        "company_name": body.company_name,
        "job_title": body.job_title,
        "job_description": body.job_description,
        "status": "draft",
        "cover_letter_content": cover_letter_content
    }

    try:
        result = await supabase.table("job_applications").insert(app_data).execute()
    except Exception as e:
        logger.error("Roast cover letter DB insert failed for user %s: %s", user.id, e)
        raise HTTPException(400, detail="An internal error occurred while saving the record.")

    return {
        "msg": "Roast Cover Letter Generated 🔥",
        "application_id": result.data[0]['id'],
        "content": cover_letter_content
    }


@router.post("/save_pdf")
@limiter.limit(settings.RATE_LIMIT_COVER_LETTER, key_func=ats_rate_key)
async def save_cover_letter_pdf(request: Request, body: SavePDFRequest, user: CurrentUser):
    """Step 2: Convert final text to PDF → Upload to Storage → Link in DB."""
    supabase = await get_db()

    # Verify ownership before allowing the update
    verify = await supabase.table("job_applications").select("id") \
        .eq("id", body.application_id) \
        .eq("user_id", user.id).execute()
    if not verify.data:
        raise HTTPException(403, "You don't have permission to update this application.")

    # Generate PDF
    try:
        pdf_bytes = create_pdf(body.final_text)
    except Exception as e:
        logger.error("PDF generation failed for user %s: %s", user.id, e)
        raise HTTPException(500, detail="An internal error occurred during PDF generation.")

    # Upload to Supabase Storage
    filename = f"{user.id}/cover_letters/{int(time.time())}_cl.pdf"
    try:
        await supabase.storage.from_("Resumes").upload(
            path=filename,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf"}
        )
    except Exception as e:
        logger.error("Cover letter storage upload failed for user %s: %s", user.id, e)
        raise HTTPException(500, detail="An internal error occurred while storing the file.")

    # Update database record
    await supabase.table("job_applications").update({
        "cover_letter_file_url": filename
    }).eq("id", body.application_id) \
        .eq("user_id", user.id).execute()

    return {"msg": "PDF Saved successfully", "pdf_url": filename}


@router.get("/")
async def list_applications(user: CurrentUser):
    supabase = await get_db()
    res = await supabase.table("job_applications") \
        .select("id, company_name, job_title, status, created_at") \
        .eq("user_id", user.id) \
        .order("created_at", desc=True) \
        .limit(50) \
        .execute()
    return res.data


@router.get("/{app_id}")
async def get_application(app_id: str, user: CurrentUser):
    supabase = await get_db()
    res = await supabase.table("job_applications").select("*") \
        .eq("id", app_id).eq("user_id", user.id).execute()
    if not res.data:
        raise HTTPException(404, "Not found")
    return res.data[0]


@router.post("/humanize")
@limiter.limit("5/hour", key_func=ats_rate_key)
async def humanize_cover_letter(
    request: Request,
    body: HumanizeRequest,
    user: CurrentUser,
    _credits=require_credits("humanize", 15),
):
    """Rewrites an AI-generated cover letter to sound more natural and human. Costs 15 credits."""
    if not body.text or len(body.text.strip()) < 50:
        raise HTTPException(400, "Cover letter text is too short to humanize.")
    if len(body.text) > 5000:
        raise HTTPException(400, "Cover letter text exceeds maximum length.")

    result = await humanize_text(body.text)
    if not result:
        supabase = await get_db()
        await refund_feature_credits(supabase, str(user.id), "humanize", 15)
        raise HTTPException(502, "AI failed to humanize the text. Please try again.")

    return {"humanized_text": result}
