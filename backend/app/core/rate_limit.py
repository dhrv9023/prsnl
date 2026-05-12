"""
slowapi limiter + composite keys (IP + optional verified user id) for Phase 6.
Uses Redis as the storage backend so limits persist across restarts.
"""

from __future__ import annotations

import logging

import jwt
from fastapi import Request
from slowapi import Limiter

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


limiter = Limiter(
    key_func=_get_real_client_ip,
    storage_uri=settings.REDIS_URL,
)


def get_client_ip(request: Request) -> str:
    """Alias for _get_real_client_ip — used by credit system and other modules."""
    return _get_real_client_ip(request)


def _cookie_access_token(request: Request) -> str | None:
    raw = request.cookies.get(settings.AUTH_ACCESS_COOKIE_NAME)
    if not raw:
        return None
    if raw.startswith("Bearer "):
        return raw.split(" ", 1)[1].strip() or None
    return raw.strip() or None


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
