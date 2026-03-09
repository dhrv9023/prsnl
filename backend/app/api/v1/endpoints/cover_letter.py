from fastapi import HTTPException, APIRouter
from app.api.dependencies import CurrentUser
from app.db.supabase import supabase
from pydantic import BaseModel
from app.services.cover_letter_gen import cover_letter_generator
from fpdf import FPDF
import io
import time
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from app.schemas.models import CoverLetterRequest, SavePDFRequest

router = APIRouter()

def create_pdf(text: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=50,
        leftMargin=50,
        topMargin=50,
        bottomMargin=50
    )

    styles = getSampleStyleSheet()
    style = styles["Normal"]

    story = []

    for line in text.split("\n"):
        story.append(Paragraph(line.replace("&", "&amp;")
                                     .replace("<", "&lt;")
                                     .replace(">", "&gt;"), style))
        story.append(Spacer(1, 0.2 * inch))

    doc.build(story)

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

# class CoverLetterRequest(BaseModel):
#     resume_id: str
#     job_description: str
#     company_name: str  # <--- Added: Required by DB
#     job_title: str     # <--- Added: Likely required by DB too

# class SavePDFRequest(BaseModel):
#     application_id: str
#     final_text: str

# --- ENDPOINTS ---

@router.post("/generate")
async def create_cover_letter(request: CoverLetterRequest, user: CurrentUser):
    """
    Step 1: AI generates the text draft.
    """
    # 1. Fetch Resume Text
    res_data = supabase.table("resumes")\
        .select("parsed_content")\
        .eq("id", request.resume_id)\
        .eq("user_id", user.id)\
        .execute()
    
    if not res_data.data:
        raise HTTPException(404, "Resume not found")
        
    resume_text = res_data.data[0]['parsed_content']['raw_text']
    
    # 2. Generate Text via Groq
    cover_letter_content = cover_letter_generator(resume_text, request.job_description)
    if not cover_letter_content:
        raise HTTPException(502, "AI failed to generate text")
        
    # 3. Create Draft in DB
   # Inside app/api/v1/endpoints/cover_letter.py

    app_data = {
        "user_id": user.id,            # The "Who"
        "resume_id": request.resume_id, # The "What"
        "company_name": request.company_name,
        "job_title": request.job_title,
        "job_description": request.job_description,
        "status": "draft",
        "cover_letter_content": cover_letter_content
    }
    
    try:
        result = supabase.table("job_applications").insert(app_data).execute()
    except Exception as e:
        # This will help you see the exact error if something else is wrong
        raise HTTPException(400, detail=f"Database Insert Error: {str(e)}")
    
    return {
        "msg": "Cover Letter Generated", 
        "application_id": result.data[0]['id'],
        "content": cover_letter_content
    }

@router.post("/save_pdf")
async def save_cover_letter_pdf(request: SavePDFRequest, user: CurrentUser):
    """
    Step 2: Convert final text to PDF -> Upload to Bucket -> Link in DB.
    """
    # 1. Generate PDF Bytes (Using the helper above)
    try:
        pdf_bytes = create_pdf(request.final_text)
    except Exception as e:
        raise HTTPException(500, detail=f"PDF Generation failed: {e}")

    # 2. Upload to Supabase Storage
    # Naming: user_id/cover_letters/timestamp_cl.pdf
    filename = f"{user.id}/cover_letters/{int(time.time())}_cl.pdf"
    
    try:
        supabase.storage.from_("Resumes").upload(
            path=filename,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf"}
        )
    except Exception as e:
        raise HTTPException(500, detail=f"Storage Upload failed: {e}")

    # 3. Update Database with the File Path
    supabase.table("job_applications").update({
        # "cover_letter_content": request.final_text, 
        "cover_letter_file_url": filename
    }).eq("id", request.application_id).execute()

    return {
        "msg": "PDF Saved successfully",
        "pdf_url": filename
    }


# endpoint to get all cover letters 
@router.get("/")
async def list_applications(user: CurrentUser):
    res = supabase.table("job_applications").select("id, company_name, job_title, status, created_at").eq("user_id", user.id).execute()
    return res.data

# endpoint to get a specific cover letter 
@router.get("/{app_id}")
async def get_application(app_id: str, user: CurrentUser):
    res = supabase.table("job_applications").select("*").eq("id", app_id).eq("user_id", user.id).execute()
    if not res.data:
        raise HTTPException(404, "Not found")
    return res.data[0]