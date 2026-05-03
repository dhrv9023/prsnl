from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

# Always resolve .env next to the app package (backend/app/.env), regardless of cwd.
_APP_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Career Toolkit" # Default value
    API_V1_STR: str = "/api/v1"
    GROQ_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE: str
    SUPABASE_ANON_KEY: str | None = None  # PKCE OAuth: POST /auth/oauth/session
    SUPABASE_JWT_SECRET: str | None = None  # JWT Secret (API settings); HS256 for rate-limit key
    HUGGINGFACE_API_KEY: str
    CORS_ORIGINS: str = "*"  # Comma-separated origins, e.g. "https://kareerist.com,https://www.kareerist.com"
    COOKIE_SECURE: bool = False  # Set True in production (HTTPS only)
    COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
    AUTH_COOKIE_PATH: str = "/"
    AUTH_COOKIE_DOMAIN: str | None = None
    AUTH_ACCESS_COOKIE_NAME: str = "access_token"
    AUTH_REFRESH_COOKIE_NAME: str = "refresh_token"
    AUTH_ACCESS_MAX_AGE_SECONDS: int = 60 * 60 * 24 * 7
    AUTH_REFRESH_MAX_AGE_SECONDS: int = 60 * 60 * 24 * 30
    RATE_LIMIT_AUTH: str = "5/minute"
    RATE_LIMIT_UPLOAD: str = "5/day"
    RATE_LIMIT_ANALYSIS: str = "2/hour"  # slowapi: e.g. 3/day, 30/minute
    RATE_LIMIT_COVER_LETTER: str = "2/hour"
    RATE_LIMIT_INTERVIEW: str = "2/hour"
    RATE_LIMIT_ATS: str = "2/hour"
    MAX_UPLOAD_BYTES: int = 5 * 1024 * 1024
    REDIS_URL: str = "redis://localhost:6379/0"  # Override in .env if Redis on another host

    model_config = SettingsConfigDict(
        env_file=_APP_DIR / ".env",
        env_ignore_empty=True,
        extra="ignore",
    )



settings = Settings()
