# app/api/v1/endpoints/resumes.py
import io
import logging
import time
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from pypdf import PdfReader

from app.api.dependencies import CurrentUser
from app.core.config import settings
from app.core.rate_limit import ats_rate_key, limiter
from app.db.supabase import get_db

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload")
@limiter.limit(settings.RATE_LIMIT_UPLOAD, key_func=ats_rate_key)
async def upload_resume(request: Request, user: CurrentUser, file: UploadFile = File(...)):
    supabase = await get_db()

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

    # 3. Extract text using pypdf
    try:
        pdf_reader = PdfReader(io.BytesIO(file_content))
        extracted_text = ""
        for page in pdf_reader.pages:
            extracted_text += page.extract_text() + "\n"
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
        raise HTTPException(status_code=500, detail=f"Storage Error: {str(e)}")

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
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")


@router.get("/")
async def list_resumes(user: CurrentUser):
    supabase = await get_db()
    res = await supabase.table("resumes") \
        .select("id, file_url, resume_quality_feedback, created_at") \
        .eq("user_id", user.id).execute()
    return res.data


@router.get("/{resume_id}")
async def get_resume(resume_id: str, user: CurrentUser):
    supabase = await get_db()
    res = await supabase.table("resumes").select("*") \
        .eq("id", resume_id).eq("user_id", user.id).execute()
    if not res.data:
        raise HTTPException(404, "Not found")
    return res.data[0]


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
    try:
        await supabase.table("job_applications").delete() \
            .eq("resume_id", resume_id).eq("user_id", user.id).execute()
        await supabase.table("ai_analyses").delete() \
            .eq("resume_id", resume_id).execute()
        await supabase.table("resumes").delete() \
            .eq("id", resume_id).eq("user_id", user.id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Deletion Error: {str(e)}")

    return {"msg": "Resume and all associated data successfully deleted."}
