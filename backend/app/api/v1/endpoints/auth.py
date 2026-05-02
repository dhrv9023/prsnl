# app/api/v1/endpoints/auth.py
import logging
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, EmailStr
from app.db.supabase import get_db
from app.api.dependencies import CurrentUser
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class UserAuth(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


@router.post("/signup")
async def sign_up(user_data: UserAuth):
    try:
        supabase = await get_db()
        response = await supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {"data": {"full_name": user_data.full_name or ""}}
        })

        if not response.user and not response.session:
            return {"msg": "Registration successful. Please check email if verify is on."}

        return {"msg": "User created successfully", "user_id": response.user.id}

    except Exception as e:
        logger.warning("Signup failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(user_data: UserAuth, response: Response):
    """
    Logs in and sets a secure HttpOnly cookie.
    """
    supabase = await get_db()
    try:
        supa_response = await supabase.auth.sign_in_with_password({
            "email": user_data.email,
            "password": user_data.password
        })

        access_token = supa_response.session.access_token

        response.set_cookie(
            key="access_token",
            value=f"Bearer {access_token}",
            httponly=True,
            max_age=60 * 60 * 24 * 7,  # 7 days
            samesite="lax",
            secure=settings.COOKIE_SECURE,  # Reads from .env — True in production (HTTPS)
        )

        return {
            "msg": "Login successful",
            "user": {
                "id": supa_response.user.id,
                "email": supa_response.user.email
            }
        }

    except Exception as e:
        logger.warning("Login failed for %s: %s", user_data.email, e)
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/logout")
def logout(response: Response):
    """
    Clears the cookie to log the user out.
    """
    response.delete_cookie("access_token")
    return {"msg": "Logged out successfully"}


@router.get("/me")
def get_current_user_profile(user: CurrentUser):
    """
    Protected Route: Only accessible if you have a valid HttpOnly cookie.
    """
    return {
        "id": user.id,
        "email": user.email,
        "msg": "You are fully authenticated!"
    }
