# app/api/v1/endpoints/analysis.py
from fastapi import APIRouter, HTTPException
from app.api.dependencies import CurrentUser
from app.db.supabase import supabase
from pydantic import BaseModel
from app.services.math_engine import ats_score
from app.services.resume_analyzer import generate_resume_roast
from app.schemas.models import MatchRequest, RoastRequest

router = APIRouter()

# class MatchRequest(BaseModel):
#     resume_id: str
#     job_description: str

# class RoastRequest(BaseModel):
#     resume_id: str
#     job_description: str

@router.post("/match")
async def ats_score_calculator(request: MatchRequest, user: CurrentUser):
    # 1. Fetch the Resume Text from DB
    # We ensure the resume belongs to the logged-in user!
    """
    Calculates specific fit.
    Action: INSERTS a new row into 'ai_analyses' (History).
    Does NOT touch 'Resumes' table. Copy paste the 'id' of the resume table in the 'resume_id' section with the JD to calculate the score.
    """
    data = supabase.table("resumes")\
        .select("parsed_content")\
        .eq("id", request.resume_id)\
        .eq("user_id", user.id)\
        .execute()
        
    if not data.data:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    try:
        resume_text = data.data[0]['parsed_content']['raw_text']
    except KeyError:
        raise HTTPException(status_code=500, detail="Resume has no parsed text")
    
    # 2. Run math engine
    try:
        match_result = ats_score(resume_text, request.job_description)
    except Exception as e:
        print(f"Error in ATS scoring: {str(e)}")
        raise HTTPException(status_code=500, detail="Error calculating ATS score")
    
    # 3. Save the Result to database
    analysis_record = {
        "resume_id": request.resume_id,
        "analysis_type": "job_match_score",
        "output_data":{
            "job_description_snippet": request.job_description[:100],  # store a snippet for reference
            "score": match_result["score"],
            "details": match_result
        }
    }

    try:
        supabase.table("ai_analyses").insert(analysis_record).execute()
        return match_result
    except Exception as e:
        print(f"DB Error: {e}")
        return match_result
        

# 2. THE GENERIC ID ENDPOINT (Dynamic route goes LAST)
# You can use this later for "General Resume Roast" without a JD


@router.post("/roast")
async def roast_resume(request: RoastRequest, user: CurrentUser):
    """
    Targeted Analysis (The Roast). 
    Calculates semantic math score first, then feeds it to the LLM.
    """

    # 1. Fetch Resume
    data = supabase.table("resumes")\
        .select("parsed_content")\
        .eq("id", request.resume_id)\
        .eq("user_id", user.id)\
        .execute()

    if not data.data:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume_text = data.data[0]['parsed_content']['raw_text']

    # 2. GUARANTEE an accurate ATS score for THIS Job Description
    try:
        # Run the math engine right here so we never pass a fake "0" to the AI
        match_result = ats_score(resume_text, request.job_description)
        calculated_ats_score = match_result.get("score", 0)
    except Exception as e:
        print(f"Math Engine Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate base ATS score")

    # 3. Pass the guaranteed score to Groq
    ai_result = generate_resume_roast(resume_text, request.job_description, calculated_ats_score)
    
    if not ai_result:
        raise HTTPException(status_code=502, detail="AI analysis failed")

    # 4. Save to DB
    analysis_record = {
        "resume_id": request.resume_id,
        "analysis_type": "general_roast", # Renamed to reflect it uses a JD
        "output_data": ai_result
    }
    
    try:
        supabase.table("ai_analyses").insert(analysis_record).execute()
        
        # 5. Update the Main Score Badge
        supabase.table("resumes").update({
            "resume_quality_feedback": ai_result['overall_feedback']
        }).eq("id", request.resume_id)\
        .eq("user_id", user.id)\
        .execute()
        
        # We return BOTH the math score and the AI roast so the frontend has everything
        return {
            "ats_math_score": calculated_ats_score,
            "roast_details": ai_result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Save Error: {str(e)}")