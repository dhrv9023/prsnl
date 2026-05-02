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
    return text


async def get_embedding(text: str):
    """
    Uses the Official SDK to get embeddings.
    Auto-waits for model loading.
    """
    try:
        response = await client.feature_extraction(
            text,
            model="sentence-transformers/all-mpnet-base-v2"
        )
        return response
    except Exception as e:
        logger.error("Embedding API error: %s", e)
        return None


async def ats_score(resume_text: str, job_description: str) -> dict:
    """
    Calculates ATS match score via cosine similarity between
    resume and job description embeddings.
    """
    cleaned_resume = clean_text(resume_text)
    cleaned_jd = clean_text(job_description)

    if not cleaned_resume or not cleaned_jd:
        return {"score": 0, "raw_similarity": 0.0, "warning": "Empty inputs"}

    resume_vec = await get_embedding(cleaned_resume)
    jd_vec = await get_embedding(cleaned_jd)

    if resume_vec is None or jd_vec is None:
        return {"score": 0, "raw_similarity": 0.0, "warning": "AI Service Unavailable"}

    try:
        vec_a = np.array(resume_vec).reshape(1, -1)
        vec_b = np.array(jd_vec).reshape(1, -1)
        similarity = cosine_similarity(vec_a, vec_b)[0][0]

        return {
            "score": round(similarity * 100),
            "raw_similarity": float(similarity)
        }
    except Exception as e:
        logger.error("Math calculation error: %s", e)
        return {"score": 0, "raw_similarity": 0.0, "warning": "Math Error"}
