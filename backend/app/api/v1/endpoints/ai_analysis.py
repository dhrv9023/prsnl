# app/api/v1/endpoints/ai_analysis.py
import logging

from fastapi import APIRouter, HTTPException, Request
from app.api.dependencies import CurrentUser
from app.core.config import settings
from app.core.rate_limit import ats_rate_key, limiter
from app.db.supabase import get_db
from app.services.math_engine import ats_score
from app.services.resume_analyzer import generate_resume_roast
from app.schemas.models import MatchRequest, RoastRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/match")
@limiter.limit(settings.RATE_LIMIT_ANALYSIS, key_func=ats_rate_key)
async def ats_score_calculator(request: Request, body: MatchRequest, user: CurrentUser):
    """
    Calculates ATS match score between a resume and job description.
    Saves the result to ai_analyses history.
    """
    supabase = await get_db()
    data = await supabase.table("resumes") \
        .select("parsed_content") \
        .eq("id", body.resume_id) \
        .eq("user_id", user.id).execute()

    if not data.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        resume_text = data.data[0]['parsed_content']['raw_text']
    except KeyError:
        raise HTTPException(status_code=500, detail="Resume has no parsed text")

    # Run math engine (cosine similarity via HuggingFace embeddings)
    try:
        match_result = await ats_score(resume_text, body.job_description)
    except Exception as e:
        logger.error("ATS scoring failed: %s", e)
        raise HTTPException(status_code=500, detail="Error calculating ATS score")

    # Save result to history
    analysis_record = {
        "resume_id": body.resume_id,
        "analysis_type": "job_match_score",
        "output_data": {
            "job_description_snippet": body.job_description[:100],
            "score": match_result["score"],
            "details": match_result
        }
    }

    try:
        await supabase.table("ai_analyses").insert(analysis_record).execute()
    except Exception as e:
        logger.warning("Failed to save ATS result to DB: %s", e)

    return match_result


@router.post("/roast")
@limiter.limit(settings.RATE_LIMIT_ANALYSIS, key_func=ats_rate_key)
async def roast_resume(request: Request, body: RoastRequest, user: CurrentUser):
    """
    Deep analysis (roast). Calculates ATS score first, then feeds it to the LLM
    for a comprehensive section-by-section breakdown.
    """
    supabase = await get_db()

    data = await supabase.table("resumes") \
        .select("parsed_content") \
        .eq("id", body.resume_id) \
        .eq("user_id", user.id).execute()

    if not data.data:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume_text = data.data[0]['parsed_content']['raw_text']

    # 1. Calculate base ATS score
    try:
        match_result = await ats_score(resume_text, body.job_description)
        calculated_ats_score = match_result.get("score", 0)
    except Exception as e:
        logger.error("Math engine failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to calculate base ATS score")

    # 2. Pass score to LLM for deep analysis
    ai_result = await generate_resume_roast(resume_text, body.job_description, calculated_ats_score)
    if not ai_result:
        raise HTTPException(status_code=502, detail="AI analysis failed")

    # 3. Save to DB
    analysis_record = {
        "resume_id": body.resume_id,
        "analysis_type": "general_roast",
        "output_data": ai_result
    }

    try:
        await supabase.table("ai_analyses").insert(analysis_record).execute()

        # Update the resume quality badge
        await supabase.table("resumes").update({
            "resume_quality_feedback": ai_result['overall_feedback']
        }).eq("id", body.resume_id) \
            .eq("user_id", user.id).execute()

        return {
            "ats_math_score": calculated_ats_score,
            "roast_details": ai_result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Save Error: {str(e)}")


@router.get("/history/{resume_id}")
async def get_analysis_history(resume_id: str, user: CurrentUser):
    """Returns all past analyses for a given resume, newest first."""
    supabase = await get_db()

    verify_res = await supabase.table("resumes").select("id") \
        .eq("id", resume_id).eq("user_id", user.id).execute()
    if not verify_res.data:
        raise HTTPException(404, "Resume not found")

    history_res = await supabase.table("ai_analyses").select("*") \
        .eq("resume_id", resume_id).order("created_at", desc=True).execute()
    return history_res.data
