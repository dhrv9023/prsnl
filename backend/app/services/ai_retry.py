# app/services/ai_retry.py
"""
Shared retry utility for transient AI API failures (Groq, HuggingFace).

Retries on:
- Network/connection errors
- HTTP 429 (rate limit) — with backoff
- HTTP 500/502/503 from the upstream AI provider

Does NOT retry on:
- HTTP 400 json_validate_failed — handled via automatic model fallback in llm_client.py
  (primary model qwen/qwen3.8-27b, fallback groq/compound-mini)
- HTTP 401 (auth failure — retrying won't help)
- JSON decode errors from valid responses (LLM returned garbage — retrying may help once)
"""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Callable, TypeVar, Awaitable

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Exceptions that indicate a transient failure worth retrying
_RETRYABLE_GROQ_MESSAGES = (
    "connection",
    "timeout",
    "rate_limit",
    "rate limit",
    "rate_limit_exceeded",
    "429",
    "tpm",
    "tokens per minute",
    "service_unavailable",
    "internal_server_error",
    "502",
    "503",
    "504",
)


def _is_retryable(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(kw in msg for kw in _RETRYABLE_GROQ_MESSAGES)


def _calculate_retry_delay(exc: Exception, attempt: int, base_delay: float) -> float:
    """
    Calculates retry delay, dynamically extracting wait times requested by Groq (e.g. 429 TPM reset).
    """
    msg = str(exc).lower()
    # Check if Groq specified an exact wait duration in the 429 message (e.g., "try again in 7.78s")
    if "429" in msg or "rate limit" in msg or "rate_limit" in msg or "tpm" in msg:
        match = re.search(r"try again in ([0-9.]+)s", msg)
        if match:
            try:
                wait_sec = float(match.group(1))
                return wait_sec + 1.0  # Buffer by 1s so token bucket has reset
            except ValueError:
                pass
        return max(8.0, base_delay * (2 ** (attempt - 1)))

    return base_delay * (2 ** (attempt - 1))


async def with_ai_retry(
    fn: Callable[[], Awaitable[T]],
    *,
    max_attempts: int = 3,
    base_delay: float = 1.5,
    label: str = "AI call",
) -> T:
    """
    Calls `fn()` up to `max_attempts` times with exponential backoff and rate-limit awareness.

    Usage:
        result = await with_ai_retry(
            lambda: client.chat.completions.create(...),
            label="deep_analysis"
        )
    """
    last_exc: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            return await fn()
        except Exception as exc:
            last_exc = exc
            if attempt == max_attempts or not _is_retryable(exc):
                # Either exhausted retries or non-retryable error — give up
                logger.error(
                    "%s failed (attempt %d/%d, non-retryable=%s): %s",
                    label, attempt, max_attempts, not _is_retryable(exc), exc
                )
                raise

            delay = _calculate_retry_delay(exc, attempt, base_delay)
            logger.warning(
                "%s transient failure (attempt %d/%d), retrying in %.1fs: %s",
                label, attempt, max_attempts, delay, exc
            )
            await asyncio.sleep(delay)

    # Should never reach here, but satisfy type checker
    raise last_exc  # type: ignore[misc]
