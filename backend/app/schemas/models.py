# app/schemas/interview.py
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class MatchRequest(BaseModel):
    resume_id: str
    job_description: str

class RoastRequest(BaseModel):
    resume_id: str
    job_description: str
    language: str = "english"

class CoverLetterRequest(BaseModel):
    resume_id: str
    job_description: str
    company_name: str  # <--- Added: Required by DB
    job_title: str     # <--- Added: Likely required by DB too

class SavePDFRequest(BaseModel):
    application_id: str
    final_text: str

class InterviewQuestion(BaseModel):
    id: int
    type: str 
    text: str
    options: Optional[List[str]] = None
    context: Optional[str] = None

class AnswerEvaluation(BaseModel):
    score: int
    feedback: str
    ideal_answer: str
    time_complexity: Optional[str] = None
    space_complexity: Optional[str] = None
    code_quality: Optional[str] = None
    audio_base64: Optional[str] = None

class InterviewReport(BaseModel):
    overall_score: float
    breakdown: List[Dict[str, Any]]
    qualitative_score: Optional[str] = None

class StartInterviewRequest(BaseModel):
    resume_id: str
    role: str
    experience_level: str

class AnswerSubmission(BaseModel):
    question_id: int
    user_answer: Optional[str] = None

class InterviewSession(BaseModel):
    resume_text: str = ""
    role: str = ""
    experience_level: str = ""
    questions: List[InterviewQuestion] = []
    answers: Dict[int, str] = {}
    evaluations: Dict[int, AnswerEvaluation] = {}