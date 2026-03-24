# app/api/v1/endpoints/resumes.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.api.dependencies import CurrentUser
from app.db.supabase import get_db
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

    supabase = await get_db()    
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
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to parse PDF text.")
        
    # Basic Validation: Detailed resume should have text (Moved OUTSIDE the try/except block)
    if len(extracted_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="PDF is empty or unreadable.")

    # 4. Upload to Supabase Storage (THE FIX IS HERE)
    # We add a timestamp to make every filename unique. 
    # This forces Supabase to treat it as a NEW file (INSERT) instead of an UPDATE.
    timestamp = int(time.time())
    unique_filename = f"{timestamp}_{file.filename}"
    file_path = f"{user.id}/{unique_filename}"
    try:
        await supabase.storage.from_("Resumes").upload(
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
        result = await supabase.table("resumes").insert(data).execute()
        return {
            "msg": "Resume uploaded successfully", 
            "id": result.data[0]['id'],
            "extracted_length": len(extracted_text)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")


# endpoint to get all resumes
@router.get("/")
async def list_resumes(user: CurrentUser):
    supabase = await get_db()
    res = await supabase.table("resumes").select("id, file_url, resume_quality_feedback, created_at").eq("user_id", user.id).execute()
    return res.data

# endpoint to get resume acc to id.
@router.get("/{resume_id}")
async def get_resume(resume_id: str, user: CurrentUser):
    supabase = await get_db()
    res = await supabase.table("resumes").select("*").eq("id", resume_id).eq("user_id", user.id).execute()
    if not res.data:
        raise HTTPException(404, "Not found")
    return res.data[0]

@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, user: CurrentUser):
    files_to_delete = []

    supabase = await get_db()
    # 1. Get the main Resume PDF URL
    res_data = await supabase.table("resumes")\
        .select("file_url")\
        .eq("id", resume_id)\
        .eq("user_id", user.id)\
        .execute()
        
    if not res_data.data:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    if res_data.data[0].get("file_url"):
        files_to_delete.append(res_data.data[0]["file_url"])

    # 2. Get all associated Cover Letter PDF URLs
    # (Even if you rename this table later, this fetches the generated files)
    cl_data = await supabase.table("job_applications")\
        .select("cover_letter_file_url")\
        .eq("resume_id", resume_id)\
        .eq("user_id", user.id)\
        .execute()
        
    for record in cl_data.data:
        if record.get("cover_letter_file_url"):
            files_to_delete.append(record["cover_letter_file_url"])

    # 3. Nuke all files from the Storage Bucket
    if files_to_delete:
        try:
            # Pass the entire list of URLs to delete them all at once
            await supabase.storage.from_("Resumes").remove(files_to_delete)
        except Exception as e:
            print(f"Storage Cleanup Warning: {e}")

    # 4. Nuke the Database Records
    try:
        # Manually delete the cover letters/features first to be safe
        await supabase.table("job_applications").delete().eq("resume_id", resume_id).eq("user_id", user.id).execute()
        await supabase.table("ai_analyses").delete().eq("resume_id", resume_id).execute()
        
        # Finally, delete the Resume itself
        await supabase.table("resumes").delete().eq("id", resume_id).eq("user_id", user.id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Deletion Error: {str(e)}")
        
    return {"msg": "Resume and all associated features successfully deleted."}