"""
Shared LLM client — uses Groq for all chat completions (fast, free).
Groq Whisper is also used for voice transcription in interview.py.

Primary model: openai/gpt-oss-120b
  - Supports response_format={"type": "json_object"} natively
  - High-capacity 120B model, 131K context window, 100% free on GroqCloud

Fallback model: openai/gpt-oss-20b
  - High-throughput secondary model, 131K context window, 100% free
"""
import re
import logging

from groq import AsyncGroq
from app.core.config import settings

logger = logging.getLogger(__name__)

# Single shared async Groq client
_groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

# Primary model — fast, lightweight 20B model on Groq (sub-second latency, 100% free)
GROQ_CHAT_MODEL = getattr(settings, "GROQ_CHAT_MODEL", "openai/gpt-oss-20b")

# Fallback model — 120B model for complex multi-section JSON
GROQ_FALLBACK_MODEL = getattr(settings, "GROQ_FALLBACK_MODEL", "openai/gpt-oss-120b")


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

    If the primary model fails JSON validation or model errors,
    automatically retries with the fallback model.
    """
    primary_model = model or GROQ_CHAT_MODEL

    # For reasoning models (e.g. gpt-oss-20b / gpt-oss-120b), token budget is shared
    # between internal reasoning and final content. A very small max_tokens (<300)
    # gets entirely consumed by reasoning, causing finish_reason='length' and empty content.
    effective_max_tokens = max_tokens
    if effective_max_tokens is not None and effective_max_tokens < 300:
        effective_max_tokens = 300

    kwargs: dict = {
        "model": primary_model,
        "messages": messages,
        "temperature": temperature,
        "timeout": timeout,
        "stream": False,
    }
    # Enforce low reasoning effort on reasoning models for sub-second / fast latency
    if "gpt-oss" in primary_model:
        kwargs["reasoning_effort"] = "low"
    if response_format:
        kwargs["response_format"] = response_format
    if effective_max_tokens:
        kwargs["max_tokens"] = effective_max_tokens

    try:
        completion = await _groq_client.chat.completions.create(**kwargs)
        content = completion.choices[0].message.content or ""
        # If content is empty because reasoning consumed all tokens or finish_reason was length
        if not content.strip() and completion.choices[0].finish_reason == "length":
            logger.warning(
                "Model '%s' hit length limit with empty content (reasoning exhausted tokens). Triggering fallback.",
                primary_model,
            )
            raise ValueError(f"Model {primary_model} returned empty content due to token length limit.")
        return _clean_response(content)

    except Exception as primary_exc:
        # If JSON validation or model error occurred on the primary model, retry with fallback
        err_str = str(primary_exc).lower()
        is_fallback_candidate = (
            "json_validate_failed" in err_str
            or "failed to validate json" in err_str
            or "failed to generate json" in err_str
            or "model_not_found" in err_str
            or "does not exist" in err_str
            or "empty content" in err_str
        )

        fallback_model = GROQ_FALLBACK_MODEL
        if is_fallback_candidate and primary_model != fallback_model:
            logger.warning(
                "Primary model '%s' failed (%s) — retrying with fallback '%s': %s",
                primary_model, type(primary_exc).__name__, fallback_model, primary_exc
            )
            fallback_kwargs = {**kwargs, "model": fallback_model}
            if "gpt-oss" in fallback_model:
                fallback_kwargs["reasoning_effort"] = "low"
            if effective_max_tokens:
                fallback_kwargs["max_tokens"] = effective_max_tokens
            try:
                completion = await _groq_client.chat.completions.create(**fallback_kwargs)
                content = completion.choices[0].message.content or ""
                logger.info("Fallback model '%s' succeeded", fallback_model)
                return _clean_response(content)
            except Exception as fallback_exc:
                logger.error(
                    "Fallback model '%s' also failed: %s",
                    fallback_model, fallback_exc
                )
                raise fallback_exc

        # Re-raise original exception for other failures
        raise primary_exc
