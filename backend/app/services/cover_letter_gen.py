# app/services/cover_letter_gen.py
import logging
import re

from groq import AsyncGroq
from app.core.config import settings
from app.services.resume_analyzer import clean_llm_answer

logger = logging.getLogger(__name__)
client = AsyncGroq(api_key=settings.GROQ_API_KEY)


async def cover_letter_generator(resume_text: str, job_description: str) -> str | None:
    """
    Generates a professional cover letter based on the resume and the JD.
    Returns the plain-text body of the letter, or None on failure.
    """

    prompt = """You are an expert writer specialized in crafting compelling cover letters that effectively highlight a candidate's qualification and aligns with the job description. Your task is to generate a professional cover letter based on the provided resume and job description.

    You must follow the following principles while generating the cover letter:
    1. Do not use placeholders like [Your Name], [Company Name] etc. Use proper names from the resume and the job description.
    2. The cover letter should be to the point and makes a positive impact on the recruiter, no more than 250 words.
    3. Focus on matching the resume to the JD requirements.
    4. Use a professional and formal tone suitable for job applications.
    5. Return ONLY the body of the letter. No "Here is your letter" chatter.
    6. START DIRECTLY with the greeting (e.g., "Dear Hiring Manager,"). Do NOT include the applicant's name, phone number, email, links, or address at the top of the letter.
    7. Generate plain text ONLY. Do NOT use any Markdown formatting, asterisks, or bold text for emphasis."""

    try:
        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Resume: {resume_text}\n\nJob Description: {job_description}"}
            ],
            temperature=0.4,
            stream=False
        )
        raw = completion.choices[0].message.content
        clean = clean_llm_answer(raw)

        # Remove think tags (useful if you ever switch to a reasoning model)
        clean = re.sub(r"<think>.*?</think>", "", clean, flags=re.DOTALL).strip()

        # Remove any stray markdown asterisks if the LLM ignores rule 7
        clean = clean.replace("*", "")

        if not clean or not clean.strip():
            raise ValueError("Empty cover letter generated.")

        return clean

    except Exception as e:
        logger.error("Cover letter generation failed: %s", e)
        return None
