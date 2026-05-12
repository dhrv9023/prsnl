# app/schemas/interview.py
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class MatchRequest(BaseModel):
    resume_id: str
    job_description: str | None = None  # optional — if omitted, uses rule-based general scoring

class DeepAnalysisRequest(BaseModel):
    resume_id: str
    job_description: str | None = None  # optional — enables JD-aware mode

class HiringIntelRequest(BaseModel):
    resume_id: str
    job_description: str
    target_role: str
    experience_level: str  # fresher | junior | mid | senior

class CoverLetterRequest(BaseModel):
    resume_id: str
    job_description: str
    company_name: str
    job_title: str

class CoverLetterRoastRequest(BaseModel):
    resume_id: str
    job_description: str
    company_name: str
    job_title: str
    language: str = "english"  # any language accepted in roast mode

class HumanizeRequest(BaseModel):
    text: str  # the cover letter text to humanize

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
    roast_mode: bool = False
    language: str = "english"

class AnswerSubmission(BaseModel):
    question_id: int
    user_answer: Optional[str] = None
    roast_mode: bool = False
    language: str = "english"

class InterviewSession(BaseModel):
    resume_text: str = ""
    role: str = ""
    experience_level: str = ""
    questions: List[InterviewQuestion] = []
    answers: Dict[int, str] = {}
    evaluations: Dict[int, AnswerEvaluation] = {}
