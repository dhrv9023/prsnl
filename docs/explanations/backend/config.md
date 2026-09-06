# config.py

**Location:** `prsnl/backend/app/core/config.py`  
**Type:** Configuration / Settings

## What This File Does

Defines all application settings using Pydantic's BaseSettings class, which automatically loads values from environment variables and a `.env` file. It validates critical production security requirements at startup and exposes a module-level singleton (`settings`) that every other module imports. If any required variable is missing or a production safety check fails, the app crashes immediately with a clear error.

## How It Fits Into The System

- **What triggers it:** Imported at module load time by virtually every other backend file. The `settings` singleton is created once when the module is first imported.
- **What it depends on:** `pydantic_settings` (BaseSettings), environment variables, and a `.env` file located relative to the `app` package directory.
- **What depends on it:** Every other module in the backend — rate limiting, auth, database clients, middleware, endpoints, and services all read from `settings`.

## Code Breakdown

### _APP_DIR Path Resolution

Resolves the path to the `.env` file relative to the `app` package directory (where `config.py` lives), not the current working directory. This ensures the `.env` file is found correctly regardless of where you run `uvicorn` from — whether that's the project root, the `backend/` folder, or a Docker container.

### Settings Class

A Pydantic `BaseSettings` subclass with all application configuration fields:

**Core Application:**
- `PROJECT_NAME` — display name for the API
- `API_V1_STR` — API version prefix (e.g., `/api/v1`)
- `ENVIRONMENT` — "development", "staging", or "production"

**External Service Keys:**
- `GROQ_API_KEY` — for LLM inference via Groq
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE` — full-access service role key (bypasses RLS)
- `SUPABASE_ANON_KEY` — public anon key (for PKCE OAuth)
- `SUPABASE_JWT_SECRET` — for verifying JWTs locally
- `HUGGINGFACE_API_KEY` — for embedding models

**CORS:**
- `CORS_ORIGINS` — comma-separated allowed origins

**Cookie Settings:**
- `COOKIE_SECURE` — whether cookies require HTTPS
- `COOKIE_SAMESITE` — SameSite attribute (Lax/Strict/None)
- `AUTH_COOKIE_PATH` — cookie path scope
- `AUTH_COOKIE_DOMAIN` — optional domain scope
- `AUTH_ACCESS_COOKIE_NAME` — name of the access token cookie
- `AUTH_REFRESH_COOKIE_NAME` — name of the refresh token cookie
- `AUTH_ACCESS_MAX_AGE_SECONDS` — 3600 (1 hour)
- `AUTH_REFRESH_MAX_AGE_SECONDS` — 2592000 (30 days)

**Security:**
- `MIN_PASSWORD_LENGTH` — 8 characters minimum

**Rate Limiting:**
- Separate rate limit strings for auth, upload, analysis, cover letter, interview, and ATS endpoints

**Upload:**
- `MAX_UPLOAD_BYTES` — 5 MB (5242880 bytes)

**Infrastructure:**
- `REDIS_URL` — Redis connection string for rate limiting and sessions
- `SENTRY_DSN` — Sentry error monitoring DSN (optional)

### model_validator: _check_production_security

A Pydantic model validator (runs after all fields are populated) that enforces two hard rules in production:

1. `COOKIE_SECURE` must be `True` — prevents session cookies from being sent over plain HTTP.
2. `CORS_ORIGINS` must not contain `"*"` — prevents any origin from making credentialed requests.

If either check fails, the app raises a `ValueError` and refuses to start. This is a fail-fast safety net that prevents deploying an insecure configuration.

### SENTRY_DSN Normalization

Treats an empty string `SENTRY_DSN` as `None`. This allows setting `SENTRY_DSN=""` in `.env` to disable Sentry without removing the variable entirely.

### Module-Level Singleton

```python
settings = Settings()
```

Created once at import time. All other modules import this instance directly (`from app.core.config import settings`). There is no factory function or dependency injection — it's a true singleton.

## Things To Know Before Editing

- Adding a new required field (no default value) will crash the app on startup if the corresponding environment variable is not set in `.env` and the deployment environment.
- The `.env` path is resolved relative to the `app` package directory using `_APP_DIR`, not the current working directory. If you restructure the package, this path breaks.
- The production validator runs at import time — you cannot catch its errors in route handlers. A misconfigured production deploy will fail immediately on boot.
- Optional fields should always have a default (even if it's `None`) to avoid breaking local development setups.
- The `model_config` in BaseSettings controls `.env` file loading behavior — changing `env_file_encoding` or `case_sensitive` affects all field resolution.
- Every service, endpoint, and middleware imports `settings` — circular import issues are unlikely since config has no internal dependencies, but be careful if you add imports to this file.
