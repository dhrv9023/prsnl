"""
Phase 3: JD mode — embedding similarity (resume vs job description) → single 0–100 score.
Uses existing HuggingFace inference + cosine similarity from math_engine.
"""

from __future__ import annotations

import logging

from app.services.math_engine import ats_score, clean_text

logger = logging.getLogger(__name__)

# Keep inputs within typical transformer limits; API/model may still truncate further.
_MAX_RESUME_CHARS = 15_000
_MAX_JD_CHARS = 12_000


async def compute_jd_score(resume_text: str, job_description: str) -> int:
    r = clean_text(resume_text)[:_MAX_RESUME_CHARS]
    j = clean_text(job_description)[:_MAX_JD_CHARS]

    if not r or not j:
        logger.warning("JD score: empty resume or JD after clean/truncate")
        return 0

    result = await ats_score(r, j)
    if not isinstance(result, dict):
        return 0

    raw = result.get("score", 0)
    try:
        n = int(round(float(raw)))
    except (TypeError, ValueError):
        n = 0

    if result.get("warning"):
        logger.info("JD score warning: %s", result["warning"])

    return max(0, min(100, n))
