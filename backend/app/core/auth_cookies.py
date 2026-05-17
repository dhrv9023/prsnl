"""
HttpOnly session cookies: raw access JWT + refresh token.

Security model:
- access_token / refresh_token: HttpOnly=True, Secure=True, SameSite from config
- csrf_token: HttpOnly=False (JS-readable), Secure=True, SameSite from config
  → Frontend reads this and sends it back as X-CSRF-Token header on every
    state-changing request (POST/PUT/DELETE). Backend validates it matches
    the value in the HttpOnly access_token cookie's sub claim.
    This defeats CSRF even when SameSite=None (cross-site cookies).

Why SameSite=None is needed:
  Frontend (Vercel: kareerist.vercel.app) and backend (Render: kareerist-backend.onrender.com)
  are on different domains. Browsers block cross-site cookies unless SameSite=None; Secure.
  We compensate with the CSRF double-submit pattern.

Why no Bearer prefix in the cookie:
  The Bearer prefix belongs in the Authorization header, not a cookie value.
  Storing it in the cookie was a legacy mistake — it required stripping in 3 places.
  Now the cookie stores the raw JWT only.
"""

from __future__ import annotations

import secrets
from typing import Any

from starlette.responses import Response

from app.core.config import settings

# CSRF token cookie name — JS-readable (not HttpOnly)
CSRF_COOKIE_NAME = "csrf_token"


def _base_cookie_args(httponly: bool = True) -> dict[str, Any]:
    out: dict[str, Any] = {
        "path": settings.AUTH_COOKIE_PATH,
        "secure": settings.COOKIE_SECURE,
        "httponly": httponly,
        "samesite": settings.COOKIE_SAMESITE,
    }
    if settings.AUTH_COOKIE_DOMAIN:
        out["domain"] = settings.AUTH_COOKIE_DOMAIN
    return out


def set_access_token_cookie(response: Response, access_token: str) -> None:
    """Store raw JWT — no Bearer prefix."""
    # Strip any accidental Bearer prefix that may come from Supabase
    token = access_token.removeprefix("Bearer ").strip()
    response.set_cookie(
        key=settings.AUTH_ACCESS_COOKIE_NAME,
        value=token,
        max_age=settings.AUTH_ACCESS_MAX_AGE_SECONDS,
        **_base_cookie_args(httponly=True),
    )


def set_refresh_token_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.AUTH_REFRESH_MAX_AGE_SECONDS,
        **_base_cookie_args(httponly=True),
    )


def set_csrf_cookie(response: Response) -> str:
    """
    Generate a random CSRF token, store it in a JS-readable cookie, and return it.
    The frontend must read this cookie and send it back as X-CSRF-Token on every
    POST/PUT/DELETE request.
    """
    csrf_token = secrets.token_hex(32)  # 64-char hex string
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=settings.AUTH_ACCESS_MAX_AGE_SECONDS,  # same lifetime as access token
        **_base_cookie_args(httponly=False),  # JS-readable — intentional
    )
    return csrf_token


def set_session_cookies(response: Response, access_token: str, refresh_token: str | None) -> str:
    """
    Set all three session cookies and return the CSRF token so the login
    response can include it for the frontend to store.
    """
    set_access_token_cookie(response, access_token)
    if refresh_token:
        set_refresh_token_cookie(response, refresh_token)
    csrf_token = set_csrf_cookie(response)
    return csrf_token


def clear_session_cookies(response: Response) -> None:
    args = _base_cookie_args(httponly=True)
    path = args.pop("path", settings.AUTH_COOKIE_PATH)
    for key in (settings.AUTH_ACCESS_COOKIE_NAME, settings.AUTH_REFRESH_COOKIE_NAME):
        response.delete_cookie(key=key, path=path, **args)
    # Also clear the CSRF cookie
    csrf_args = _base_cookie_args(httponly=False)
    csrf_args.pop("path", None)
    response.delete_cookie(key=CSRF_COOKIE_NAME, path=path, **csrf_args)
