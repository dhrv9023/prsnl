import logging

from fastapi import APIRouter, HTTPException, Request
from typing import List, Dict, Any

from app.api.dependencies import CurrentUser, require_credits
from app.core.config import settings
from app.core.rate_limit import ats_rate_key, limiter
from app.db.supabase import get_db
from app.db.redis_client import save_session, load_session, delete_session
from app.schemas.models import (
    StartInterviewRequest,
    InterviewQuestion,
    AnswerSubmission,
    AnswerEvaluation,
    InterviewReport,
    InterviewSession
)
from app.services.ai_interview import (
    generate_questions,
    evaluate_single_answer,
    generate_roast_questions,
    evaluate_roast_answer,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Session state is now persisted in Redis (not in-memory) ──────────────────
# Benefits:
#   • Survives server restarts / hot-reloads
#   • Shared across all Uvicorn workers (no more "session not found" on reload)
#   • Auto-expires after 45 min TTL — no RAM leak on abandoned sessions
#   • Explicit delete on /end — no orphaned keys


@router.post("/start")
@limiter.limit(settings.RATE_LIMIT_INTERVIEW, key_func=ats_rate_key)
async def start_interview_route(
    request: Request,
    body: StartInterviewRequest,
    user: CurrentUser,
    _credits=require_credits("interview", 25),
) -> List[InterviewQuestion]:
    user_id_str = str(user.id)

    # 1. Fetch Resume Data
    supabase = await get_db()
    res_data = await supabase.table("resumes")\
        .select("parsed_content")\
        .eq("id", body.resume_id)\
        .eq("user_id", user_id_str)\
        .execute()

    if not res_data.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_text = res_data.data[0]['parsed_content']['raw_text']

    if len(resume_text) < 50:
        raise HTTPException(
            status_code=400, detail="Extracted resume text is too short or invalid.")

    # 2. Fetch latest deep analysis data for this resume (action items, weak sections)
    #    so questions can be targeted at the candidate's known weak spots.
    #    Only uses general_roast (deep analysis), not roast mode or ATS score.
    analysis_context: str | None = None
    try:
        analysis_resp = await supabase.table("ai_analyses") \
            .select("output_data, analysis_type") \
            .eq("resume_id", body.resume_id) \
            .eq("analysis_type", "general_roast") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if analysis_resp.data:
            analysis_type = analysis_resp.data[0].get("analysis_type", "")
            output_data = analysis_resp.data[0].get("output_data") or {}

            parts = []
            # Pull the overall feedback, summary, and action items for context
            if isinstance(output_data, dict):
                if output_data.get("overall_feedback"):
                    parts.append(f"Overall Feedback: {output_data['overall_feedback']}")
                if output_data.get("summary"):
                    parts.append(f"Summary: {output_data['summary']}")
                if output_data.get("action_items"):
                    items = output_data["action_items"]
                    if isinstance(items, list):
                        parts.append("Action Items: " + "; ".join(items))
                    else:
                        parts.append(f"Action Items: {items}")
                # Pull section-level weak spots
                if output_data.get("sections") and isinstance(output_data["sections"], dict):
                    weak = []
                    for section, details in output_data["sections"].items():
                        if isinstance(details, dict):
                            score = details.get("score", "")
                            issues = details.get("issues", "")
                            missing = details.get("missing_keywords", "")
                            if issues or missing:
                                weak.append(
                                    f"{section} (score: {score}): "
                                    f"Issues={issues}; Missing={missing}"
                                )
                    if weak:
                        parts.append("Weak Sections:\n" + "\n".join(weak))

            if parts:
                analysis_context = "\n".join(parts)
                logger.info(
                    "Enriched interview with analysis context (%s chars) for resume %s",
                    len(analysis_context), body.resume_id
                )
    except Exception as e:
        logger.warning("Could not fetch analysis context for interview: %s", e)
        # Non-fatal — fall back to resume text only
    session = InterviewSession(
        resume_text=resume_text,
        role=body.role,
        experience_level=body.experience_level,
    )

    # 3. Request AI Generation (normal or roast mode)
    try:
        if body.roast_mode:
            questions = await generate_roast_questions(
                role=body.role,
                experience_level=body.experience_level,
                resume_text=resume_text,
                language=body.language,
            )
        else:
            questions = await generate_questions(
                role=body.role,
                experience_level=body.experience_level,
                resume_text=resume_text,
                analysis_context=analysis_context,
            )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    session.questions = questions
    # Store roast_mode + language on the session so submit can use it
    session.role = f"{'[ROAST]' if body.roast_mode else ''}[LANG:{body.language}]{body.role}"

    # 4. Persist to Redis (replaces: active_sessions[user_id_str] = session)
    try:
        await save_session(user_id_str, session)
    except Exception as e:
        logger.error("Redis save_session failed for user %s: %s", user_id_str, e)
        raise HTTPException(status_code=503, detail="Session service is temporarily unavailable. Please try again.")

    return session.questions


@router.post("/submit")
async def submit_answer_route(
    request: Request,
    data: AnswerSubmission,
    user: CurrentUser,
) -> AnswerEvaluation:
    user_id_str = str(user.id)

    # Load from Redis (replaces: active_sessions.get(user_id_str))
    try:
        session = await load_session(user_id_str)
    except Exception as e:
        logger.error("Redis load_session failed for user %s: %s", user_id_str, e)
        raise HTTPException(status_code=503, detail="Session service is temporarily unavailable. Please try again.")

    if not session:
        raise HTTPException(
            status_code=400,
            detail="No active interview session found. Please start a new interview."
        )

    question = next(
        (q for q in session.questions if q.id == data.question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Evaluate answer via AI (detect roast mode from session.role prefix)
    roast_mode = session.role.startswith("[ROAST]")
    lang_tag = session.role.split("][LANG:")[-1].split("]")[0] if "[LANG:" in session.role else "english"
    try:
        if roast_mode:
            evaluation = await evaluate_roast_answer(
                role=session.role.split("]" )[-1],
                question=question,
                user_answer=data.user_answer,
                language=lang_tag,
            )
        else:
            evaluation = await evaluate_single_answer(
                role=session.role,
                question=question,
                user_answer=data.user_answer
            )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Update in-memory session object
    session.answers[data.question_id] = data.user_answer or "No answer provided."
    session.evaluations[data.question_id] = evaluation

    # Write updated state back to Redis + refresh TTL so active sessions don't expire
    try:
        await save_session(user_id_str, session)
    except Exception as e:
        logger.error("Redis save_session (submit) failed for user %s: %s", user_id_str, e)
        raise HTTPException(status_code=503, detail="Session service is temporarily unavailable. Please try again.")

    return evaluation


@router.post("/end")
async def end_interview_route(request: Request, user: CurrentUser) -> InterviewReport:
    user_id_str = str(user.id)

    # Load from Redis
    try:
        session = await load_session(user_id_str)
    except Exception as e:
        logger.error("Redis load_session (end) failed for user %s: %s", user_id_str, e)
        raise HTTPException(status_code=503, detail="Session service is temporarily unavailable. Please try again.")

    if not session:
        raise HTTPException(
            status_code=400, detail="No active interview session found.")

    breakdown = []
    total_score = 0
    count = 0

    # Compile report from session data
    for q in session.questions:
        if q.id in session.evaluations:
            eval_data = session.evaluations[q.id]
            user_ans = session.answers.get(q.id, "")
            total_score += eval_data.score
            count += 1

            report_item: Dict[str, Any] = {
                "question": q.text,
                "type": q.type,
                "user_answer": user_ans,
                "score": eval_data.score,
                "feedback": eval_data.feedback,
                "ideal_answer": eval_data.ideal_answer,
            }

            if q.type == "code":
                report_item["tc"] = getattr(eval_data, "time_complexity", None)
                report_item["sc"] = getattr(eval_data, "space_complexity", None)
                report_item["quality"] = getattr(eval_data, "code_quality", None)

            breakdown.append(report_item)

    overall = round(total_score / count, 1) if count > 0 else 0

    if overall < 4.0:
        qual_score = "Poor"
    elif overall < 6.0:
        qual_score = "Decent"
    elif overall < 8.0:
        qual_score = "Good"
    elif overall < 9.0:
        qual_score = "Very Good"
    else:
        qual_score = "Excellent"

    report = InterviewReport(
        overall_score=overall,
        qualitative_score=qual_score,
        breakdown=breakdown
    )

    # ── Persist the report to Supabase before deleting from Redis ──────────
    try:
        supabase = await get_db()
        report_record = {
            "user_id": user_id_str,
            "overall_score": overall,
            "qualitative_score": qual_score,
            "breakdown": breakdown,
            "role": session.role,
            "experience_level": session.experience_level,
            "questions_count": len(session.questions),
            "answers_count": count,
        }
        await supabase.table("interview_reports").insert(report_record).execute()
        logger.info("Interview report persisted for user %s (score: %s)", user_id_str, overall)
    except Exception as e:
        # Non-fatal — the user still gets their report in the response
        logger.warning("Failed to persist interview report for user %s: %s", user_id_str, e)

    # Explicitly delete from Redis (replaces: del active_sessions[user_id_str])
    try:
        await delete_session(user_id_str)
    except Exception as e:
        logger.warning("Redis delete_session failed for user %s: %s", user_id_str, e)

    return report


@router.get("/history")
async def get_interview_history(user: CurrentUser):    """
    Returns the last 20 persisted interview reports for the current user,
    newest first. Reads from the interview_reports Supabase table.
    """
    user_id_str = str(user.id)
    supabase = await get_db()

    try:
        res = await supabase.table("interview_reports") \
            .select("id, overall_score, qualitative_score, breakdown, role, experience_level, questions_count, answers_count, created_at") \
            .eq("user_id", user_id_str) \
            .order("created_at", desc=True) \
            .limit(20) \
            .execute()
        return res.data or []
    except Exception as e:
        logger.error("Failed to fetch interview history for user %s: %s", user_id_str, e)
        raise HTTPException(status_code=500, detail="Failed to load interview history.")


@router.get("/session")
async def get_active_session(user: CurrentUser):
    """
    Returns the active interview session from Redis if one exists.
    Used by the frontend to offer a resume option when the user navigates back.
    Returns { active: bool, questions: list|null, answered_count: int, role: str|null }
    """
    user_id_str = str(user.id)
    try:
        session = await load_session(user_id_str)
    except Exception as e:
        logger.warning("Redis load_session (GET /session) failed for user %s: %s", user_id_str, e)
        return {"active": False, "questions": None, "answered_count": 0, "role": None}

    if not session:
        return {"active": False, "questions": None, "answered_count": 0, "role": None}

    # Strip encoding prefixes from role for display
    import re as _re
    display_role = _re.sub(r'^\[ROAST\]', '', session.role)
    display_role = _re.sub(r'\[LANG:[^\]]+\]', '', display_role).strip()

    return {
        "active": True,
        "questions": session.questions,
        "answered_count": len(session.evaluations),
        "total_questions": len(session.questions),
        "role": display_role or None,
        "experience_level": session.experience_level,
    }
