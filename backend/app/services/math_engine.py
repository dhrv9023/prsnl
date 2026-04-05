from app.core.config import settings
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import re
# import requests
from huggingface_hub import AsyncInferenceClient


client = AsyncInferenceClient(api_key=settings.HUGGINGFACE_API_KEY)


def clean_text(text: str) -> str:
    """
    Removes PDF artifacts and weird symbols to prevent AI confusion.
    """
    # Remove all non ascii characters
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)
    # Replace multiple newlines/spaces with single space
    text = re.sub(r'\s+', ' ', text)
    return text


async def get_embedding(text: str):
    """
    Uses the Official SDK to get embeddings.
    Auto-waits for model loading.
    """
    try:
        # We use the specific sentence-transformer model
        response = await client.feature_extraction(
            text,
            model="sentence-transformers/all-mpnet-base-v2"
        )
        return response
    except Exception as e:
        print(f"AI Error: {e}")
        return None


async def ats_score(resume_text: str, job_description: str) -> dict:
    # 1. Clean Inputs
    cleaned_resume = clean_text(resume_text)
    cleaned_jd = clean_text(job_description)

    if not cleaned_resume or not cleaned_jd:
        return {"score": 0, "raw_similarity": 0.0, "warning": "Empty inputs"}

    # 2. Get Vectors
    resume_vec = await get_embedding(cleaned_resume)
    jd_vec = await get_embedding(cleaned_jd)

    if resume_vec is None or jd_vec is None:
        return {"score": 0, "raw_similarity": 0.0, "warning": "AI Service Unavailable"}

    # 3. Math Conversion
    # The SDK returns a numpy array directly, but sometimes it's nested
    try:
        vec_a = np.array(resume_vec).reshape(1, -1)
        vec_b = np.array(jd_vec).reshape(1, -1)

        # 4. Cosine Similarity
        similarity = cosine_similarity(vec_a, vec_b)[0][0]

        return {
            "score": round(similarity * 100),
            "raw_similarity": float(similarity)
        }
    except Exception as e:
        print(f"Math Calculation Error: {e}")
        return {"score": 0, "raw_similarity": 0.0, "warning": "Math Error"}
