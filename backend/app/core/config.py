from pathlib import Path
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always resolve .env next to the app package (backend/app/.env), regardless of cwd.
_APP_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Career Toolkit" # Default value
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: Literal["development", "production"] = "development"
    GROQ_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE: str
    SUPABASE_ANON_KEY: str | None = None  # PKCE OAuth: POST /auth/oauth/session
    SUPABASE_JWT_SECRET: str | None = None  # JWT Secret (API settings); HS256 for rate-limit key
    HUGGINGFACE_API_KEY: str
    CORS_ORIGINS: str = "http://localhost:8080,http://localhost:5173,http://127.0.0.1:8080,http://127.0.0.1:5173"
    COOKIE_SECURE: bool = False  # Set True in production (HTTPS only)
    COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
    AUTH_COOKIE_PATH: str = "/"
    AUTH_COOKIE_DOMAIN: str | None = None
    AUTH_ACCESS_COOKIE_NAME: str = "access_token"
    AUTH_REFRESH_COOKIE_NAME: str = "refresh_token"
    AUTH_ACCESS_MAX_AGE_SECONDS: int = 60 * 60  # 1 hour (use refresh to rotate)
    AUTH_REFRESH_MAX_AGE_SECONDS: int = 60 * 60 * 24 * 30
    MIN_PASSWORD_LENGTH: int = 8
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

    @model_validator(mode="after")
    def _check_production_security(self) -> "Settings":
        """Fail fast at startup if critical production settings are misconfigured."""
        if self.ENVIRONMENT == "production":
            if not self.COOKIE_SECURE:
                raise ValueError(
                    "COOKIE_SECURE must be True in production (HTTPS required)."
                )
            if "*" in self.CORS_ORIGINS:
                raise ValueError(
                    "CORS_ORIGINS must not contain '*' in production. "
                    "Set it to the exact frontend origin (e.g. https://kareerist.com)."
                )
        return self



settings = Settings()
