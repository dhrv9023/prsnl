"""
Shared LLM client — uses Groq for all chat completions (fast, free).
Groq Whisper is also used for voice transcription in interview.py.

Switched back from OpenRouter because free OpenRouter models are slow
(shared infrastructure, rate-limited). Groq uses custom LPU hardware
and is significantly faster for the same models.
"""
import json
import re
import logging

from groq import AsyncGroq
from app.core.config import settings

logger = logging.getLogger(__name__)

# Single shared async Groq client
_groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

# Fast, capable model on Groq — free tier, 6000 req/day
GROQ_CHAT_MODEL = "llama-3.3-70b-versatile"


def _strip_code_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers the model may add."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


async def chat_complete(
    messages: list,
    temperature: float = 0.3,
    response_format: dict | None = None,
    timeout: int = 60,
) -> str:
    """
    Call Groq chat completions and return the raw content string.
    Supports response_format={"type": "json_object"} natively.
    """
    kwargs: dict = {
        "model": GROQ_CHAT_MODEL,
        "messages": messages,
        "temperature": temperature,
        "timeout": timeout,
        "stream": False,
    }
    if response_format:
        kwargs["response_format"] = response_format

    completion = await _groq_client.chat.completions.create(**kwargs)
    return completion.choices[0].message.content
