# app/services/interview_service.py
import os
import json
import io
import base64
import pypdf
from groq import Groq
from gtts import gTTS
from app.core.config import settings
from app.schemas.models import InterviewQuestion, AnswerEvaluation

client = Groq(api_key=settings.GROQ_API_KEY)

class InterviewSession:
    def __init__(self):
        self.resume_text = ""
        self.questions = []
        self.answers = {}
        self.evaluations = {}

# GLOBAL SESSION (For testing only - simple, but not multi-user safe)
# In production, you would save this to the Database (Redis/Postgres)
session_storage = InterviewSession()

def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception:
        return ""

def generate_audio(text: str) -> str:
    try:
        tts = gTTS(text=text, lang='en')
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return base64.b64encode(fp.read()).decode('utf-8')
    except Exception:
        return ""

def transcribe_audio(audio_bytes: bytes) -> str:
    try:
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "audio.wav" 
        transcription = client.audio.transcriptions.create(
            file=(audio_file.name, audio_file.read()),
            model="distil-whisper-large-v3-en",
            response_format="json",
            temperature=0.0
        )
        return transcription.text
    except Exception:
        return ""

async def generate_questions(resume_text: str, role: str, level: str, counts: dict):
    # Update session
    session_storage.resume_text = resume_text
    
    total = sum(counts.values())
    prompt = f"""
    Role: {role} ({level}). 
    Resume: {resume_text[:2000]}
    Generate exactly {total} questions:
    - {counts['theory']} Theory
    - {counts['mcq']} MCQ
    - {counts['code']} Coding
    Output JSON: {{ "questions": [ {{ "id": 1, "type": "theory", "text": "..." }} ] }}
    """
    
    completion = client.chat.completions.create(
        model="llama3-70b-8192", # Use Llama 3 for better JSON
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    data = json.loads(completion.choices[0].message.content)
    
    # Store in session
    session_storage.questions = [InterviewQuestion(**q) for q in data.get("questions", [])]
    return session_storage.questions

async def evaluate_answer(question_id: int, user_answer: str):
    question = next((q for q in session_storage.questions if q.id == question_id), None)
    if not question: return None

    prompt = f"Question: {question.text}. User Answer: {user_answer}. Evaluate JSON."
    
    completion = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    eval_data = json.loads(completion.choices[0].message.content)
    
    # Generate Audio Feedback
    audio_b64 = generate_audio(f"Score {eval_data.get('score')}. {eval_data.get('feedback')}")
    
    result = AnswerEvaluation(**eval_data, audio_base64=audio_b64)
    
    # Save to session
    session_storage.answers[question_id] = user_answer
    session_storage.evaluations[question_id] = result
    
    return result

def get_report():
    breakdown = []
    total = 0
    count = 0
    for q in session_storage.questions:
        if q.id in session_storage.evaluations:
            ev = session_storage.evaluations[q.id]
            total += ev.score
            count += 1
            breakdown.append({
                "question": q.text,
                "score": ev.score,
                "feedback": ev.feedback
            })
    
    overall = round(total/count, 1) if count > 0 else 0
    return {"overall_score": overall, "breakdown": breakdown}