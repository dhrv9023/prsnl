from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Career Toolkit" # Default value
    API_V1_STR: str = "/api/v1"
    GROQ_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE: str
    HUGGINGFACE_API_KEY: str

    # This tells Pydantic to read from the .env file in the root
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore"
    )

settings = Settings()