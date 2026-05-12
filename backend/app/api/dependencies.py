# app/api/dependencies.py
import logging
from typing import Annotated, Callable

from fastapi import Depends, HTTPException, Request, status
from app.core.config import settings
from app.db.supabase import get_db

logger = logging.getLogger(__name__)


async def get_current_user(request: Request):
    """
    Dependency: Extracts the JWT from the HttpOnly cookie
    and verifies it with Supabase.
    """
    token = request.cookies.get(settings.AUTH_ACCESS_COOKIE_NAME)
    supabase = await get_db()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    # The token is stored as "Bearer <jwt>", strip the prefix
    if token.startswith("Bearer "):
        token = token.split(" ")[1]

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

    Usage:
        @router.post("/match")
        async def my_route(
            ...,
            user: CurrentUser,
            _credits=require_credits("ats_score", 5),
        ):
    """
    from app.services.credits import deduct_feature_credits

    async def _credit_guard(user: CurrentUser):
        supabase = await get_db()
        await deduct_feature_credits(
            supabase=supabase,
            user_id=str(user.id),
            feature=feature,
            cost=cost,
        )

    return Depends(_credit_guard)
