"""
Shared LLM client — uses Groq for all chat completions (fast, free).
Groq Whisper is also used for voice transcription in interview.py.

Primary model: groq/compound-mini
  - Supports response_format={"type": "json_object"} natively
  - ~1-3s latency, no OTPM limit issues on free tier
  - Replaces broken openai/gpt-oss-20b (HTTP 400 on all JSON-mode requests)

Fallback model: groq/compound
  - Used automatically if primary model fails JSON validation
  - Higher quality responses, also supports JSON mode
"""
import re
import logging

from groq import AsyncGroq
from app.core.config import settings

logger = logging.getLogger(__name__)

# Single shared async Groq client
_groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

# Primary model — supports json_object response_format natively
GROQ_CHAT_MODEL = getattr(settings, "GROQ_CHAT_MODEL", "groq/compound-mini")

# Fallback model — higher quality, used when primary fails JSON validation
GROQ_FALLBACK_MODEL = getattr(settings, "GROQ_FALLBACK_MODEL", "groq/compound")


def _strip_code_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers the model may add."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _strip_think_tags(text: str) -> str:
    """Remove <think>...</think> reasoning blocks from models like Qwen3."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def _clean_response(text: str) -> str:
    """Full response cleanup: strip think tags then code fences."""
    text = _strip_think_tags(text)
    text = _strip_code_fences(text)
    return text


async def chat_complete(
    messages: list,
    temperature: float = 0.3,
    response_format: dict | None = None,
    timeout: int = 60,
    max_tokens: int | None = None,
    model: str | None = None,
) -> str:
    """
    Call Groq chat completions and return the raw content string.
    Supports response_format={"type": "json_object"} natively.

    If the primary model fails JSON validation (HTTP 400 json_validate_failed),
    automatically retries with the fallback model (groq/compound-mini).
    """
    primary_model = model or GROQ_CHAT_MODEL

    kwargs: dict = {
        "model": primary_model,
        "messages": messages,
        "temperature": temperature,
        "timeout": timeout,
        "stream": False,
    }
    if response_format:
        kwargs["response_format"] = response_format
    if max_tokens:
        kwargs["max_tokens"] = max_tokens

    try:
        completion = await _groq_client.chat.completions.create(**kwargs)
        content = completion.choices[0].message.content or ""
        return _clean_response(content)

    except Exception as primary_exc:
        # If JSON validation failed on the primary model, retry with fallback
        err_str = str(primary_exc).lower()
        is_json_fail = "json_validate_failed" in err_str or "failed to validate json" in err_str or "failed to generate json" in err_str

        if is_json_fail and response_format and primary_model != GROQ_FALLBACK_MODEL:
            logger.warning(
                "Primary model '%s' failed JSON validation — retrying with fallback '%s': %s",
                primary_model, GROQ_FALLBACK_MODEL, primary_exc
            )
            fallback_kwargs = {**kwargs, "model": GROQ_FALLBACK_MODEL}
            try:
                completion = await _groq_client.chat.completions.create(**fallback_kwargs)
                content = completion.choices[0].message.content or ""
                logger.info("Fallback model '%s' succeeded", GROQ_FALLBACK_MODEL)
                return _clean_response(content)
            except Exception as fallback_exc:
                logger.error(
                    "Fallback model '%s' also failed: %s",
                    GROQ_FALLBACK_MODEL, fallback_exc
                )
                raise fallback_exc

        # Re-raise original exception for non-JSON-mode failures
        raise primary_exc
