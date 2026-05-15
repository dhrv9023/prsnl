# app/services/ai_retry.py
"""
Shared retry utility for transient AI API failures (Groq, HuggingFace).

Retries on:
- Network/connection errors
- HTTP 429 (rate limit) — with backoff
- HTTP 500/502/503 from the upstream AI provider

Does NOT retry on:
- HTTP 400 (bad request — our fault, retrying won't help)
- HTTP 401 (auth failure — retrying won't help)
- JSON decode errors from valid responses (LLM returned garbage — retrying may help once)
"""

from __future__ import annotations

import asyncio
import logging
from typing import Callable, TypeVar, Awaitable

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Exceptions that indicate a transient failure worth retrying
_RETRYABLE_GROQ_MESSAGES = (
    "connection",
    "timeout",
    "rate_limit",
    "service_unavailable",
    "internal_server_error",
    "502",
    "503",
    "504",
)


def _is_retryable(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(kw in msg for kw in _RETRYABLE_GROQ_MESSAGES)


async def with_ai_retry(
    fn: Callable[[], Awaitable[T]],
    *,
    max_attempts: int = 3,
    base_delay: float = 1.5,
    label: str = "AI call",
) -> T:
    """
    Calls `fn()` up to `max_attempts` times with exponential backoff.

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

            delay = base_delay * (2 ** (attempt - 1))  # 1.5s, 3s, 6s
            logger.warning(
                "%s transient failure (attempt %d/%d), retrying in %.1fs: %s",
                label, attempt, max_attempts, delay, exc
            )
            await asyncio.sleep(delay)

    # Should never reach here, but satisfy type checker
    raise last_exc  # type: ignore[misc]
