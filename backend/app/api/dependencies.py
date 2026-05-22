# app/api/dependencies.py
import logging
from typing import Annotated, Callable
from types import SimpleNamespace

from fastapi import Depends, HTTPException, Request, status
from app.core.config import settings
from app.db.supabase import get_db

logger = logging.getLogger(__name__)

# ── Dev bypass user ───────────────────────────────────────────────────────────
# Only active when ENVIRONMENT=development AND the request carries X-Dev-Bypass: 1
# Set DEV_BYPASS_USER_ID in backend/app/.env to your real Supabase user UUID.
# This is completely ignored in production.
_DEV_BYPASS_USER_ID = getattr(settings, "DEV_BYPASS_USER_ID", None)


async def get_current_user(request: Request):
    """
    Dependency: Extracts the JWT from the HttpOnly cookie
    and verifies it with Supabase.

    DEV BYPASS: In development, sending header X-Dev-Bypass: 1 skips auth
    entirely and returns a mock user with DEV_BYPASS_USER_ID. Never active
    in production.
    """
    # ── Dev bypass (development only) ─────────────────────────────────────
    if (
        settings.ENVIRONMENT == "development"
        and _DEV_BYPASS_USER_ID
        and request.headers.get("X-Dev-Bypass") == "1"
    ):
        logger.debug("DEV BYPASS: skipping auth for user %s", _DEV_BYPASS_USER_ID)
        return SimpleNamespace(id=_DEV_BYPASS_USER_ID, email="dev@localhost")

    # ── Normal auth flow ───────────────────────────────────────────────────
    token = request.cookies.get(settings.AUTH_ACCESS_COOKIE_NAME)
    supabase = await get_db()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    # Cookie now stores raw JWT (no Bearer prefix). Strip it defensively
    # in case an old cookie from before this fix is still in the browser.
    token = token.removeprefix("Bearer ").strip()

    try:
        user_response = await supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid session")
        return user_response.user

    except Exception as e:
        logger.warning("Auth verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
        )


# Type alias for easy use in route signatures
CurrentUser = Annotated[object, Depends(get_current_user)]


# ── Credit guard ───────────────────────────────────────────────────────────────

def require_credits(feature: str, cost: int) -> Callable:
    """
    FastAPI dependency factory that validates and atomically deducts credits
    before the route handler executes.

    In development with DEV_BYPASS active, credit deduction is skipped entirely.
    """
    from app.services.credits import deduct_feature_credits

    async def _credit_guard(request: Request, user: CurrentUser):
        # Skip deduction in dev bypass mode
        if (
            settings.ENVIRONMENT == "development"
            and _DEV_BYPASS_USER_ID
            and request.headers.get("X-Dev-Bypass") == "1"
        ):
            logger.debug("DEV BYPASS: skipping credit deduction for %s", feature)
            return

        supabase = await get_db()
        await deduct_feature_credits(
            supabase=supabase,
            user_id=str(user.id),
            feature=feature,
            cost=cost,
        )

    return Depends(_credit_guard)
