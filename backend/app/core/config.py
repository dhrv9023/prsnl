from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Career Toolkit" # Default value
    API_V1_STR: str = "/api/v1"
    GROQ_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE: str
    HUGGINGFACE_API_KEY: str
    CORS_ORIGINS: str = "*"  # Comma-separated origins, e.g. "https://kareerist.com,https://www.kareerist.com"
    COOKIE_SECURE: bool = False  # Set True in production (HTTPS only)

    # Reads backend/.env when uvicorn is launched from the backend/ directory
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore"
    )



settings = Settings()