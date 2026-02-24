# app/api/v1/endpoints/resumes.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.api.dependencies import CurrentUser
from app.db.supabase import supabase
from supabase import create_client
from app.core.config import settings
from pypdf import PdfReader
import io
import time

router = APIRouter()

@router.post("/upload")
async def upload_resume(
    user: CurrentUser, 
    file: UploadFile = File(...)
):

    # 1. Validate File Type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # 2. Read file content into memory
    file_content = await file.read()
    
    # 3. Extract Text using pypdf
    try:
        pdf_reader = PdfReader(io.BytesIO(file_content))
        extracted_text = ""
        for page in pdf_reader.pages:
            extracted_text += page.extract_text() + "\n"
            
        # Basic Validation: detailed resume should have text
        if len(extracted_text.strip()) < 50:
            raise HTTPException(status_code=400, detail="PDF is empty or unreadable.")
            
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to parse PDF text.")

    # 4. Upload to Supabase Storage (THE FIX IS HERE)
    # We add a timestamp to make every filename unique. 
    # This forces Supabase to treat it as a NEW file (INSERT) instead of an UPDATE.
    timestamp = int(time.time())
    unique_filename = f"{timestamp}_{file.filename}"
    file_path = f"{user.id}/{unique_filename}"
    try:
        supabase.storage.from_("Resumes").upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": "application/pdf"}
        )
    except Exception as e:
        # If file exists, we can overwrite or just fail. 
        # For MVP, simple fail is safer.
        # print("Uploading as user:", user.id)
        # print("JWT present:", bool(user.access_token))
        raise HTTPException(status_code=500, detail=f"Storage Error: {str(e)}")

    # 5. Save Metadata & Text to Database
    try:
        data = {
            "user_id": user.id,
            "file_url": file_path,
            "parsed_content": {"raw_text": extracted_text}, 
            "resume_quality_feedback": 0
        }
        
        # Insert and return the new record
        result = supabase.table("resumes").insert(data).execute()
        return {
            "msg": "Resume uploaded successfully", 
            "id": result.data[0]['id'],
            "extracted_length": len(extracted_text)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")