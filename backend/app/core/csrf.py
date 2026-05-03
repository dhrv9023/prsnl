from __future__ import annotations

from urllib.parse import urlparse

from fastapi import HTTPException, Request, status

from app.core.config import settings

SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
DEV_ORIGINS = {
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}


def _configured_origins() -> set[str]:
    origins = {o.strip().rstrip("/") for o in settings.CORS_ORIGINS.split(",") if o.strip()}
    if "*" in origins:
        return DEV_ORIGINS
    return origins


def _origin_from_referer(referer: str | None) -> str | None:
    if not referer:
        return None
    parsed = urlparse(referer)
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


async def csrf_protect(request: Request) -> None:
    """
    Basic cookie-auth CSRF defense for browser requests.
    Unsafe methods must come from an allowed frontend origin.
    """
    if request.method.upper() in SAFE_METHODS:
        return

    origin = request.headers.get("origin")
    candidate = (origin or _origin_from_referer(request.headers.get("referer")) or "").rstrip("/")
    if candidate and candidate in _configured_origins():
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="CSRF check failed: request origin is not allowed.",
    )
