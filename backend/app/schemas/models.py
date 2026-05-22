# app/schemas/interview.py
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any, Literal

class MatchRequest(BaseModel):
    resume_id: str
    job_description: str | None = Field(default=None, max_length=15000)  # optional — if omitted, uses rule-based general scoring

class DeepAnalysisRequest(BaseModel):
    resume_id: str
    job_description: str | None = Field(default=None, max_length=15000)  # optional — enables JD-aware mode

class HiringIntelRequest(BaseModel):
    resume_id: str
    job_description: str = Field(..., max_length=15000)
    target_role: str = Field(..., max_length=200)
    experience_level: str  # fresher | junior | mid | senior

class CoverLetterRequest(BaseModel):
    resume_id: str
    job_description: str = Field(..., max_length=15000)
    company_name: str = Field(..., max_length=200)
    job_title: str = Field(..., max_length=200)

class CoverLetterRoastRequest(BaseModel):
    resume_id: str
    job_description: str = Field(..., max_length=15000)
    company_name: str = Field(..., max_length=200)
    job_title: str = Field(..., max_length=200)
    language: str = "english"  # any language accepted in roast mode

class HumanizeRequest(BaseModel):
    text: str  # the cover letter text to humanize

class SavePDFRequest(BaseModel):
    application_id: str
    final_text: str

class InterviewQuestion(BaseModel):
    id: int
    type: Literal["theory", "mcq", "code"] = "theory"
    text: str
    options: Optional[List[str]] = None
    context: Optional[str] = None

    @field_validator("type", mode="before")
    @classmethod
    def normalise_type(cls, v: str) -> str:
        """Accept any casing/whitespace from the LLM and normalise to lowercase."""
        normalised = str(v).lower().strip()
        if normalised not in {"theory", "mcq", "code"}:
            return "theory"
        return normalised

class AnswerEvaluation(BaseModel):
    score: int
    feedback: str
    ideal_answer: str
    time_complexity: Optional[str] = None
    space_complexity: Optional[str] = None
    code_quality: Optional[str] = None
    audio_base64: Optional[str] = None
    transcribed_answer: Optional[str] = None  # populated for voice submissions

    @field_validator("score", mode="before")
    @classmethod
    def clamp_score(cls, v) -> int:
        """Clamp LLM score to valid 0–10 range."""
        try:
            return max(0, min(10, int(v)))
        except (TypeError, ValueError):
            return 0

class InterviewReport(BaseModel):
    overall_score: float
    breakdown: List[Dict[str, Any]]
    qualitative_score: Optional[str] = None

class StartInterviewRequest(BaseModel):
    resume_id: str
    # Issue #12 fix: restrict role to safe characters only — prevents prompt injection
    # via the role field. Pattern allows letters, digits, spaces, and common job-title
    # punctuation. Max 100 chars to limit token consumption.
    role: str = Field(
        ...,
        max_length=100,
        pattern=r"^[a-zA-Z0-9\s\-/&+.()\u00C0-\u024F]+$",
        description="Job role / title. Alphanumeric + common punctuation only.",
    )
    # Issue #12 fix: Literal enforces an exact allowlist — no free-text injection possible.
    experience_level: Literal["fresher", "junior", "mid", "senior"]
    roast_mode: bool = False
    language: str = "english"

class AnswerSubmission(BaseModel):
    question_id: int
    # Issue #11 fix: cap answer length at the API boundary so oversized payloads
    # are rejected before they reach the LLM call (cost + memory attack prevention).
    user_answer: Optional[str] = Field(default=None, max_length=10_000)
    roast_mode: bool = False
    language: str = "english"

class InterviewSession(BaseModel):
    resume_text: str = ""
    role: str = ""
    experience_level: str = ""
    questions: List[InterviewQuestion] = []
    answers: Dict[int, str] = {}
    evaluations: Dict[int, AnswerEvaluation] = {}
