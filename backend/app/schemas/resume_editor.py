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

    @field_validator("name", "title", "email", "phone", "location", "linkedin", "github", "portfolio", "summary", mode="before", check_fields=False)
    @classmethod
    def coerce_strings(cls, v: object) -> str:
        return str(v) if v is not None else ""


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

    @field_validator("company", "role", "location", "start_date", "end_date", mode="before", check_fields=False)
    @classmethod
    def coerce_strings(cls, v: object) -> str:
        return str(v) if v is not None else ""


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

    @field_validator("institution", "degree", "field_of_study", "location", "start_date", "end_date", "gpa", mode="before", check_fields=False)
    @classmethod
    def coerce_strings(cls, v: object) -> str:
        return str(v) if v is not None else ""


class SkillCategory(BaseModel):
    """A labelled group of skills (e.g. 'Languages', 'Frameworks')."""

    id: str = Field(default_factory=_new_id)
    category: str = ""
    items: list[str] = Field(default_factory=list)

    @field_validator("category", mode="before", check_fields=False)
    @classmethod
    def coerce_strings(cls, v: object) -> str:
        return str(v) if v is not None else ""

    @field_validator("items", mode="before", check_fields=False)
    @classmethod
    def coerce_items(cls, v: object) -> list[str]:
        if not v or not isinstance(v, list):
            return []
        return [str(x) for x in v if x is not None]


class ProjectItem(BaseModel):
    """A personal, academic, or open-source project entry."""

    id: str = Field(default_factory=_new_id)
    name: str = ""
    description: Optional[str] = ""
    link: Optional[str] = ""
    technologies: list[str] = Field(default_factory=list)
    bullets: list[ResumeBullet] = Field(default_factory=list)

    @field_validator("name", "description", "link", mode="before", check_fields=False)
    @classmethod
    def coerce_strings(cls, v: object) -> str:
        return str(v) if v is not None else ""


class CertificationItem(BaseModel):
    """A credential, certification, or license."""

    id: str = Field(default_factory=_new_id)
    name: str = ""
    issuer: str = ""
    date: str = ""
    url: Optional[str] = ""

    @field_validator("name", "issuer", "date", "url", mode="before", check_fields=False)
    @classmethod
    def coerce_strings(cls, v: object) -> str:
        return str(v) if v is not None else ""


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

TemplateId = Literal["classic", "modern", "minimal", "technical"]
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

    @classmethod
    def create_john_doe_mock(cls, template_id: TemplateId = "classic") -> "StructuredResume":
        """Return a rich, production-grade John Doe mock resume document."""
        return cls(
            basics=ResumeBasics(
                name="John Doe",
                title="Senior Full-Stack Software Engineer",
                email="john.doe@example.com",
                phone="+1 (555) 234-5678",
                location="San Francisco, CA",
                linkedin="https://linkedin.com/in/johndoe",
                github="https://github.com/johndoe",
                portfolio="https://johndoe.dev",
                summary="High-impact Full-Stack Engineer with 6+ years of experience designing and scaling resilient cloud applications and distributed systems. Expert in TypeScript, Python, React, FastAPI, and Kubernetes. Proven track record of improving latency by 40% and leading engineering teams to deliver mission-critical software.",
            ),
            experience=[
                ExperienceItem(
                    id=_new_id(),
                    company="TechCorp Solutions",
                    role="Senior Full-Stack Engineer",
                    location="San Francisco, CA",
                    start_date="Jan 2022",
                    end_date="Present",
                    current=True,
                    bullets=[
                        ResumeBullet(id=_new_id(), text="Architected and deployed real-time data streaming pipeline processing 15M+ events daily with 99.99% uptime."),
                        ResumeBullet(id=_new_id(), text="Spearheaded backend migration from monolithic architecture to FastAPI microservices, reducing P99 API latency by 42%."),
                        ResumeBullet(id=_new_id(), text="Mentored 5 junior and mid-level engineers in distributed system design, clean architecture, and automated test coverage."),
                    ],
                ),
                ExperienceItem(
                    id=_new_id(),
                    company="DataFlow Inc",
                    role="Software Engineer",
                    location="San Jose, CA",
                    start_date="Jun 2019",
                    end_date="Dec 2021",
                    current=False,
                    bullets=[
                        ResumeBullet(id=_new_id(), text="Engineered responsive React web dashboard adopted by 25,000+ monthly active enterprise customers."),
                        ResumeBullet(id=_new_id(), text="Optimized complex PostgreSQL aggregation queries, decreasing average dashboard load times from 3.2s to 650ms."),
                        ResumeBullet(id=_new_id(), text="Implemented automated CI/CD pipeline using GitHub Actions and Docker, accelerating release cycle by 3x."),
                    ],
                ),
            ],
            education=[
                EducationItem(
                    id=_new_id(),
                    institution="University of California, Berkeley",
                    degree="Bachelor of Science",
                    field_of_study="Computer Science",
                    location="Berkeley, CA",
                    start_date="2015",
                    end_date="2019",
                    gpa="3.8 / 4.0",
                    bullets=[
                        ResumeBullet(id=_new_id(), text="Dean's Honors List (all 8 semesters); Course Leader for Data Structures & Algorithms."),
                    ],
                ),
            ],
            skills=[
                SkillCategory(
                    id=_new_id(),
                    category="Languages",
                    items=["TypeScript", "JavaScript", "Python", "Go", "SQL", "HTML/CSS"],
                ),
                SkillCategory(
                    id=_new_id(),
                    category="Frameworks & Libs",
                    items=["React", "Next.js", "FastAPI", "Node.js", "TailwindCSS", "Redux"],
                ),
                SkillCategory(
                    id=_new_id(),
                    category="Cloud & DevOps",
                    items=["AWS (ECS, S3, RDS)", "Docker", "Kubernetes", "PostgreSQL", "Redis", "Git"],
                ),
            ],
            projects=[
                ProjectItem(
                    id=_new_id(),
                    name="CloudMetrics Monitor",
                    description="Open-source observability toolkit for Kubernetes container metrics.",
                    link="https://github.com/johndoe/cloudmetrics",
                    technologies=["Go", "React", "Prometheus", "Docker"],
                    bullets=[
                        ResumeBullet(id=_new_id(), text="Built real-time container metrics visualizer with custom alerting engine; garnered 1,200+ GitHub stars."),
                    ],
                ),
            ],
            certifications=[
                CertificationItem(
                    id=_new_id(),
                    name="AWS Certified Solutions Architect – Associate",
                    issuer="Amazon Web Services",
                    date="2023",
                    url="https://aws.amazon.com/verification",
                ),
            ],
            meta=EditorMeta(
                template_id=template_id,
                font_size="medium",
                margins="normal",
                section_order=list(VALID_SECTIONS),
            ),
        )

    def to_editor_dict(self) -> dict:
        """Return a serialisable dict with mode='json' (UUIDs as strings, etc.)."""
        return self.model_dump(mode="json")
