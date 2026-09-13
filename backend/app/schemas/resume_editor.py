# backend/app/schemas/resume_editor.py
"""
StructuredResume Pydantic schemas for the Kareerist Resume Editor.

These models define the canonical data contract between:
  - resume_parser.py  (LLM extraction → StructuredResume)
  - resumes.py        (API validation & persistence)
  - resume_pdf_generator.py  (StructuredResume → ReportLab PDF)

All fields are Optional-safe with sensible defaults to ensure that partial
LLM outputs or manually-constructed "new resume" payloads never cause
validation failures.
"""

from __future__ import annotations

import uuid
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ── Utilities ────────────────────────────────────────────────────────────────

def _new_id() -> str:
    """Generate a fresh UUID string for a new resume entity."""
    return str(uuid.uuid4())


# ── Leaf-level atoms ─────────────────────────────────────────────────────────

class ResumeBullet(BaseModel):
    """A single bullet-point entry within an experience / project / education item."""

    id: str = Field(default_factory=_new_id, description="Stable UUID for targeted AI fix mapping.")
    text: str = Field(default="", description="Visible bullet content.")

    @field_validator("text", mode="before")
    @classmethod
    def coerce_text(cls, v: object) -> str:  # noqa: N805
        return str(v) if v is not None else ""


# ── Top-level sections ────────────────────────────────────────────────────────

class ResumeBasics(BaseModel):
    """Candidate header block: name, contact details, summary."""

    name: str = ""
    title: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: Optional[str] = ""
    github: Optional[str] = ""
    portfolio: Optional[str] = ""
    summary: str = ""


class ExperienceItem(BaseModel):
    """One position in the work-history section."""

    id: str = Field(default_factory=_new_id)
    company: str = ""
    role: str = ""
    location: Optional[str] = ""
    start_date: str = ""
    end_date: str = ""
    current: bool = False
    bullets: list[ResumeBullet] = Field(default_factory=list)


class EducationItem(BaseModel):
    """A degree or course entry."""

    id: str = Field(default_factory=_new_id)
    institution: str = ""
    degree: str = ""
    field_of_study: Optional[str] = ""
    location: Optional[str] = ""
    start_date: str = ""
    end_date: str = ""
    gpa: Optional[str] = ""
    bullets: list[ResumeBullet] = Field(default_factory=list)


class SkillCategory(BaseModel):
    """A labelled group of skills (e.g. 'Languages', 'Frameworks')."""

    id: str = Field(default_factory=_new_id)
    category: str = ""
    items: list[str] = Field(default_factory=list)


class ProjectItem(BaseModel):
    """A personal, academic, or open-source project entry."""

    id: str = Field(default_factory=_new_id)
    name: str = ""
    description: Optional[str] = ""
    link: Optional[str] = ""
    technologies: list[str] = Field(default_factory=list)
    bullets: list[ResumeBullet] = Field(default_factory=list)


class CertificationItem(BaseModel):
    """A credential, certification, or license."""

    id: str = Field(default_factory=_new_id)
    name: str = ""
    issuer: str = ""
    date: str = ""
    url: Optional[str] = ""


# ── Document meta ─────────────────────────────────────────────────────────────

# All valid section keys — drives section_order validation and PDF renderer routing.
VALID_SECTIONS: tuple[str, ...] = (
    "summary",
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
)

TemplateId = Literal["classic", "modern"]
FontSize = Literal["compact", "medium", "large"]
Margins = Literal["compact", "normal", "spacious"]


class EditorMeta(BaseModel):
    """
    Document-level display settings.

    These are persisted inside structured_content so the candidate's template
    and typography choices survive across sessions without a separate DB column.
    """

    template_id: TemplateId = "classic"
    font_size: FontSize = "medium"
    margins: Margins = "normal"
    section_order: list[str] = Field(
        default_factory=lambda: list(VALID_SECTIONS),
        description="Ordered list of section keys controlling rendering order.",
    )

    @field_validator("section_order", mode="before")
    @classmethod
    def validate_section_order(cls, v: object) -> list[str]:  # noqa: N805
        if not isinstance(v, list):
            return list(VALID_SECTIONS)
        # Preserve user order but strip unrecognised keys to prevent injection
        cleaned = [s for s in v if isinstance(s, str) and s in VALID_SECTIONS]
        # Append any recognised sections that were omitted so all sections render
        for sec in VALID_SECTIONS:
            if sec not in cleaned:
                cleaned.append(sec)
        return cleaned


# ── Root document model ───────────────────────────────────────────────────────

class StructuredResume(BaseModel):
    """
    Root schema for a Kareerist Resume Editor document.

    Stored as-is in `public.resumes.structured_content` (JSONB).
    Validated on every PUT /api/v1/resumes/{id}/editor request.
    """

    basics: ResumeBasics = Field(default_factory=ResumeBasics)
    experience: list[ExperienceItem] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    skills: list[SkillCategory] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    certifications: list[CertificationItem] = Field(default_factory=list)
    meta: EditorMeta = Field(default_factory=EditorMeta)

    # ------------------------------------------------------------------
    # Convenience helpers used by resume_parser.py and tests
    # ------------------------------------------------------------------

    @classmethod
    def create_empty(cls) -> "StructuredResume":
        """Return a blank, schema-valid StructuredResume for 'create from scratch' flow."""
        return cls()

    def to_editor_dict(self) -> dict:
        """Return a serialisable dict with mode='json' (UUIDs as strings, etc.)."""
        return self.model_dump(mode="json")
