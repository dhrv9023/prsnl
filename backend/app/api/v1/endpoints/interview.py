from fastapi import APIRouter, HTTPException, Request
from typing import List, Dict, Any

from app.api.dependencies import CurrentUser
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
)

router = APIRouter()

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

    # 2. Setup Session State
    session = InterviewSession(
        resume_text=resume_text,
        role=body.role,
        experience_level=body.experience_level,
    )

    # 3. Request AI Generation
    try:
        questions = await generate_questions(
            role=body.role,
            experience_level=body.experience_level,
            resume_text=resume_text
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    session.questions = questions

    # 4. Persist to Redis (replaces: active_sessions[user_id_str] = session)
    await save_session(user_id_str, session)

    return session.questions


@router.post("/submit")
@limiter.limit(settings.RATE_LIMIT_INTERVIEW, key_func=ats_rate_key)
async def submit_answer_route(
    request: Request,
    data: AnswerSubmission,
    user: CurrentUser,
) -> AnswerEvaluation:
    user_id_str = str(user.id)

    # Load from Redis (replaces: active_sessions.get(user_id_str))
    session = await load_session(user_id_str)

    if not session:
        raise HTTPException(
            status_code=400,
            detail="No active interview session found. Please start a new interview."
        )

    question = next(
        (q for q in session.questions if q.id == data.question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Evaluate answer via AI
    try:
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
    await save_session(user_id_str, session)

    return evaluation


@router.post("/end")
@limiter.limit(settings.RATE_LIMIT_INTERVIEW, key_func=ats_rate_key)
async def end_interview_route(request: Request, user: CurrentUser) -> InterviewReport:
    user_id_str = str(user.id)

    # Load from Redis
    session = await load_session(user_id_str)

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

    # Explicitly delete from Redis (replaces: del active_sessions[user_id_str])
    await delete_session(user_id_str)

    return report
