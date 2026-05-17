"""
slowapi limiter + composite keys (IP + optional verified user id) for Phase 6.
Uses Redis as the storage backend so limits persist across restarts.
Falls back to in-memory storage if Redis is unreachable at startup.
"""

from __future__ import annotations

import logging

import jwt
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_real_client_ip(request: Request) -> str:
    """
    Extract the real client IP from the request.
    In production (behind Render/Cloudflare proxy), reads X-Forwarded-For.
    In development, falls back to request.client.host.
    """
    if settings.ENVIRONMENT == "production":
        # Cloudflare sets this header — most reliable
        cf_ip = request.headers.get("CF-Connecting-IP")
        if cf_ip:
            return cf_ip.strip().split(",")[0].strip()

        # Standard reverse proxy header (Render, nginx, etc.)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Leftmost IP is the original client
            return forwarded.strip().split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()

    # Development / direct connection
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


def _build_limiter() -> Limiter:
    """
    Build the SlowAPI limiter.
    Tries Redis first; falls back to in-memory if Redis URL is localhost
    (test environment) or if the connection string is clearly invalid.
    In production the Upstash URL is always set, so this only affects tests
    and local dev without Redis running.
    """
    redis_url = settings.REDIS_URL or ""

    # Use in-memory storage for tests (localhost Redis that isn't running)
    # and for any environment where REDIS_URL is not set.
    # In production REDIS_URL is always the Upstash rediss:// URL.
    use_memory = (
        not redis_url
        or redis_url.startswith("redis://localhost")
        or redis_url.startswith("redis://127.0.0.1")
    )

    if use_memory:
        logger.warning(
            "Rate limiter: Redis URL is localhost or unset — using in-memory storage. "
            "Rate limits will NOT persist across restarts. "
            "Set REDIS_URL to an Upstash URL in production."
        )
        return Limiter(key_func=_get_real_client_ip)

    return Limiter(
        key_func=_get_real_client_ip,
        storage_uri=redis_url,
    )


limiter = _build_limiter()


def get_client_ip(request: Request) -> str:
    """Alias for _get_real_client_ip — used by credit system and other modules."""
    return _get_real_client_ip(request)


def _cookie_access_token(request: Request) -> str | None:
    raw = request.cookies.get(settings.AUTH_ACCESS_COOKIE_NAME)
    if not raw:
        return None
    # Strip legacy Bearer prefix defensively (cookie now stores raw JWT)
    return raw.removeprefix("Bearer ").strip() or None


def _verified_sub(token: str) -> str | None:
    secret = (settings.SUPABASE_JWT_SECRET or "").strip()
    if not secret:
        return None
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"require": ["exp", "sub"], "verify_aud": False},
        )
        sub = payload.get("sub")
        return str(sub) if sub else None
    except jwt.PyJWTError as e:
        logger.debug("ATS rate-limit JWT decode skipped: %s", e)
        return None


def ats_rate_key(request: Request) -> str:
    """
    Bucket per (IP, auth identity): anonymous shares ip|anon on that IP;
    logged-in users get ip|u:<uuid> when JWT verifies with SUPABASE_JWT_SECRET.
    """
    ip = get_client_ip(request)
    tok = _cookie_access_token(request)
    sub = _verified_sub(tok) if tok else None
    if sub:
        return f"{ip}|u:{sub}"
    return f"{ip}|anon"
