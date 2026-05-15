# app/api/v1/endpoints/auth.py
import logging
import re

from fastapi import APIRouter, HTTPException, Response, Request
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.db.supabase import get_db, get_supabase_anon
from app.api.dependencies import CurrentUser
from app.core.config import settings
from app.core.auth_cookies import clear_session_cookies, set_session_cookies
from app.core.rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter()

# Phase 5 — HttpOnly cookies only (no localStorage): access + refresh JWTs.
#
# Email/password: POST /login sets cookies.
# OAuth (Google, etc.): use Supabase PKCE from the SPA, then POST the `code` + `code_verifier`
# from the callback URL to /oauth/session so the backend can exchange and set the same cookies.
# Requires SUPABASE_ANON_KEY on the server for exchange_code_for_session.
#
# Dashboard: enable provider + redirect URLs (Auth → URL configuration). public.profiles sync
# applies to all signups (Phase 4 trigger).


class UserAuth(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit.")
        return v


@router.post("/signup")
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def sign_up(request: Request, user_data: UserAuth):
    try:
        supabase = await get_db()
        response = await supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {"data": {"full_name": user_data.full_name or ""}}
        })

        if not response.user and not response.session:
            return {"msg": "Registration successful. Please check email if verify is on."}

        # ── IP-gated initial credit grant ──────────────────────────────────
        # The Supabase trigger sets credits to 0 (see migration).
        # We grant 100 here only if this IP hasn't already claimed credits.
        # This prevents multi-account farming from the same IP.
        if response.user:
            from app.services.credits import grant_initial_credits
            from app.core.rate_limit import get_client_ip
            client_ip = get_client_ip(request)
            await grant_initial_credits(
                supabase=supabase,
                user_id=str(response.user.id),
                client_ip=client_ip,
            )

        return {"msg": "User created successfully", "user_id": response.user.id}

    except Exception as e:
        logger.warning("Signup failed: %s", e)
        raise HTTPException(
            status_code=400,
            detail="Registration failed. The email address may already be in use or is invalid.",
        )


@router.post("/login")
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def login(request: Request, user_data: UserAuth, response: Response):
    """
    Logs in and sets HttpOnly access + refresh cookies (no tokens in JSON).
    """
    supabase = await get_db()
    try:
        supa_response = await supabase.auth.sign_in_with_password({
            "email": user_data.email,
            "password": user_data.password
        })

        sess = supa_response.session
        if not sess:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        set_session_cookies(response, sess.access_token, getattr(sess, "refresh_token", None))

        return {
            "msg": "Login successful",
            "user": {
                "id": supa_response.user.id,
                "email": supa_response.user.email
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Login failed for %s: %s", user_data.email, e)
        raise HTTPException(status_code=401, detail="Invalid credentials")


class OAuthSessionExchange(BaseModel):
    """PKCE callback payload from the SPA (query `code` + stored `code_verifier`)."""

    code: str = Field(..., min_length=8)
    code_verifier: str = Field(..., min_length=8)


@router.post("/oauth/session")
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def oauth_exchange_session(request: Request, body: OAuthSessionExchange, response: Response):
    """
    Exchange Supabase OAuth PKCE `code` for a session and mirror it into HttpOnly cookies.
    Call this once from your OAuth redirect page; do not persist tokens in localStorage.
    """
    logger.info("[OAuth] Received code exchange request")
    logger.info("[OAuth] Code length: %d, Verifier length: %d", len(body.code), len(body.code_verifier))
    
    anon = await get_supabase_anon()
    if anon is None:
        logger.error("[OAuth] SUPABASE_ANON_KEY not configured on server")
        raise HTTPException(
            status_code=503,
            detail="Server missing SUPABASE_ANON_KEY; cannot complete OAuth exchange.",
        )
    
    logger.info("[OAuth] Attempting code exchange with Supabase...")
    try:
        exchanged = await anon.auth.exchange_code_for_session({
            "auth_code": body.code,
            "code_verifier": body.code_verifier,
        })
        logger.info("[OAuth] Code exchange successful")
    except Exception as e:
        logger.error("[OAuth] Code exchange failed: %s (type: %s)", str(e), type(e).__name__)
        # Log more details about the error
        import traceback
        logger.error("[OAuth] Traceback: %s", traceback.format_exc())
        raise HTTPException(status_code=401, detail=f"Invalid or expired OAuth code: {str(e)}")

    sess = exchanged.session
    user = exchanged.user
    
    if not sess or not user:
        logger.error("[OAuth] Exchange returned no session or user. Session: %s, User: %s", bool(sess), bool(user))
        raise HTTPException(status_code=401, detail="OAuth exchange returned no session")

    logger.info("[OAuth] Setting session cookies for user: %s", user.email)
    set_session_cookies(response, sess.access_token, getattr(sess, "refresh_token", None))

    # ── IP-gated initial credit grant for new OAuth users ─────────────────
    # grant_initial_credits is idempotent — safe to call on every OAuth login.
    # It checks if the user already has credits before granting.
    try:
        from app.services.credits import grant_initial_credits
        from app.core.rate_limit import get_client_ip
        client_ip = get_client_ip(request)
        await grant_initial_credits(
            supabase=anon,
            user_id=str(user.id),
            client_ip=client_ip,
        )
    except Exception as e:
        logger.warning("[OAuth] grant_initial_credits failed (non-fatal): %s", e)

    return {
        "msg": "Session established",
        "user": {"id": user.id, "email": user.email},
    }


@router.post("/refresh")
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def refresh_session(request: Request, response: Response):
    """
    Rotate access (and refresh) tokens using the HttpOnly refresh cookie.
    """
    raw = request.cookies.get(settings.AUTH_REFRESH_COOKIE_NAME)
    if not raw:
        raise HTTPException(status_code=401, detail="No refresh token")

    supabase = await get_db()
    try:
        refreshed = await supabase.auth.refresh_session(raw)
    except Exception as e:
        logger.warning("Refresh failed: %s", e)
        clear_session_cookies(response)
        raise HTTPException(status_code=401, detail="Refresh token invalid or expired")

    sess = refreshed.session
    if not sess:
        clear_session_cookies(response)
        raise HTTPException(status_code=401, detail="No session after refresh")

    set_session_cookies(response, sess.access_token, getattr(sess, "refresh_token", None))
    return {"msg": "Session refreshed"}


@router.post("/logout")
async def logout(response: Response):
    """Invalidates the server-side session and clears HttpOnly cookies."""
    # Invalidate the JWT on Supabase's side so stolen tokens stop working
    try:
        supabase = await get_db()
        await supabase.auth.sign_out()
    except Exception as e:
        logger.warning("Server-side sign-out failed (cookies will still be cleared): %s", e)
    clear_session_cookies(response)
    return {"msg": "Logged out successfully"}


@router.get("/me")
async def get_current_user_profile(user: CurrentUser):
    """
    Protected route: valid HttpOnly session cookie.
    Includes `profile` from public.profiles when the Phase 4 migration has been applied.
    Returns `is_admin: bool` so the frontend can enforce role-based access.
    """
    supabase = await get_db()
    profile = None
    is_admin = False
    try:
        uid = getattr(user, "id", None)
        if uid is not None:
            res = await supabase.table("profiles").select("*").eq("id", str(uid)).limit(1).execute()
            if res.data:
                profile = res.data[0]
                is_admin = bool(profile.get("is_admin", False))
    except Exception as e:
        logger.warning("Could not load public.profiles for /me: %s", e)

    return {
        "id": getattr(user, "id", None),
        "email": getattr(user, "email", None),
        "profile": profile,
        "is_admin": is_admin,
        "msg": "You are fully authenticated!",
    }
