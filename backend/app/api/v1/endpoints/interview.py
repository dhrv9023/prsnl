# app/api/v1/endpoints/interview.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from app.services.ai_interview import (
    extract_text_from_pdf, generate_questions, evaluate_answer, 
    transcribe_audio, get_report, generate_audio
)

router = APIRouter()

@router.post("/start")
async def start_interview_route(
    file: UploadFile = File(...), 
    role: str = Form(...), 
    level: str = Form(...),
    theory: int = Form(1), mcq: int = Form(1), code: int = Form(1)
):
    content = await file.read()
    text = extract_text_from_pdf(content)
    
    if not text: raise HTTPException(400, "Empty PDF")

    questions = await generate_questions(text, role, level, {"theory": theory, "mcq": mcq, "code": code})
    
    # Intro Audio
    first_q = questions[0].text if questions else ""
    intro = generate_audio(f"Welcome. Question 1: {first_q}")
    
    return {"questions": questions, "intro_audio": intro}

@router.post("/submit")
async def submit_answer_route(
    question_id: int = Form(...),
    user_text: Optional[str] = Form(None),
    user_audio: Optional[UploadFile] = File(None)
):
    final_answer = user_text
    if user_audio:
        audio_bytes = await user_audio.read()
        final_answer = transcribe_audio(audio_bytes)
    
    if not final_answer: final_answer = "No answer"
    
    evaluation = await evaluate_answer(question_id, final_answer)
    if not evaluation: raise HTTPException(404, "Question not found")
    
    return evaluation

@router.post("/end")
async def end_interview_route():
    return get_report()