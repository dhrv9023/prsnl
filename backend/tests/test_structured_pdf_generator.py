# backend/tests/test_structured_pdf_generator.py
"""
Unit tests for render_structured_resume_pdf() in resume_pdf_generator.py.

Test categories:
  1. PDF validity  — output starts with %PDF- magic bytes.
  2. ATS text extraction — pypdf can extract all key content fields.
  3. Template differences — "classic" vs "modern" produce distinct outputs.
  4. XML injection safety — special characters don't crash ReportLab.
  5. Empty / minimal resume — edge cases don't crash the renderer.
  6. Section order — custom section_order is respected in rendered output.
  7. Margin presets — compact / normal / spacious all produce valid PDFs.
"""

from __future__ import annotations

import io
import uuid

import pytest
from pypdf import PdfReader

from app.services.resume_pdf_generator import render_structured_resume_pdf


# ── Test data factory ─────────────────────────────────────────────────────────

def _uid() -> str:
    return str(uuid.uuid4())


def _sample_resume(
    name: str = "Alice Sharma",
    template: str = "classic",
    margins: str = "normal",
    section_order: list[str] | None = None,
) -> dict:
    return {
        "basics": {
            "name": name,
            "title": "Staff Data Engineer",
            "email": "alice@example.com",
            "phone": "+91-98765-43210",
            "location": "Bengaluru, India",
            "linkedin": "https://linkedin.com/in/alice",
            "github": None,
            "portfolio": None,
            "summary": (
                "10 years of experience building large-scale data pipelines "
                "on GCP, serving 500M daily events."
            ),
        },
        "experience": [
            {
                "id": _uid(),
                "company": "DataStream Inc",
                "role": "Staff Data Engineer",
                "location": "Bengaluru, India",
                "start_date": "March 2020",
                "end_date": "Present",
                "current": True,
                "bullets": [
                    {"id": _uid(), "text": "Architected a Kafka+Flink pipeline processing 500M events/day"},
                    {"id": _uid(), "text": "Reduced P95 latency by 40% through partition rebalancing"},
                ],
            },
            {
                "id": _uid(),
                "company": "Startup ABC",
                "role": "Data Engineer",
                "location": "Pune, India",
                "start_date": "June 2017",
                "end_date": "February 2020",
                "current": False,
                "bullets": [
                    {"id": _uid(), "text": "Built ETL pipelines for 12 retail clients"},
                ],
            },
        ],
        "education": [
            {
                "id": _uid(),
                "institution": "IIT Bombay",
                "degree": "B.Tech",
                "field_of_study": "Computer Science",
                "location": "Mumbai, India",
                "start_date": "2013",
                "end_date": "2017",
                "gpa": "8.9",
                "bullets": [],
            }
        ],
        "skills": [
            {"id": _uid(), "category": "Languages", "items": ["Python", "SQL", "Scala"]},
            {"id": _uid(), "category": "Cloud & Tools", "items": ["GCP", "Kafka", "Flink", "dbt"]},
        ],
        "projects": [
            {
                "id": _uid(),
                "name": "StreamViz",
                "description": "Real-time Kafka metrics dashboard",
                "link": "https://github.com/alice/streamviz",
                "technologies": ["Python", "Kafka", "Grafana"],
                "bullets": [
                    {"id": _uid(), "text": "700+ GitHub stars; presented at DataEngConf 2023"},
                ],
            }
        ],
        "certifications": [
            {
                "id": _uid(),
                "name": "Google Professional Data Engineer",
                "issuer": "Google Cloud",
                "date": "November 2021",
                "url": "https://cloud.google.com/certification",
            }
        ],
        "meta": {
            "template_id": template,
            "font_size": "medium",
            "margins": margins,
            "section_order": section_order or [
                "summary", "experience", "education", "skills", "projects", "certifications"
            ],
        },
    }


def _extract_text(pdf_bytes: bytes) -> str:
    """Use pypdf to extract all text from a PDF bytes object."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


# ── Test Class 1: PDF validity ────────────────────────────────────────────────

class TestPdfValidity:
    def test_classic_template_produces_pdf_magic_bytes(self):
        pdf = render_structured_resume_pdf(_sample_resume(template="classic"))
        assert pdf[:5] == b"%PDF-", "Output must start with PDF magic bytes"

    def test_modern_template_produces_pdf_magic_bytes(self):
        pdf = render_structured_resume_pdf(_sample_resume(template="modern"))
        assert pdf[:5] == b"%PDF-", "Output must start with PDF magic bytes"

    def test_returns_bytes(self):
        result = render_structured_resume_pdf(_sample_resume())
        assert isinstance(result, bytes)
        assert len(result) > 1000, "PDF should contain meaningful content"

    def test_pypdf_can_open_generated_pdf(self):
        """Sanity check: pypdf can open and read the generated PDF without error."""
        pdf = render_structured_resume_pdf(_sample_resume())
        reader = PdfReader(io.BytesIO(pdf))
        assert reader.pages is not None
        assert len(reader.pages) >= 1


# ── Test Class 2: ATS text extraction ────────────────────────────────────────

class TestAtsTextExtraction:
    """ATS parsers extract text from PDF vector streams. These tests verify that
    all critical resume fields are selectable/extractable from the generated PDF."""

    def test_candidate_name_is_extractable(self):
        pdf = render_structured_resume_pdf(_sample_resume(name="Alice Sharma"))
        text = _extract_text(pdf)
        assert "Alice Sharma" in text

    def test_email_is_extractable(self):
        pdf = render_structured_resume_pdf(_sample_resume())
        text = _extract_text(pdf)
        assert "alice@example.com" in text

    def test_company_name_is_extractable(self):
        pdf = render_structured_resume_pdf(_sample_resume())
        text = _extract_text(pdf)
        assert "DataStream Inc" in text

    def test_job_title_is_extractable(self):
        pdf = render_structured_resume_pdf(_sample_resume())
        text = _extract_text(pdf)
        assert "Staff Data Engineer" in text

    def test_bullet_text_is_extractable(self):
        pdf = render_structured_resume_pdf(_sample_resume())
        text = _extract_text(pdf)
        # Check key bullet content (not the bullet symbol, which may vary)
        assert "500M events" in text or "500M" in text

    def test_institution_is_extractable(self):
        pdf = render_structured_resume_pdf(_sample_resume())
        text = _extract_text(pdf)
        assert "IIT Bombay" in text

    def test_skill_items_extractable(self):
        pdf = render_structured_resume_pdf(_sample_resume())
        text = _extract_text(pdf)
        assert "Python" in text
        assert "Kafka" in text

    def test_certification_name_extractable(self):
        pdf = render_structured_resume_pdf(_sample_resume())
        text = _extract_text(pdf)
        assert "Google Professional Data Engineer" in text

    def test_project_name_extractable(self):
        pdf = render_structured_resume_pdf(_sample_resume())
        text = _extract_text(pdf)
        assert "StreamViz" in text

    def test_modern_template_also_extracts_name(self):
        """Modern template must remain ATS-extractable despite different styling."""
        pdf = render_structured_resume_pdf(_sample_resume(name="Bob Kumar", template="modern"))
        text = _extract_text(pdf)
        assert "Bob Kumar" in text

    def test_modern_template_extracts_bullets(self):
        pdf = render_structured_resume_pdf(_sample_resume(template="modern"))
        text = _extract_text(pdf)
        assert "Kafka" in text or "pipeline" in text.lower()


# ── Test Class 3: Template differences ───────────────────────────────────────

class TestTemplateDifferences:
    def test_classic_and_modern_produce_different_output(self):
        classic = render_structured_resume_pdf(_sample_resume(template="classic"))
        modern = render_structured_resume_pdf(_sample_resume(template="modern"))
        assert classic != modern, "Classic and modern templates must produce distinct PDFs"

    def test_unknown_template_falls_back_to_classic(self):
        """An unrecognised template_id should silently fall back to 'classic'."""
        data = _sample_resume()
        data["meta"]["template_id"] = "nonexistent"
        pdf = render_structured_resume_pdf(data, template_id="nonexistent")
        assert pdf[:5] == b"%PDF-"
        text = _extract_text(pdf)
        assert "Alice Sharma" in text


# ── Test Class 4: XML injection safety ───────────────────────────────────────

class TestXmlInjectionSafety:
    """User-supplied resume content may contain XML-significant characters.
    ReportLab's Paragraph renderer parses content as XML; un-escaped characters
    crash the renderer with XMLSyntaxError or similar.
    render_structured_resume_pdf must escape all user text."""

    def test_ampersand_in_company_name_does_not_crash(self):
        data = _sample_resume()
        data["experience"][0]["company"] = "Jones & Partners LLC"
        pdf = render_structured_resume_pdf(data)
        assert pdf[:5] == b"%PDF-"
        text = _extract_text(pdf)
        assert "Jones" in text

    def test_angle_brackets_in_bullet_do_not_crash(self):
        data = _sample_resume()
        data["experience"][0]["bullets"][0]["text"] = "Used <template> patterns in production"
        pdf = render_structured_resume_pdf(data)
        assert pdf[:5] == b"%PDF-"

    def test_xss_attempt_in_name_does_not_crash(self):
        data = _sample_resume()
        data["basics"]["name"] = '<script>alert("xss")</script> Real Name'
        pdf = render_structured_resume_pdf(data)
        assert pdf[:5] == b"%PDF-"
        text = _extract_text(pdf)
        assert "Real Name" in text

    def test_percent_sign_in_content_does_not_crash(self):
        data = _sample_resume()
        data["experience"][0]["bullets"][1]["text"] = "Achieved 99.9% uptime SLA"
        pdf = render_structured_resume_pdf(data)
        assert pdf[:5] == b"%PDF-"

    def test_double_quote_in_job_title_does_not_crash(self):
        data = _sample_resume()
        data["basics"]["title"] = 'Senior "Principal" Architect'
        pdf = render_structured_resume_pdf(data)
        assert pdf[:5] == b"%PDF-"


# ── Test Class 5: Empty and minimal resumes ───────────────────────────────────

class TestEmptyAndMinimalResumes:
    def test_completely_empty_resume_does_not_crash(self):
        """A fully empty StructuredResume dict (all defaults) should produce a valid PDF."""
        empty = {
            "basics": {"name": "", "title": "", "email": "", "phone": "",
                       "location": "", "summary": ""},
            "experience": [], "education": [], "skills": [],
            "projects": [], "certifications": [],
            "meta": {
                "template_id": "classic", "font_size": "medium",
                "margins": "normal",
                "section_order": ["summary", "experience", "education",
                                  "skills", "projects", "certifications"],
            },
        }
        pdf = render_structured_resume_pdf(empty)
        assert pdf[:5] == b"%PDF-"

    def test_name_only_resume_produces_valid_pdf(self):
        data = {
            "basics": {"name": "John Solo", "title": "", "email": "", "phone": "",
                       "location": "", "summary": ""},
            "experience": [], "education": [], "skills": [],
            "projects": [], "certifications": [],
            "meta": {
                "template_id": "classic", "font_size": "medium", "margins": "normal",
                "section_order": ["summary", "experience"],
            },
        }
        pdf = render_structured_resume_pdf(data)
        assert pdf[:5] == b"%PDF-"
        text = _extract_text(pdf)
        assert "John Solo" in text

    def test_experience_without_bullets_does_not_crash(self):
        data = _sample_resume()
        data["experience"][0]["bullets"] = []
        pdf = render_structured_resume_pdf(data)
        assert pdf[:5] == b"%PDF-"

    def test_skills_with_empty_items_array_skipped(self):
        data = _sample_resume()
        data["skills"] = [{"id": _uid(), "category": "Languages", "items": []}]
        pdf = render_structured_resume_pdf(data)
        assert pdf[:5] == b"%PDF-"


# ── Test Class 6: Section ordering ───────────────────────────────────────────

class TestSectionOrdering:
    def test_skills_before_experience_appears_first_in_text(self):
        """When section_order puts 'skills' before 'experience', skills content
        should appear earlier in extracted text."""
        data = _sample_resume(section_order=["skills", "experience", "education",
                                              "summary", "projects", "certifications"])
        pdf = render_structured_resume_pdf(data)
        text = _extract_text(pdf)
        # 'Python' (skills) should appear before 'DataStream Inc' (experience)
        py_pos = text.find("Python")
        ds_pos = text.find("DataStream Inc")
        assert py_pos != -1
        assert ds_pos != -1
        assert py_pos < ds_pos, (
            f"Skills ('Python' at {py_pos}) should precede "
            f"Experience ('DataStream Inc' at {ds_pos}) in extracted text"
        )

    def test_unknown_section_keys_in_order_are_silently_ignored(self):
        """Unrecognised section keys (e.g. from old data) don't crash the renderer."""
        data = _sample_resume()
        data["meta"]["section_order"] = ["experience", "mystery_section", "education"]
        pdf = render_structured_resume_pdf(data)
        assert pdf[:5] == b"%PDF-"


# ── Test Class 7: Margin presets ─────────────────────────────────────────────

class TestMarginPresets:
    @pytest.mark.parametrize("margins", ["compact", "normal", "spacious"])
    def test_all_margin_presets_produce_valid_pdf(self, margins: str):
        data = _sample_resume(margins=margins)
        pdf = render_structured_resume_pdf(data)
        assert pdf[:5] == b"%PDF-"
        text = _extract_text(pdf)
        assert "Alice Sharma" in text

    def test_invalid_margin_preset_falls_back_to_normal(self):
        data = _sample_resume()
        data["meta"]["margins"] = "giant"   # not a valid preset
        pdf = render_structured_resume_pdf(data)
        assert pdf[:5] == b"%PDF-"
