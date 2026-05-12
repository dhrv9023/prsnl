"""
Structured request/response logging middleware for Kareerist Studio.

Logs every HTTP request with:
- Method, path, status code, duration (ms)
- User ID (from auth cookie JWT, if present)
- Client IP
- Request ID (UUID per request for log correlation)

Output format (JSON in production, human-readable in development):
  Production:  {"ts": "...", "method": "POST", "path": "/api/v1/auth/login", ...}
  Development: 2026-05-12 10:23:45 │ POST /api/v1/auth/login → 200 (142ms) [anon]

Excluded paths (health checks, static assets):
  /health, /

Usage: added as middleware in main.py
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Callable

import jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings

logger = logging.getLogger("kareerist.requests")

# Paths that are too noisy to log every hit
_SKIP_PATHS = {"/health", "/", "/favicon.ico"}

# Paths that contain sensitive data — log path but not body
_SENSITIVE_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/signup",
    "/api/v1/auth/oauth/session",
    "/api/v1/auth/refresh",
}


def _extract_user_id(request: Request) -> str:
    """
    Try to extract the user ID from the access_token HttpOnly cookie.
    Returns "anon" if not present or JWT can't be decoded.
    """
    raw = request.cookies.get(settings.AUTH_ACCESS_COOKIE_NAME)
    if not raw:
        return "anon"

    token = raw.removeprefix("Bearer ").strip()
    if not token:
        return "anon"

    try:
        # Decode without verification — we only need the sub claim for logging.
        # Full verification happens in get_current_user dependency.
        payload = jwt.decode(
            token,
            options={"verify_signature": False},
            algorithms=["HS256", "RS256"],
        )
        sub = payload.get("sub", "")
        # Return first 8 chars of UUID for brevity
        return str(sub)[:8] if sub else "anon"
    except Exception:
        return "anon"


def _get_client_ip(request: Request) -> str:
    """Extract real client IP, respecting proxy headers."""
    if settings.ENVIRONMENT == "production":
        cf = request.headers.get("CF-Connecting-IP")
        if cf:
            return cf.strip().split(",")[0].strip()
        fwd = request.headers.get("X-Forwarded-For")
        if fwd:
            return fwd.strip().split(",")[0].strip()
    if request.client:
        return request.client.host or "-"
    return "-"


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    """
    Logs every request with method, path, status, duration, user, and IP.
    In production, emits structured JSON for log aggregators (Render logs, Datadog, etc.).
    In development, emits a compact human-readable line.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip noisy health-check paths
        if request.url.path in _SKIP_PATHS:
            return await call_next(request)

        request_id = str(uuid.uuid4())[:8]
        user_id = _extract_user_id(request)
        client_ip = _get_client_ip(request)
        start = time.perf_counter()

        # Attach request_id to request state so route handlers can reference it
        request.state.request_id = request_id

        try:
            response = await call_next(request)
            status = response.status_code
        except Exception as exc:
            # Unhandled exception — log it and re-raise (Sentry will also capture it)
            duration_ms = round((time.perf_counter() - start) * 1000)
            _emit_log(
                method=request.method,
                path=request.url.path,
                status=500,
                duration_ms=duration_ms,
                user_id=user_id,
                client_ip=client_ip,
                request_id=request_id,
                error=str(exc),
            )
            raise

        duration_ms = round((time.perf_counter() - start) * 1000)
        _emit_log(
            method=request.method,
            path=request.url.path,
            status=status,
            duration_ms=duration_ms,
            user_id=user_id,
            client_ip=client_ip,
            request_id=request_id,
        )

        # Add request ID to response headers for client-side debugging
        response.headers["X-Request-ID"] = request_id
        return response


def _emit_log(
    method: str,
    path: str,
    status: int,
    duration_ms: int,
    user_id: str,
    client_ip: str,
    request_id: str,
    error: str | None = None,
) -> None:
    """Emit the log record in the appropriate format."""
    level = logging.WARNING if status >= 400 else logging.INFO
    if status >= 500:
        level = logging.ERROR

    if settings.ENVIRONMENT == "production":
        # Structured JSON — parseable by Render log drains, Datadog, etc.
        record = {
            "req_id": request_id,
            "method": method,
            "path": path,
            "status": status,
            "ms": duration_ms,
            "user": user_id,
            "ip": client_ip,
        }
        if error:
            record["error"] = error
        logger.log(level, json.dumps(record))
    else:
        # Human-readable for local development
        status_str = f"{status}"
        msg = f"{method:6} {path} → {status_str} ({duration_ms}ms) [{user_id}] {client_ip}"
        if error:
            msg += f" ERROR: {error}"
        logger.log(level, msg)
