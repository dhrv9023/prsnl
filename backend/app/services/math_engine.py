# app/services/math_engine.py
import logging
import re

import numpy as np
from huggingface_hub import AsyncInferenceClient
from sklearn.metrics.pairwise import cosine_similarity

from app.core.config import settings

logger = logging.getLogger(__name__)
client = AsyncInferenceClient(api_key=settings.HUGGINGFACE_API_KEY)


def clean_text(text: str) -> str:
    """Removes PDF artifacts and non-ASCII symbols to prevent AI confusion."""
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


async def get_embedding(text: str):
    """Uses the HuggingFace Inference API to get sentence embeddings."""
    try:
        response = await client.feature_extraction(
            text,
            model="sentence-transformers/all-mpnet-base-v2"
        )
        return response
    except Exception as e:
        logger.error("Embedding API error: %s", e)
        return None


def _general_resume_score(resume_text: str) -> dict:
    """
    Rule-based resume quality score when no JD is provided.
    Evaluates the resume on its own merit across 6 dimensions.
    Returns a score 0–100 with a breakdown.

    Dimensions:
    1. Length / content density  (is there enough content?)
    2. Quantification            (numbers, metrics, percentages)
    3. Action verbs              (built, led, designed, improved…)
    4. Section coverage          (experience, skills, education, projects)
    5. Contact info              (email, phone, LinkedIn/GitHub)
    6. Formatting signals        (bullet points, consistent structure)
    """
    text = resume_text.lower()
    word_count = len(resume_text.split())

    # 1. Content density (0–20 pts)
    if word_count >= 400:
        density_score = 20
    elif word_count >= 250:
        density_score = 15
    elif word_count >= 150:
        density_score = 10
    else:
        density_score = 5

    # 2. Quantification — numbers, %, $, K, M (0–20 pts)
    quant_matches = len(re.findall(
        r'\b\d+[\.,]?\d*\s*(%|percent|k\b|m\b|million|billion|users|customers|'
        r'requests|ms|seconds|hours|days|weeks|months|years|x\b|times|'
        r'members|employees|projects|features|bugs|issues|tickets)\b',
        text
    ))
    quant_score = min(20, quant_matches * 4)

    # 3. Action verbs (0–20 pts)
    action_verbs = [
        'built', 'developed', 'designed', 'implemented', 'led', 'managed',
        'created', 'improved', 'optimized', 'reduced', 'increased', 'launched',
        'deployed', 'architected', 'engineered', 'automated', 'integrated',
        'delivered', 'collaborated', 'mentored', 'scaled', 'migrated',
        'refactored', 'shipped', 'owned', 'drove', 'spearheaded', 'established',
        'streamlined', 'accelerated', 'achieved', 'contributed', 'maintained',
    ]
    verb_hits = sum(1 for v in action_verbs if v in text)
    verb_score = min(20, verb_hits * 2)

    # 4. Section coverage (0–20 pts)
    sections = {
        'experience': ['experience', 'work history', 'employment', 'positions held'],
        'skills':     ['skills', 'technologies', 'tech stack', 'tools', 'languages'],
        'education':  ['education', 'degree', 'university', 'college', 'bachelor', 'master', 'b.tech', 'm.tech', 'b.e', 'm.e'],
        'projects':   ['projects', 'portfolio', 'side projects', 'personal projects', 'open source'],
    }
    section_hits = sum(
        1 for keywords in sections.values()
        if any(kw in text for kw in keywords)
    )
    section_score = section_hits * 5  # 5 pts per section, max 20

    # 5. Contact info (0–10 pts)
    has_email = bool(re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', resume_text))
    has_phone = bool(re.search(r'(\+?\d[\d\s\-().]{7,}\d)', resume_text))
    has_profile = bool(re.search(r'(linkedin|github|gitlab|portfolio|behance)', text))
    contact_score = (5 if has_email else 0) + (3 if has_phone else 0) + (2 if has_profile else 0)

    # 6. Formatting signals (0–10 pts)
    bullet_count = resume_text.count('•') + resume_text.count('·') + resume_text.count('-') + resume_text.count('*')
    formatting_score = min(10, bullet_count // 3)

    total = density_score + quant_score + verb_score + section_score + contact_score + formatting_score
    total = max(0, min(100, total))

    return {
        "score": total,
        "raw_similarity": None,
        "mode": "general",
        "breakdown": {
            "content_density": density_score,
            "quantification": quant_score,
            "action_verbs": verb_score,
            "section_coverage": section_score,
            "contact_info": contact_score,
            "formatting": formatting_score,
        },
        "note": "General resume quality score (no job description provided). Add a JD for a targeted ATS match score."
    }


async def ats_score(resume_text: str, job_description: str | None) -> dict:
    """
    Calculates ATS score.

    - With JD: cosine similarity between resume and JD embeddings (semantic match).
    - Without JD: rule-based general resume quality score across 6 dimensions.

    Returns dict with at minimum: { score: int, raw_similarity: float|None }
    """
    cleaned_resume = clean_text(resume_text)

    if not cleaned_resume:
        return {"score": 0, "raw_similarity": 0.0, "warning": "Empty resume text"}

    # ── No JD: use rule-based general scorer ──────────────────────────────────
    if not job_description or not job_description.strip():
        return _general_resume_score(cleaned_resume)

    # ── With JD: semantic similarity via embeddings ───────────────────────────
    cleaned_jd = clean_text(job_description)

    resume_vec = await get_embedding(cleaned_resume)
    jd_vec = await get_embedding(cleaned_jd)

    if resume_vec is None or jd_vec is None:
        # Embedding API unavailable — fall back to general scorer
        logger.warning("Embedding API unavailable, falling back to general scorer")
        result = _general_resume_score(cleaned_resume)
        result["warning"] = "AI embedding service unavailable — showing general score instead"
        return result

    try:
        vec_a = np.array(resume_vec).reshape(1, -1)
        vec_b = np.array(jd_vec).reshape(1, -1)
        similarity = cosine_similarity(vec_a, vec_b)[0][0]

        # Raw cosine similarity for text embeddings typically falls in 0.2–0.7.
        # Mapping it linearly to 0–100 produces scores that feel too low.
        # We rescale the realistic range [0.25, 0.70] to [25, 95]:
        #   cosine 0.40 → ~48,  0.50 → ~64,  0.60 → ~79,  0.65 → ~87
        # This keeps the JD score honest (a poor match still scores low)
        # while avoiding the jarring 78→40 drop users see today.
        LOW, HIGH = 0.25, 0.70
        OUT_LOW, OUT_HIGH = 25, 95
        clamped = max(LOW, min(HIGH, float(similarity)))
        scaled = round(OUT_LOW + (clamped - LOW) / (HIGH - LOW) * (OUT_HIGH - OUT_LOW))

        return {
            "score": max(0, min(100, scaled)),
            "raw_similarity": float(similarity),
            "mode": "jd_match",
        }
    except Exception as e:
        logger.error("Math calculation error: %s", e)
        return {"score": 0, "raw_similarity": 0.0, "warning": "Math Error"}
