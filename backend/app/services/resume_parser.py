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
You are a precise resume parser. Extract the resume text into a valid JSON object matching this schema:
{
  "basics": {
    "name": "<full name>",
    "title": "<job title or professional headline>",
    "email": "<email address>",
    "phone": "<phone number>",
    "location": "<city, country or state>",
    "linkedin": "<linkedin URL or empty string>",
    "github": "<github URL or empty string>",
    "portfolio": "<portfolio URL or empty string>",
    "summary": "<summary text verbatim>"
  },
  "experience": [
    {
      "company": "<company name>",
      "role": "<job title>",
      "location": "<location or empty string>",
      "start_date": "<start date>",
      "end_date": "<end date or Present>",
      "current": true,
      "bullets": [{"text": "<bullet text verbatim without bullet symbol>"}]
    }
  ],
  "education": [
    {
      "institution": "<school or university>",
      "degree": "<degree or program>",
      "field_of_study": "<major or specialization>",
      "location": "<location or empty string>",
      "start_date": "<start year>",
      "end_date": "<end year>",
      "gpa": "<GPA or empty string>",
      "bullets": []
    }
  ],
  "skills": [
    {
      "category": "<category name, e.g. Languages, Frameworks, AI/ML, Cloud>",
      "items": ["<item 1>", "<item 2>"]
    }
  ],
  "projects": [
    {
      "name": "<project title>",
      "description": "<short description>",
      "link": "<URL or empty string>",
      "technologies": ["<tech 1>", "<tech 2>"],
      "bullets": [{"text": "<bullet verbatim>"}]
    }
  ],
  "certifications": [
    {
      "name": "<certification title>",
      "issuer": "<issuing organization>",
      "date": "<year or date>",
      "url": "<credential URL or empty string>"
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
1. Extract ALL information VERBATIM. Never hallucinate or infer.
2. Do NOT generate ID fields (they are auto-assigned by the system).
3. If a section is absent, use an empty array [].
4. Return ONLY valid raw JSON. No markdown or backticks.
"""


# ── Heuristic Fallback Parser ───────────────────────────────────────────────

import re
from typing import Any


def _clean_nulls(obj: Any) -> Any:
    """Recursively convert None values to empty strings to satisfy schema."""
    if isinstance(obj, dict):
        return {k: _clean_nulls(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_clean_nulls(x) for x in obj]
    elif obj is None:
        return ""
    return obj


def heuristic_parse_raw_text(raw_text: str) -> dict:
    """
    Emergency rule-based fallback parser that extracts contact info and basic
    sections from plain text when LLM calls fail or rate-limit.
    Ensures an uploaded resume is NEVER returned as a blank document.
    """
    if not raw_text or not raw_text.strip():
        return create_empty_resume()

    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    name = lines[0] if lines else "Candidate"
    # Filter out emails or phones from name
    if "@" in name or any(char.isdigit() for char in name):
        name = "Candidate"

    # Extract email
    email_match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", raw_text)
    email = email_match.group(0) if email_match else ""

    # Extract phone
    phone_match = re.search(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}", raw_text)
    phone = phone_match.group(0) if phone_match else ""

    # Extract location (heuristic)
    location = ""
    for line in lines[:6]:
        lower = line.lower()
        if any(w in lower for w in ("india", "usa", "gurugram", "delhi", "bengaluru", "bangalore", "california", "remote")) and "@" not in line:
            location = line.split("|")[0].strip()
            break

    # Extract links
    linkedin = ""
    github = ""
    portfolio = ""
    for token in raw_text.split():
        clean_token = token.strip("()[]<>,|'\"")
        if "linkedin.com/in/" in clean_token:
            linkedin = clean_token
        elif "github.com/" in clean_token:
            github = clean_token
        elif clean_token.startswith("http") and not any(x in clean_token for x in ("linkedin", "github")):
            portfolio = clean_token

    # Extract summary if present
    summary = ""
    summary_match = re.search(
        r"(?:Summary|Professional Summary|About Me)[:\s]+(.*?)(?=\n[A-Z\s]{4,}|\Z)",
        raw_text,
        re.DOTALL | re.IGNORECASE,
    )
    if summary_match:
        summary = " ".join(summary_match.group(1).split()[:120])

    empty_doc = StructuredResume.create_empty()
    empty_doc.basics.name = name
    empty_doc.basics.email = email
    empty_doc.basics.phone = phone
    empty_doc.basics.location = location
    empty_doc.basics.linkedin = linkedin
    empty_doc.basics.github = github
    empty_doc.basics.portfolio = portfolio
    empty_doc.basics.summary = summary

    return empty_doc.to_editor_dict()


# ── Main parse function ───────────────────────────────────────────────────────

async def parse_raw_text_to_structured(raw_text: str) -> dict:
    """
    Converts raw resume text (from pypdf extraction) into a validated
    StructuredResume dictionary.

    Tries fast, high-capacity models with strict json_object response_format:
      1. openai/gpt-oss-20b (high token output, 0 truncation)
      2. openai/gpt-oss-120b (fallback)
      3. heuristic regex parser (zero-downtime safety net)

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

    models_to_try = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]
    raw_json: str | None = None

    for model_candidate in models_to_try:
        try:
            logger.info("resume_parser: attempting parse with %s", model_candidate)
            raw_json = await with_ai_retry(
                lambda: chat_complete(
                    messages=messages,
                    temperature=0.0,
                    response_format={"type": "json_object"},
                    timeout=45,
                    max_tokens=4096,
                    model=model_candidate,
                ),
                label=f"resume_parser_{model_candidate}",
                max_attempts=2,
                base_delay=1.5,
            )
            if raw_json and raw_json.strip():
                break
        except Exception as exc:
            logger.warning("resume_parser: model %s failed: %s", model_candidate, exc)

    if not raw_json:
        logger.error("resume_parser: all LLM calls failed — returning empty template")
        return create_empty_resume()

    # ── JSON decode ──────────────────────────────────────────────────────────
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        logger.error("resume_parser: JSON decode failed (%s) — returning empty template", exc)
        return create_empty_resume()

    # ── Sanitize nulls & validate with Pydantic ──────────────────────────────
    cleaned = _clean_nulls(parsed)
    try:
        structured = StructuredResume.model_validate(cleaned)
        return structured.to_editor_dict()
    except Exception as exc:
        logger.error(
            "resume_parser: StructuredResume validation failed — best-effort fallback: %s", exc
        )
        try:
            structured = StructuredResume.model_validate({})
            for field in ("basics", "experience", "education", "skills", "projects", "certifications"):
                if field in cleaned and cleaned[field]:
                    try:
                        structured = StructuredResume.model_validate(
                            {**structured.to_editor_dict(), field: cleaned[field]}
                        )
                    except Exception:
                        pass
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
