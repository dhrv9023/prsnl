from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class ATSScoreRequest(BaseModel):
    """Payload for POST /api/ats/score."""

    resume_text: str = Field(..., max_length=500_000)
    mode: Literal["general", "jd"]
    job_description: str = Field(default="", max_length=500_000)

    @model_validator(mode="before")
    @classmethod
    def strip_text_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        out = dict(data)
        rt = out.get("resume_text")
        if isinstance(rt, str):
            out["resume_text"] = rt.strip()
        jd = out.get("job_description")
        if isinstance(jd, str):
            out["job_description"] = jd.strip()
        return out

    @model_validator(mode="after")
    def validate_resume_and_jd(self) -> "ATSScoreRequest":
        if not self.resume_text:
            raise ValueError("resume_text cannot be empty")
        if self.mode == "jd" and not self.job_description:
            raise ValueError("job_description is required when mode is 'jd'")
        return self


class ATSScoreResponse(BaseModel):
    """general: rule-based score (Phase 2). jd: embedding similarity (Phase 3+)."""

    mode: Literal["general", "jd"]
    score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Overall ATS-style score (0–100).",
    )
