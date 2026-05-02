from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Always resolve .env next to the app package (backend/app/.env), regardless of cwd.
_APP_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Career Toolkit" # Default value
    API_V1_STR: str = "/api/v1"
    GROQ_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE: str
    HUGGINGFACE_API_KEY: str
    CORS_ORIGINS: str = "*"  # Comma-separated origins, e.g. "https://kareerist.com,https://www.kareerist.com"
    COOKIE_SECURE: bool = False  # Set True in production (HTTPS only)
    REDIS_URL: str = "redis://localhost:6379/0"  # Override in .env if Redis is on another host

    model_config = SettingsConfigDict(
        env_file=_APP_DIR / ".env",
        env_ignore_empty=True,
        extra="ignore",
    )



settings = Settings()