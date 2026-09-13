# backend/app/services/resume_parser.py
"""
Resume Parser Service — Kareerist Resume Editor (Phase 2).

Converts unstructured resume text (extracted from an uploaded PDF via pypdf)
into a validated StructuredResume JSON document using Groq compound-mini in
strict json_object mode.

Public API:
    parse_raw_text_to_structured(raw_text: str) -> dict
    create_empty_resume() -> dict

Called exclusively from:
    GET /api/v1/resumes/{resume_id}/editor  (lazy, on-demand, once per resume)
"""

from __future__ import annotations

import json
import logging

from app.schemas.resume_editor import StructuredResume
from app.services.ai_retry import with_ai_retry
from app.services.llm_client import chat_complete

logger = logging.getLogger(__name__)


# ── Prompt ────────────────────────────────────────────────────────────────────

_PARSER_SYSTEM_PROMPT = """\
You are a precise resume data extraction engine.

Extract the information from the resume text below into a valid JSON object that \
matches the schema shown. Preserve all dates, company names, job titles, and bullet \
points VERBATIM — do NOT paraphrase, invent, or infer any information that is not \
explicitly present in the text.

Return ONLY the JSON object. No markdown, no code fences, no explanation.

SCHEMA:
{
  "basics": {
    "name": "<full name>",
    "title": "<current/most recent job title or professional headline>",
    "email": "<email address or empty string>",
    "phone": "<phone number or empty string>",
    "location": "<city, state/country or empty string>",
    "linkedin": "<linkedin URL or null>",
    "github": "<github URL or null>",
    "portfolio": "<personal site/portfolio URL or null>",
    "summary": "<professional summary paragraph verbatim, or empty string>"
  },
  "experience": [
    {
      "id": "<generate a unique UUID string>",
      "company": "<company name>",
      "role": "<job title>",
      "location": "<city, country or null>",
      "start_date": "<month year or year>",
      "end_date": "<month year, year, or 'Present'>",
      "current": <true if still employed here, else false>,
      "bullets": [
        {"id": "<unique UUID>", "text": "<bullet text verbatim, without leading •/-/*>"}
      ]
    }
  ],
  "education": [
    {
      "id": "<UUID>",
      "institution": "<school name>",
      "degree": "<degree type, e.g. B.Tech, B.S., M.S., Ph.D.>",
      "field_of_study": "<major/specialization or null>",
      "location": "<city, country or null>",
      "start_date": "<year or month year>",
      "end_date": "<year, month year, or 'Present'>",
      "gpa": "<GPA string or null>",
      "bullets": [
        {"id": "<UUID>", "text": "<coursework or achievement bullet>"}
      ]
    }
  ],
  "skills": [
    {
      "id": "<UUID>",
      "category": "<group label, e.g. Languages, Frameworks, Databases, Tools, Cloud>",
      "items": ["<skill1>", "<skill2>"]
    }
  ],
  "projects": [
    {
      "id": "<UUID>",
      "name": "<project title>",
      "description": "<one-line description or null>",
      "link": "<URL or null>",
      "technologies": ["<tech1>", "<tech2>"],
      "bullets": [
        {"id": "<UUID>", "text": "<achievement/description bullet verbatim>"}
      ]
    }
  ],
  "certifications": [
    {
      "id": "<UUID>",
      "name": "<certification name>",
      "issuer": "<issuing organization>",
      "date": "<month year or year>",
      "url": "<credential URL or null>"
    }
  ],
  "meta": {
    "template_id": "classic",
    "font_size": "medium",
    "margins": "normal",
    "section_order": ["summary", "experience", "education", "skills", "projects", "certifications"]
  }
}

RULES:
1. Extract ONLY what is in the resume. Never hallucinate or fill in missing details.
2. Generate a valid UUID4 string for every "id" field.
3. If a section is absent from the resume, use an empty array [].
4. Strip leading bullet symbols (•, -, *, ▪) from bullet text — store the clean text only.
5. If a skills section lists items without category headers, use "General" as the category.
6. Return ONLY the raw JSON object. No surrounding markdown or explanation.
"""


# ── Main parse function ───────────────────────────────────────────────────────

async def parse_raw_text_to_structured(raw_text: str) -> dict:
    """
    Converts raw resume text (from pypdf extraction) into a validated
    StructuredResume dictionary.

    Calls Groq compound-mini with strict json_object response_format and
    validates the output against the StructuredResume Pydantic model.

    On failure (Groq error, malformed JSON, or validation error), logs the
    error and returns a partially-initialised schema so the editor still opens.

    Args:
        raw_text: Plain text extracted from the candidate's uploaded PDF.

    Returns:
        A dict matching the StructuredResume schema, ready for JSONB storage.
    """
    if not raw_text or len(raw_text.strip()) < 50:
        logger.warning(
            "resume_parser: raw_text too short (%d chars) — returning empty template",
            len((raw_text or "").strip()),
        )
        return create_empty_resume()


    messages = [
        {"role": "system", "content": _PARSER_SYSTEM_PROMPT},
        {"role": "user", "content": raw_text[:12_000]},  # stay within context limits
    ]

    try:
        raw_json = await with_ai_retry(
            lambda: chat_complete(
                messages=messages,
                temperature=0.0,           # deterministic extraction, not creative
                response_format={"type": "json_object"},
                timeout=45,
                max_tokens=4096,
            ),
            label="resume_parser",
            max_attempts=3,
            base_delay=2.0,
        )
    except Exception as exc:
        logger.error("resume_parser: Groq call failed — returning empty template: %s", exc)
        return create_empty_resume()

    # ── JSON decode ──────────────────────────────────────────────────────────
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        logger.error("resume_parser: JSON decode failed — returning empty template: %s", exc)
        return create_empty_resume()

    # ── Pydantic validation (normalises defaults, strips unknowns) ───────────
    try:
        structured = StructuredResume.model_validate(parsed)
        return structured.to_editor_dict()
    except Exception as exc:
        logger.error(
            "resume_parser: StructuredResume validation failed — best-effort fallback: %s", exc
        )
        # Best-effort: try to return what we have, letting Pydantic fill defaults
        try:
            structured = StructuredResume.model_validate({})
            # Merge whatever fields did parse successfully
            for field in ("basics", "experience", "education", "skills", "projects", "certifications"):
                if field in parsed and parsed[field]:
                    try:
                        structured = StructuredResume.model_validate(
                            {**structured.to_editor_dict(), field: parsed[field]}
                        )
                    except Exception:
                        pass  # Keep existing safe value for this field
            return structured.to_editor_dict()
        except Exception:
            return create_empty_resume()


# ── Empty template factory ────────────────────────────────────────────────────

def create_empty_resume() -> dict:
    """
    Returns a blank, schema-valid StructuredResume dictionary for the
    'create from scratch' flow, or as a safe fallback on parse failure.
    """
    return StructuredResume.create_empty().to_editor_dict()
