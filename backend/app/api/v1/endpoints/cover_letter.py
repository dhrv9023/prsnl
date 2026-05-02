# app/api/v1/endpoints/cover_letter.py
import io
import logging
import time

from fastapi import HTTPException, APIRouter
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch

from app.api.dependencies import CurrentUser
from app.db.supabase import get_db
from app.services.cover_letter_gen import cover_letter_generator
from app.schemas.models import CoverLetterRequest, SavePDFRequest

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
async def create_cover_letter(request: CoverLetterRequest, user: CurrentUser):
    """Step 1: AI generates a cover letter text draft."""
    supabase = await get_db()

    res_data = await supabase.table("resumes") \
        .select("parsed_content") \
        .eq("id", request.resume_id) \
        .eq("user_id", user.id).execute()

    if not res_data.data:
        raise HTTPException(404, "Resume not found")

    resume_text = res_data.data[0]['parsed_content']['raw_text']

    cover_letter_content = await cover_letter_generator(resume_text, request.job_description)
    if not cover_letter_content:
        raise HTTPException(502, "AI failed to generate text")

    app_data = {
        "user_id": user.id,
        "resume_id": request.resume_id,
        "company_name": request.company_name,
        "job_title": request.job_title,
        "job_description": request.job_description,
        "status": "draft",
        "cover_letter_content": cover_letter_content
    }

    try:
        result = await supabase.table("job_applications").insert(app_data).execute()
    except Exception as e:
        raise HTTPException(400, detail=f"Database Insert Error: {str(e)}")

    return {
        "msg": "Cover Letter Generated",
        "application_id": result.data[0]['id'],
        "content": cover_letter_content
    }


@router.post("/save_pdf")
async def save_cover_letter_pdf(request: SavePDFRequest, user: CurrentUser):
    """Step 2: Convert final text to PDF → Upload to Storage → Link in DB."""
    supabase = await get_db()

    # Verify ownership before allowing the update
    verify = await supabase.table("job_applications").select("id") \
        .eq("id", request.application_id) \
        .eq("user_id", user.id).execute()
    if not verify.data:
        raise HTTPException(403, "You don't have permission to update this application.")

    # Generate PDF
    try:
        pdf_bytes = create_pdf(request.final_text)
    except Exception as e:
        raise HTTPException(500, detail=f"PDF Generation failed: {e}")

    # Upload to Supabase Storage
    filename = f"{user.id}/cover_letters/{int(time.time())}_cl.pdf"
    try:
        await supabase.storage.from_("Resumes").upload(
            path=filename,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf"}
        )
    except Exception as e:
        raise HTTPException(500, detail=f"Storage Upload failed: {e}")

    # Update database record
    await supabase.table("job_applications").update({
        "cover_letter_file_url": filename
    }).eq("id", request.application_id) \
        .eq("user_id", user.id).execute()

    return {"msg": "PDF Saved successfully", "pdf_url": filename}


@router.get("/")
async def list_applications(user: CurrentUser):
    supabase = await get_db()
    res = await supabase.table("job_applications") \
        .select("id, company_name, job_title, status, created_at") \
        .eq("user_id", user.id).execute()
    return res.data


@router.get("/{app_id}")
async def get_application(app_id: str, user: CurrentUser):
    supabase = await get_db()
    res = await supabase.table("job_applications").select("*") \
        .eq("id", app_id).eq("user_id", user.id).execute()
    if not res.data:
        raise HTTPException(404, "Not found")
    return res.data[0]
