"""HttpOnly session cookies: access JWT (Bearer prefix) + refresh token."""

from __future__ import annotations

from typing import Any

from starlette.responses import Response

from app.core.config import settings


def _base_cookie_args() -> dict[str, Any]:
    out: dict[str, Any] = {
        "path": settings.AUTH_COOKIE_PATH,
        "secure": settings.COOKIE_SECURE,
        "httponly": True,
        "samesite": settings.COOKIE_SAMESITE,
    }
    if settings.AUTH_COOKIE_DOMAIN:
        out["domain"] = settings.AUTH_COOKIE_DOMAIN
    return out


def set_access_token_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        key=settings.AUTH_ACCESS_COOKIE_NAME,
        value=f"Bearer {access_token}",
        max_age=settings.AUTH_ACCESS_MAX_AGE_SECONDS,
        **_base_cookie_args(),
    )


def set_refresh_token_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.AUTH_REFRESH_MAX_AGE_SECONDS,
        **_base_cookie_args(),
    )


def set_session_cookies(response: Response, access_token: str, refresh_token: str | None) -> None:
    set_access_token_cookie(response, access_token)
    if refresh_token:
        set_refresh_token_cookie(response, refresh_token)


def clear_session_cookies(response: Response) -> None:
    args = _base_cookie_args()
    path = args.pop("path", settings.AUTH_COOKIE_PATH)
    for key in (settings.AUTH_ACCESS_COOKIE_NAME, settings.AUTH_REFRESH_COOKIE_NAME):
        response.delete_cookie(key=key, path=path, **args)
