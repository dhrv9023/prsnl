# backend/tests/test_resume_parser.py
"""
Unit tests for backend/app/services/resume_parser.py.

All external I/O (Groq API calls) is mocked at the chat_complete boundary so
these tests run fully offline, fast, and deterministically.

Test categories:
  1. Successful parsing — LLM returns valid JSON.
  2. Fallback: LLM returns malformed / partial JSON.
  3. Fallback: LLM / network throws an exception.
  4. Edge: Input text too short (< 50 chars).
  5. Edge: Input is None / empty string.
  6. Schema integrity — output always validates against StructuredResume.
"""

from __future__ import annotations

import json
import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.schemas.resume_editor import StructuredResume
from app.services.resume_parser import create_empty_resume, parse_raw_text_to_structured


# ── Helpers & fixtures ────────────────────────────────────────────────────────

def _make_uuid() -> str:
    return str(uuid.uuid4())


_SAMPLE_LLM_RESPONSE: dict = {
    "basics": {
        "name": "Jane Doe",
        "title": "Senior Software Engineer",
        "email": "jane@example.com",
        "phone": "+1-555-0100",
        "location": "San Francisco, CA",
        "linkedin": "https://linkedin.com/in/janedoe",
        "github": "https://github.com/janedoe",
        "portfolio": None,
        "summary": "Results-driven engineer with 6 years of experience building scalable APIs.",
    },
    "experience": [
        {
            "id": _make_uuid(),
            "company": "Acme Corp",
            "role": "Senior Software Engineer",
            "location": "San Francisco, CA",
            "start_date": "Jan 2021",
            "end_date": "Present",
            "current": True,
            "bullets": [
                {"id": _make_uuid(), "text": "Architected microservices platform serving 5M requests/day"},
                {"id": _make_uuid(), "text": "Led team of 4 engineers, reducing deploy time by 60%"},
            ],
        }
    ],
    "education": [
        {
            "id": _make_uuid(),
            "institution": "State University",
            "degree": "B.S.",
            "field_of_study": "Computer Science",
            "location": "Austin, TX",
            "start_date": "2015",
            "end_date": "2019",
            "gpa": "3.8",
            "bullets": [],
        }
    ],
    "skills": [
        {"id": _make_uuid(), "category": "Languages", "items": ["Python", "Go", "TypeScript"]},
        {"id": _make_uuid(), "category": "Frameworks", "items": ["FastAPI", "React", "gRPC"]},
    ],
    "projects": [
        {
            "id": _make_uuid(),
            "name": "OpenTrace",
            "description": "Distributed tracing library",
            "link": "https://github.com/janedoe/opentrace",
            "technologies": ["Python", "OpenTelemetry"],
            "bullets": [
                {"id": _make_uuid(), "text": "Open-sourced to 400+ GitHub stars"},
            ],
        }
    ],
    "certifications": [
        {
            "id": _make_uuid(),
            "name": "AWS Solutions Architect",
            "issuer": "Amazon Web Services",
            "date": "March 2022",
            "url": "https://aws.amazon.com/certification",
        }
    ],
    "meta": {
        "template_id": "classic",
        "font_size": "medium",
        "margins": "normal",
        "section_order": ["summary", "experience", "education", "skills", "projects", "certifications"],
    },
}

_SAMPLE_RAW_TEXT = """
Jane Doe | jane@example.com | +1-555-0100 | San Francisco, CA

SUMMARY
Results-driven engineer with 6 years of experience building scalable APIs.

EXPERIENCE
Senior Software Engineer — Acme Corp, San Francisco, CA (Jan 2021 – Present)
• Architected microservices platform serving 5M requests/day
• Led team of 4 engineers, reducing deploy time by 60%

EDUCATION
State University — B.S. Computer Science (2015 – 2019) GPA: 3.8

SKILLS
Languages: Python, Go, TypeScript
Frameworks: FastAPI, React, gRPC

PROJECTS
OpenTrace — https://github.com/janedoe/opentrace
• Open-sourced to 400+ GitHub stars

CERTIFICATIONS
AWS Solutions Architect — Amazon Web Services, March 2022
"""


# ── Test Class 1: Successful parsing ─────────────────────────────────────────

class TestSuccessfulParsing:
    @pytest.mark.asyncio
    async def test_returns_valid_structured_resume_on_good_llm_response(self):
        """When Groq returns valid JSON, parse_raw_text_to_structured returns a
        schema-valid dict with correct field values."""
        mock_response = json.dumps(_SAMPLE_LLM_RESPONSE)

        with patch(
            "app.services.resume_parser.chat_complete",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result = await parse_raw_text_to_structured(_SAMPLE_RAW_TEXT)

        # Must be a valid StructuredResume (no validation error)
        doc = StructuredResume.model_validate(result)

        assert doc.basics.name == "Jane Doe"
        assert doc.basics.email == "jane@example.com"
        assert doc.basics.title == "Senior Software Engineer"

    @pytest.mark.asyncio
    async def test_experience_bullets_preserved(self):
        """Bullet text from LLM response is preserved verbatim."""
        with patch(
            "app.services.resume_parser.chat_complete",
            new_callable=AsyncMock,
            return_value=json.dumps(_SAMPLE_LLM_RESPONSE),
        ):
            result = await parse_raw_text_to_structured(_SAMPLE_RAW_TEXT)

        doc = StructuredResume.model_validate(result)
        assert len(doc.experience) == 1
        exp = doc.experience[0]
        assert exp.company == "Acme Corp"
        assert exp.current is True
        assert any("5M requests" in b.text for b in exp.bullets)

    @pytest.mark.asyncio
    async def test_section_order_validated_and_defaults_filled(self):
        """Unknown section keys are stripped and missing known sections appended."""
        partial_meta = {**_SAMPLE_LLM_RESPONSE, "meta": {
            "template_id": "modern",
            "font_size": "compact",
            "margins": "normal",
            "section_order": ["experience", "unknown_section"],  # invalid key included
        }}
        with patch(
            "app.services.resume_parser.chat_complete",
            new_callable=AsyncMock,
            return_value=json.dumps(partial_meta),
        ):
            result = await parse_raw_text_to_structured(_SAMPLE_RAW_TEXT)

        doc = StructuredResume.model_validate(result)
        assert "unknown_section" not in doc.meta.section_order
        assert "summary" in doc.meta.section_order  # appended as missing
        assert doc.meta.template_id == "modern"

    @pytest.mark.asyncio
    async def test_certifications_parsed(self):
        """Certifications section is present and correctly mapped."""
        with patch(
            "app.services.resume_parser.chat_complete",
            new_callable=AsyncMock,
            return_value=json.dumps(_SAMPLE_LLM_RESPONSE),
        ):
            result = await parse_raw_text_to_structured(_SAMPLE_RAW_TEXT)

        doc = StructuredResume.model_validate(result)
        assert len(doc.certifications) == 1
        assert doc.certifications[0].name == "AWS Solutions Architect"
        assert doc.certifications[0].issuer == "Amazon Web Services"


# ── Test Class 2: Malformed / partial LLM output ─────────────────────────────

class TestMalformedLlmOutput:
    @pytest.mark.asyncio
    async def test_falls_back_to_empty_resume_on_json_decode_error(self):
        """If LLM returns syntactically invalid JSON, return an empty-but-valid schema."""
        with patch(
            "app.services.resume_parser.chat_complete",
            new_callable=AsyncMock,
            return_value="This is not JSON at all { broken",
        ):
            result = await parse_raw_text_to_structured(_SAMPLE_RAW_TEXT)

        # Must still be schema-valid
        doc = StructuredResume.model_validate(result)
        assert doc.basics.name == ""  # empty fallback
        assert isinstance(doc.experience, list)

    @pytest.mark.asyncio
    async def test_partial_json_experience_only_still_validates(self):
        """If LLM returns a partial object (only experience), Pydantic fills defaults."""
        partial = {"experience": _SAMPLE_LLM_RESPONSE["experience"]}
        with patch(
            "app.services.resume_parser.chat_complete",
            new_callable=AsyncMock,
            return_value=json.dumps(partial),
        ):
            result = await parse_raw_text_to_structured(_SAMPLE_RAW_TEXT)

        doc = StructuredResume.model_validate(result)
        assert isinstance(doc.basics, type(doc.basics))
        assert doc.basics.name == ""   # default filled in
        assert isinstance(doc.experience, list)

    @pytest.mark.asyncio
    async def test_empty_json_object_returns_empty_resume(self):
        """LLM returns {} — should return a fully defaulted empty schema."""
        with patch(
            "app.services.resume_parser.chat_complete",
            new_callable=AsyncMock,
            return_value="{}",
        ):
            result = await parse_raw_text_to_structured(_SAMPLE_RAW_TEXT)

        doc = StructuredResume.model_validate(result)
        assert doc.basics.name == ""
        assert doc.experience == []
        assert doc.skills == []


# ── Test Class 3: LLM / network exceptions ───────────────────────────────────

class TestLlmExceptions:
    @pytest.mark.asyncio
    async def test_network_exception_returns_empty_resume(self):
        """If Groq raises a connection error, return an empty-but-valid schema without crashing."""
        with patch(
            "app.services.resume_parser.chat_complete",
            new_callable=AsyncMock,
            side_effect=ConnectionError("Network unreachable"),
        ):
            result = await parse_raw_text_to_structured(_SAMPLE_RAW_TEXT)

        doc = StructuredResume.model_validate(result)
        assert doc.basics.name == ""

    @pytest.mark.asyncio
    async def test_rate_limit_exception_returns_empty_resume(self):
        """429 rate limit error (after retries exhausted) gracefully returns empty schema."""
        with patch(
            "app.services.resume_parser.chat_complete",
            new_callable=AsyncMock,
            side_effect=Exception("Rate limit exceeded — 429 TPM"),
        ):
            # with_ai_retry will retry then raise — parser catches and returns empty
            result = await parse_raw_text_to_structured(_SAMPLE_RAW_TEXT)

        doc = StructuredResume.model_validate(result)
        assert isinstance(doc.experience, list)

    @pytest.mark.asyncio
    async def test_timeout_exception_returns_empty_resume(self):
        """Groq timeout returns an empty-but-valid schema."""
        with patch(
            "app.services.resume_parser.chat_complete",
            new_callable=AsyncMock,
            side_effect=TimeoutError("Request timed out"),
        ):
            result = await parse_raw_text_to_structured(_SAMPLE_RAW_TEXT)

        doc = StructuredResume.model_validate(result)
        assert doc.basics.name == ""


# ── Test Class 4: Edge inputs ─────────────────────────────────────────────────

class TestEdgeInputs:
    @pytest.mark.asyncio
    async def test_short_text_returns_empty_without_calling_llm(self):
        """Text shorter than 50 chars bypasses the LLM and returns an empty schema immediately."""
        with patch(
            "app.services.resume_parser.chat_complete",
            new_callable=AsyncMock,
        ) as mock_llm:
            result = await parse_raw_text_to_structured("Hi")
            mock_llm.assert_not_called()

        doc = StructuredResume.model_validate(result)
        assert doc.basics.name == ""

    @pytest.mark.asyncio
    async def test_none_input_returns_empty(self):
        """None as input returns an empty-but-valid schema without calling the LLM."""
        with patch(
            "app.services.resume_parser.chat_complete",
            new_callable=AsyncMock,
        ) as mock_llm:
            result = await parse_raw_text_to_structured(None)  # type: ignore[arg-type]
            mock_llm.assert_not_called()

        doc = StructuredResume.model_validate(result)
        assert doc.basics.name == ""

    @pytest.mark.asyncio
    async def test_empty_string_returns_empty(self):
        """Empty string returns an empty-but-valid schema."""
        with patch(
            "app.services.resume_parser.chat_complete",
            new_callable=AsyncMock,
        ) as mock_llm:
            result = await parse_raw_text_to_structured("")
            mock_llm.assert_not_called()

        doc = StructuredResume.model_validate(result)
        assert doc.basics.name == ""

    @pytest.mark.asyncio
    async def test_text_truncated_to_12000_chars(self):
        """Very long text is truncated to 12,000 chars before being sent to the LLM."""
        long_text = "A" * 50 + " " + ("B " * 10_000)  # well over 12k

        captured_messages: list = []

        async def capture_chat_complete(messages, **kwargs) -> str:
            captured_messages.extend(messages)
            return json.dumps(_SAMPLE_LLM_RESPONSE)

        with patch("app.services.resume_parser.chat_complete", side_effect=capture_chat_complete):
            await parse_raw_text_to_structured(long_text)

        user_message = next(m for m in captured_messages if m["role"] == "user")
        assert len(user_message["content"]) <= 12_000


# ── Test Class 5: create_empty_resume ────────────────────────────────────────

class TestCreateEmptyResume:
    def test_returns_schema_valid_dict(self):
        """create_empty_resume() always returns a dict that validates against StructuredResume."""
        result = create_empty_resume()
        doc = StructuredResume.model_validate(result)
        assert doc.basics.name == ""
        assert doc.experience == []
        assert doc.meta.template_id == "classic"

    def test_section_order_contains_all_known_sections(self):
        """All 6 canonical sections appear in default section_order."""
        result = create_empty_resume()
        doc = StructuredResume.model_validate(result)
        for sec in ("summary", "experience", "education", "skills", "projects", "certifications"):
            assert sec in doc.meta.section_order
