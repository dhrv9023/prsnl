from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import List, Dict, Any
import tempfile
import os
import json
import random
from dependencies import CurrentUser
from supabase import get_db
from models import (
    StartInterviewRequest,
    InterviewQuestion,
    AnswerSubmission,
    AnswerEvaluation,
    InterviewReport,
    InterviewSession
)
from ai_interview import (
    generate_questions,
    evaluate_single_answer,
)

# You must import your groq client here
from groq import Groq
from config import settings
client = Groq(api_key=settings.GROQ_API_KEY)

router = APIRouter()

active_sessions: Dict[str, InterviewSession] = {}

@router.post("/start")
async def start_interview_route(
    request: StartInterviewRequest,
    # user: CurrentUser,
) -> List[InterviewQuestion]:
    # user_id_str = str(user.id)
    user_id_str = "6a5a36a5-8b49-444e-8291-b9cb2f03ff19"
    
    supabase = await get_db()
    res_data = await supabase.table("resumes")\
        .select("parsed_content")\
        .eq("id", request.resume_id)\
        .eq("user_id", user_id_str)\
        .execute()
        
    if not res_data.data:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    resume_text = res_data.data[0]['parsed_content']['raw_text']
    
    if len(resume_text) < 50:
        raise HTTPException(status_code=400, detail="Extracted resume text is too short or invalid.")

    session = InterviewSession()
    session.resume_text = resume_text
    session.role = request.role
    session.experience_level = request.experience_level
    
    active_sessions[user_id_str] = session

    # RANDOM SEED: Forces the LLM to take a different path every time
    seed = random.randint(1, 10000) 

    prompt = f"""
    You are an expert technical interviewer for the role of {request.role} ({request.experience_level}).
    RESUME TEXT: {resume_text[:3000]}
    
    TASK: Design a highly tailored, unpredictable interview based STRICTLY on the candidate's resume.
    CRITICAL INSTRUCTION FOR VARIETY (Seed: {seed}): DO NOT ask generic boilerplate questions. Dig deep into specific projects, unique tools, tech stack, and coursework mentioned in their resume. Vary the topics widely.

    Guidelines for choosing 6 QUESTION TYPES:
    1. THEORY (2 questions): Deep-dive conceptual questions about specific projects or architecture they worked on.
    2. MCQ (2 questions): Highly specific trivia about the frameworks/tools they listed. 4 options, 1 correct.
    3. CODE (2 questions): Strictly Data Structures and Algorithms (DSA) appropriate for a {request.experience_level}. One on Data Structures, one on Algorithmic optimization.

    OUTPUT JSON FORMAT:
    {{
      "q1": {{ "id": 1, "type": "theory", "text": "..." }},
      "q2": {{ "id": 2, "type": "theory", "text": "..." }},
      "q3": {{ "id": 3, "type": "mcq", "text": "...", "options": ["A", "B", "C", "D"], "correct_answer": "B" }},
      "q4": {{ "id": 4, "type": "mcq", "text": "...", "options": ["A", "B", "C", "D"], "correct_answer": "C" }},
      "q5": {{ "id": 5, "type": "code", "text": "...", "context": "Focus on optimizing TC/SC." }},
      "q6": {{ "id": 6, "type": "code", "text": "...", "context": "Focus on edge cases." }}
    }}
    """

    try:
        completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.8, # INCREASED TEMPERATURE FOR MORE CREATIVITY & VARIETY
        )
        data = json.loads(completion.choices[0].message.content)
        
        raw_qs = []
        # UPDATED TO LOOP THROUGH ALL 6 QUESTIONS
        for key in ["q1", "q2", "q3", "q4", "q5", "q6"]:
            if key in data:
                raw_qs.append(data[key])
            
        session.questions = [InterviewQuestion(**q) for q in raw_qs]
        return session.questions
        
    except Exception as e:
        print(f"Gen Error: {e}")
        raise HTTPException(500, "Failed to generate questions.")


EVAL_INSTRUCTIONS = """
You are an expert technical interviewer. Evaluate the candidate's answer.
- THEORY: Score 0-10. Give concise feedback and a model answer.
- MCQ: Score 10 if correct, else 0.
- CODE: Score 0-10 for correctness/efficiency. Give TC/SC feedback.
Respond ONLY in valid JSON:
{
  "score": <integer 0-10>,
  "feedback": "<2 sentences>",
  "ideal_answer": "<concise strong answer>"
}
"""

@router.post("/submit_audio_answer", response_model=AnswerEvaluation)
async def submit_audio_answer(
    question_id: int = Form(...),
    audio: UploadFile = File(...),
    # user: CurrentUser = Depends()
):
    # user_id_str = str(user.id)
    user_id_str = "6a5a36a5-8b49-444e-8291-b9cb2f03ff19"
    session = active_sessions.get(user_id_str)
    if not session:
        raise HTTPException(400, "No active interview session found.")

    question = next((q for q in session.questions if q.id == question_id), None)
    if not question:
        raise HTTPException(404, "Question not found")

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            temp_audio.write(await audio.read())
            temp_audio_path = temp_audio.name
    except Exception as e:
        raise HTTPException(500, f"Failed to save audio: {str(e)}")

    try:
        with open(temp_audio_path, "rb") as file:
            transcription = client.audio.transcriptions.create(
                file=(temp_audio_path, file.read()),
                model="whisper-large-v3-turbo",
                response_format="json"
            )
        user_spoken_text = transcription.text
    except Exception as e:
        os.remove(temp_audio_path)
        raise HTTPException(500, f"Transcription failed: {str(e)}")
    
    os.remove(temp_audio_path)

    user_spoken_text = transcription.text.strip()
    
    # TOKEN SAVER: If Whisper heard nothing but background noise/silence
    if not user_spoken_text or len(user_spoken_text) < 5:
        evaluation = AnswerEvaluation(
            score=0, 
            feedback="Candidate remained silent or skipped the question.", 
            ideal_answer="A verbal explanation was expected."
        )
        session.answers[question_id] = "Skipped (Silence)"
        session.evaluations[question_id] = evaluation
        return evaluation

    options_block = f"\nOPTIONS: {question.options}" if question.type == "mcq" and question.options else ""
    prompt = f"""
    {EVAL_INSTRUCTIONS}
    QUESTION TYPE: {question.type}
    ROLE: {session.role}
    QUESTION: {question.text}
    {options_block}
    Candidate Spoken Answer: {user_spoken_text}
    """

    try:
        completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        eval_data = json.loads(completion.choices[0].message.content)
        evaluation = AnswerEvaluation(**eval_data)

        session.answers[question_id] = user_spoken_text
        session.evaluations[question_id] = evaluation
        return evaluation
    except Exception as e:
        raise HTTPException(500, "Failed to evaluate spoken answer.")


@router.post("/submit_answer", response_model=AnswerEvaluation)
async def submit_answer(data: AnswerSubmission, 
#user: CurrentUser
):
    # user_id_str = str(user.id)
    user_id_str = "6a5a36a5-8b49-444e-8291-b9cb2f03ff19"
    session = active_sessions.get(user_id_str)
    if not session:
        raise HTTPException(400, "No active interview session found.")

    question = next((q for q in session.questions if q.id == data.question_id), None)
    if not question:
        raise HTTPException(404, "Question not found")

    final_answer = data.user_answer or "No answer provided."
    answer_block = f"User Code:\n```\n{final_answer}\n```"

    final_answer = data.user_answer.strip() if data.user_answer else ""
    
    # TOKEN SAVER: If code is basically empty, skip LLM call
    if len(final_answer) < 5:
        evaluation = AnswerEvaluation(
            score=0, 
            feedback="Candidate skipped the question or provided no meaningful implementation.", 
            ideal_answer="A valid implementation was expected."
        )
        session.answers[data.question_id] = "Skipped"
        session.evaluations[data.question_id] = evaluation
        return evaluation

    prompt = f"""
    {EVAL_INSTRUCTIONS}
    QUESTION TYPE: {question.type}
    ROLE: {session.role}
    QUESTION: {question.text}
    {answer_block}
    """

    try:
        completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        eval_data = json.loads(completion.choices[0].message.content)
        evaluation = AnswerEvaluation(**eval_data)

        session.answers[data.question_id] = final_answer
        session.evaluations[data.question_id] = evaluation
        return evaluation
    except Exception as e:
        raise HTTPException(500, "Failed to evaluate code answer.")


@router.post("/end", response_model=InterviewReport)
async def end_interview():
    # user_id_str = str(user.id)
    user_id_str = "6a5a36a5-8b49-444e-8291-b9cb2f03ff19"
    session = active_sessions.get(user_id_str)
    if not session:
        raise HTTPException(400, "No active interview session found.")

    breakdown = []
    total_score = 0
    count = 0

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
    
    if overall <= 4.0: qual_score = "Poor"
    elif overall >= 4.0 and overall < 6.0: qual_score = "Needs Improvement"
    elif overall >= 6.0 and overall < 8.0: qual_score = "Good"
    elif overall >= 8.0 and overall < 9.0: qual_score = "Very Good"
    else: qual_score = "Excellent"

    del active_sessions[user_id_str]

    return InterviewReport(
        overall_score=overall, 
        qualitative_score=qual_score, 
        breakdown=breakdown
    )