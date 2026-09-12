# app/api/v1/endpoints/ai_analysis.py
import logging

from fastapi import APIRouter, HTTPException, Request
from app.api.dependencies import CurrentUser, require_credits
from app.core.config import settings
from app.core.rate_limit import ats_rate_key, limiter
from app.db.supabase import get_db
from app.services.math_engine import ats_score
from app.services.deep_analysis import generate_deep_analysis, DeepAnalysisError
from app.services.hiring_intel import generate_hiring_intel
from app.services.credits import refund_feature_credits, deduct_feature_credits
from app.schemas.models import MatchRequest, HiringIntelRequest, DeepAnalysisRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/match")
@limiter.limit(settings.RATE_LIMIT_ANALYSIS, key_func=ats_rate_key)
async def ats_score_calculator(
    request: Request,
    body: MatchRequest,
    user: CurrentUser,
    _credits=require_credits("ats_score", 5),
):
    """
    Calculates ATS score for a resume.
    - With job_description: semantic cosine similarity (targeted match).
    - Without job_description: rule-based general resume quality score.
    Costs 5 credits. Saves the result to ai_analyses history.
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

    try:
        match_result = await ats_score(resume_text, body.job_description or None)
    except Exception as e:
        logger.error("ATS scoring failed: %s", e)
        raise HTTPException(status_code=500, detail="Error calculating ATS score")

    analysis_record = {
        "resume_id": body.resume_id,
        "user_id": str(user.id),
        "analysis_type": "job_match_score",
        "output_data": {
            "job_description_snippet": (body.job_description or "")[:100],
            "score": match_result["score"],
            "mode": match_result.get("mode", "general"),
            "details": match_result,
        }
    }

    try:
        await supabase.table("ai_analyses").insert(analysis_record).execute()
    except Exception as e:
        logger.warning("Failed to save ATS result to DB: %s", e)

    return match_result


@router.post("/deep")
@limiter.limit(settings.RATE_LIMIT_ANALYSIS, key_func=ats_rate_key)
async def deep_analysis(
    request: Request,
    body: DeepAnalysisRequest,
    user: CurrentUser,
):
    """
    Section-by-section LLM resume critique.
    Job description is optional — if provided, analysis is JD-aware.
    Costs 15 credits.
    """
    supabase = await get_db()

    # 1. Verify resume existence and user ownership BEFORE credit deduction
    data = await supabase.table("resumes") \
        .select("parsed_content") \
        .eq("id", body.resume_id) \
        .eq("user_id", user.id).execute()

    if not data.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        resume_text = data.data[0]['parsed_content']['raw_text']
    except (KeyError, TypeError):
        raise HTTPException(status_code=400, detail="Resume has no parsed text")

    if not resume_text or not str(resume_text).strip():
        raise HTTPException(status_code=400, detail="Extracted resume text is too short or empty")

    # 2. Check dev bypass or atomically deduct credits
    skip_credits = (
        settings.ENVIRONMENT == "development"
        and getattr(settings, "DEV_BYPASS_USER_ID", None)
        and request.headers.get("X-Dev-Bypass") == "1"
    )

    credits_deducted = False
    credits_refunded = False

    if not skip_credits:
        await deduct_feature_credits(
            supabase=supabase,
            user_id=str(user.id),
            feature="deep_analysis",
            cost=15,
        )
        credits_deducted = True

    # 3. Execute AI generation and DB persistence with idempotent failure handling
    try:
        result = await generate_deep_analysis(
            resume_text=str(resume_text),
            job_description=body.job_description or None,
        )

        analysis_record = {
            "resume_id": body.resume_id,
            "user_id": str(user.id),
            "analysis_type": "deep_analysis",
            "output_data": {
                "jd_provided": bool(body.job_description),
                **result,
            }
        }

        try:
            await supabase.table("ai_analyses").insert(analysis_record).execute()
        except Exception as e:
            logger.warning("Failed to save deep analysis to DB: %s", e)

        return result

    except HTTPException:
        # Re-raise explicit HTTP exceptions (e.g. from rate limiting or validation)
        raise
    except Exception as exc:
        if credits_deducted and not credits_refunded:
            try:
                await refund_feature_credits(
                    supabase,
                    str(user.id),
                    "deep_analysis",
                    15,
                    "ai_failure_refund",
                )
            except Exception as ref_err:
                logger.error("Failed to refund credits for user %s: %s", user.id, ref_err)
            finally:
                credits_refunded = True

        logger.error("Deep analysis failed for user %s: %s", user.id, exc)
        raise HTTPException(
            status_code=502,
            detail="Deep analysis failed — your credits have been refunded. Please try again.",
        )


@router.post("/hiring-intel")
@limiter.limit(settings.RATE_LIMIT_ANALYSIS, key_func=ats_rate_key)
async def hiring_intelligence(
    request: Request,
    body: HiringIntelRequest,
    user: CurrentUser,
    _credits=require_credits("hiring_intel", 25),
):
    """
    AI Career Intelligence Engine.
    Generates a deep, JD-aware, recruiter-realistic 9-section hiring report.
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

    # 1. Calculate ATS score to anchor the report
    try:
        match_result = await ats_score(resume_text, body.job_description)
        calculated_ats_score = match_result.get("score", 0)
    except Exception as e:
        logger.error("ATS math engine failed during hiring intel: %s", e)
        calculated_ats_score = 0

    # 2. Generate the full hiring intelligence report
    intel_report = await generate_hiring_intel(
        resume_text=resume_text,
        job_description=body.job_description,
        target_role=body.target_role,
        experience_level=body.experience_level,
    )

    if not intel_report:
        # AI call failed after credits were already deducted — refund the user
        await refund_feature_credits(supabase, str(user.id), "hiring_intel", 25, "ai_failure_refund")
        raise HTTPException(status_code=502, detail="Hiring intelligence analysis failed — your credits have been refunded. Please try again.")

    # 3. Save to DB
    analysis_record = {
        "resume_id": body.resume_id,
        "user_id": str(user.id),
        "analysis_type": "hiring_intel",
        "output_data": {
            "target_role": body.target_role,
            "experience_level": body.experience_level,
            "ats_score": calculated_ats_score,
            "report": intel_report,
        }
    }

    try:
        await supabase.table("ai_analyses").insert(analysis_record).execute()
    except Exception as e:
        logger.warning("Failed to save hiring intel to DB: %s", e)

    return {
        "ats_score": calculated_ats_score,
        "target_role": body.target_role,
        "experience_level": body.experience_level,
        "report": intel_report,
    }


@router.get("/history/{resume_id}")
async def get_analysis_history(resume_id: str, user: CurrentUser):
    """Returns all past analyses for a given resume, newest first."""
    supabase = await get_db()

    verify_res = await supabase.table("resumes").select("id") \
        .eq("id", resume_id).eq("user_id", user.id).execute()
    if not verify_res.data:
        raise HTTPException(404, "Resume not found")

    history_res = await supabase.table("ai_analyses").select("*") \
        .eq("resume_id", resume_id).eq("user_id", str(user.id)).order("created_at", desc=True).execute()
    return history_res.data

