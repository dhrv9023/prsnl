# app/api/v1/endpoints/utils.py
"""
Utility endpoints — Hinglish conversion, etc.
"""
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.api.dependencies import CurrentUser
from app.core.rate_limit import limiter, ats_rate_key
from app.services.prompt_sanitizer import sanitize_user_text
from groq import AsyncGroq
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()
client = AsyncGroq(api_key=settings.GROQ_API_KEY)


class HinglishRequest(BaseModel):
    text: str


@router.post("/hinglish")
@limiter.limit("20/hour", key_func=ats_rate_key)
async def convert_to_hinglish(request: Request, body: HinglishRequest, user: CurrentUser):
    """
    Converts English career/resume text to Hinglish (Hindi + English in Roman script).
    Free feature — no credit deduction. Rate limited to 20/hour.
    """
    if not body.text or len(body.text.strip()) < 10:
        raise HTTPException(400, "Text is too short to convert.")
    if len(body.text) > 3000:
        raise HTTPException(400, "Text too long. Please convert smaller sections.")

    prompt = f"""You are a Hinglish translator for Indian users. Convert the following English career/resume analysis text into natural Hinglish (Hindi + English mixed, written in Roman/Latin script — NOT Devanagari).

Rules:
- Keep technical terms, skill names, company names, and proper nouns in English
- Convert explanations, feedback, and descriptive sentences to Hinglish
- Sound natural and conversational, like how educated Indians actually speak
- Do NOT use Devanagari script — only Roman script
- Keep the same meaning and all key information
- Keep the same structure (paragraphs, bullet points, etc.)

Example:
English: "Your resume lacks quantifiable achievements. Add metrics to your projects."
Hinglish: "Tera resume mein quantifiable achievements nahi hain. Apne projects mein metrics add kar."

TEXT TO CONVERT:
{sanitize_user_text(body.text[:3000])}

Output ONLY the converted Hinglish text, nothing else."""

    try:
        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            timeout=20,
        )
        hinglish_text = completion.choices[0].message.content.strip()
        return {"hinglish_text": hinglish_text}
    except Exception as e:
        logger.error("Hinglish conversion failed: %s", e)
        raise HTTPException(502, "Conversion failed. Please try again.")
