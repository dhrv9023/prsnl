"""
slowapi limiter + composite keys (IP + optional verified user id) for Phase 6.
"""

from __future__ import annotations

import logging

import jwt
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


def get_client_ip(request: Request) -> str:
    """Use X-Forwarded-For first when behind a trusted reverse proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


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
