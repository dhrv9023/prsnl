# app/api/v1/endpoints/ai_analysis.py
import logging

from fastapi import APIRouter, HTTPException, Request
from app.api.dependencies import CurrentUser
from app.core.config import settings
from app.core.rate_limit import ats_rate_key, limiter
from app.db.supabase import get_db
from app.services.math_engine import ats_score
from app.services.resume_analyzer import generate_resume_roast, generate_deep_roast
from app.schemas.models import MatchRequest, RoastRequest, DeepRoastRequest, TranslateRequest

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
    ai_result = await generate_resume_roast(resume_text, body.job_description, calculated_ats_score, body.language)
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
        logger.error("Database save failed for analysis on resume %s: %s", body.resume_id, e)
        raise HTTPException(status_code=500, detail="An internal error occurred while saving the analysis.")


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


@router.post("/translate")
@limiter.limit(settings.RATE_LIMIT_ANALYSIS, key_func=ats_rate_key)
async def translate_analysis(request: Request, body: TranslateRequest, user: CurrentUser):
    """
    Re-generates an existing analysis in a different language (e.g. Hinglish).
    Fetches the original analysis, extracts resume text + job description,
    then calls the LLM with the new language.
    """
    supabase = await get_db()

    # Fetch the existing analysis
    analysis_res = await supabase.table("ai_analyses").select("*") \
        .eq("id", body.analysis_id).execute()
    if not analysis_res.data:
        raise HTTPException(status_code=404, detail="Analysis not found")

    analysis = analysis_res.data[0]
    resume_id = analysis["resume_id"]

    # Verify the user owns the resume
    resume_res = await supabase.table("resumes").select("parsed_content") \
        .eq("id", resume_id).eq("user_id", user.id).execute()
    if not resume_res.data:
        raise HTTPException(status_code=403, detail="You don't have access to this analysis.")

    resume_text = resume_res.data[0]["parsed_content"]["raw_text"]

    # Extract the job description snippet from the original output_data
    output = analysis.get("output_data", {})
    job_desc_snippet = ""
    if isinstance(output, dict):
        job_desc_snippet = output.get("job_description_snippet", "")
        # For roast analyses, the output IS the roast details — use the existing score
        existing_score = output.get("details", {}).get("score", 50) if analysis["analysis_type"] == "job_match_score" else 50
    else:
        existing_score = 50

    # Re-generate in the target language
    try:
        translated = await generate_resume_roast(
            resume_text, job_desc_snippet, existing_score, body.target_language
        )
    except Exception as e:
        logger.error("Translation failed: %s", e)
        raise HTTPException(status_code=502, detail="Translation failed")

    if not translated:
        raise HTTPException(status_code=502, detail="AI returned empty translation")

    return translated


@router.post("/deep-roast")
@limiter.limit(settings.RATE_LIMIT_ANALYSIS, key_func=ats_rate_key)
async def deep_roast_resume(request: Request, body: DeepRoastRequest, user: CurrentUser):
    """
    SAVAGE Deep Roast mode — no filters, any language, brutal honesty.
    Calculates ATS score first, then feeds it to the savage roast LLM.
    Returns the same JSON shape as /roast so the frontend can reuse rendering.
    """
    supabase = await get_db()

    data = await supabase.table("resumes") \
        .select("parsed_content") \
        .eq("id", body.resume_id) \
        .eq("user_id", user.id).execute()

    if not data.data:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume_text = data.data[0]['parsed_content']['raw_text']

    # 1. Calculate base ATS score (same math engine)
    try:
        match_result = await ats_score(resume_text, body.job_description)
        calculated_ats_score = match_result.get("score", 0)
    except Exception as e:
        logger.error("Math engine failed during deep roast: %s", e)
        raise HTTPException(status_code=500, detail="Failed to calculate base ATS score")

    # 2. Pass score to SAVAGE roast LLM
    ai_result = await generate_deep_roast(
        resume_text, body.job_description, calculated_ats_score, body.language
    )
    if not ai_result:
        raise HTTPException(status_code=502, detail="Deep roast AI failed — try again")

    # 3. Save to DB (tagged as deep_roast for history differentiation)
    analysis_record = {
        "resume_id": body.resume_id,
        "analysis_type": "deep_roast",
        "output_data": ai_result
    }

    try:
        await supabase.table("ai_analyses").insert(analysis_record).execute()

        await supabase.table("resumes").update({
            "resume_quality_feedback": ai_result.get('overall_feedback', '')
        }).eq("id", body.resume_id) \
            .eq("user_id", user.id).execute()

        return {
            "ats_math_score": calculated_ats_score,
            "roast_details": ai_result
        }

    except Exception as e:
        logger.error("DB save failed for deep roast on resume %s: %s", body.resume_id, e)
        raise HTTPException(status_code=500, detail="Internal error saving deep roast.")
