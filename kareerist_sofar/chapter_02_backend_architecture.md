# Chapter 2 — Backend Architecture Deep Dive

## Overview

The backend is a **Python FastAPI** application running on **Uvicorn** (ASGI). It serves as the central coordinator for all business logic: database operations, AI requests, file processing, rate limiting, and security enforcement.

- **URL**: `http://localhost:8000`
- **Entry point**: `backend/app/main.py`
- **API prefix**: `/api/v1`

---

## App Factory (`main.py`)

The `main.py` file is the app factory. It does the following in order:

1. **Sets up logging** — structured format: `HH:MM:SS | LEVEL | module | message`
2. **Defines security middleware** — `SecurityHeadersMiddleware` and `BodySizeLimitMiddleware`
3. **Creates the FastAPI app** — with OpenAPI/docs disabled in production
4. **Registers SlowAPI rate limiter** and its exception handler
5. **Includes all routers** under `/api/v1`
6. **Adds CORS middleware** with a strict origin whitelist from `settings.CORS_ORIGINS`
7. **Adds security headers middleware** wrapping all responses
8. **Exposes `/` root and `/health` endpoints**

### Production Mode Guard
```python
_is_prod = settings.ENVIRONMENT == "production"
app = FastAPI(
    openapi_url=None if _is_prod else f"{settings.API_V1_STR}/openapi.json",
    docs_url=None if _is_prod else "/docs",   # Swagger hidden in prod
    redoc_url=None if _is_prod else "/redoc", # ReDoc hidden in prod
)
```

---

## Middleware Stack (in application order)

Middleware in FastAPI/Starlette wraps like an onion — last added = outermost.

| Middleware | Purpose |
|---|---|
| `BodySizeLimitMiddleware` | Rejects requests > 1MB on non-upload routes (prevents oversized JSON abuse) |
| `SecurityHeadersMiddleware` | Injects security headers on every response |
| `CORSMiddleware` | Validates cross-origin requests against the whitelist |

### Security Headers Added to Every Response
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'none'; frame-ancestors 'none';
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload  ← HTTPS only
```

---

## API Router Map

```
/api/v1/auth/          → auth.py        (signup, login, logout, refresh, /me, OAuth)
/api/v1/resumes/       → resumes.py     (upload, list, get, delete)
/api/v1/analysis/      → ai_analysis.py (match, roast, history, translate)
/api/v1/cover_letter/  → cover_letter.py(generate, save_pdf, humanize, list, get)
/api/v1/dashboard/     → dashboard.py   (summary)
/api/v1/interview/     → interview.py   (start, submit, end)
/api/ats/              → ats_score.py   (general ATS score, no JD)
```

---

## Core Config (`app/core/config.py`)

All configuration is managed via `pydantic_settings.BaseSettings`. Settings are loaded from `backend/app/.env`.

### Key Settings

| Setting | Default | Notes |
|---|---|---|
| `ENVIRONMENT` | `development` | Switches prod guards |
| `GROQ_API_KEY` | required | LLM API key |
| `SUPABASE_URL` | required | Supabase project URL |
| `SUPABASE_SERVICE_ROLE` | required | Admin DB key |
| `SUPABASE_ANON_KEY` | optional | Needed for PKCE OAuth exchange |
| `SUPABASE_JWT_SECRET` | optional | For composite rate-limit keys |
| `HUGGINGFACE_API_KEY` | required | For embeddings |
| `CORS_ORIGINS` | localhost:8080, 5173 | Comma-separated |
| `COOKIE_SECURE` | `False` | Must be `True` in production |
| `COOKIE_SAMESITE` | `lax` | CSRF protection |
| `REDIS_URL` | `redis://localhost:6379/0` | Rate limiting + sessions |
| `RATE_LIMIT_AUTH` | `5/minute` | Auth endpoint limiter |
| `RATE_LIMIT_UPLOAD` | `5/day` | Resume upload limiter |
| `RATE_LIMIT_ANALYSIS` | `2/hour` | AI analysis limiter |
| `RATE_LIMIT_COVER_LETTER` | `2/hour` | Cover letter limiter |
| `RATE_LIMIT_INTERVIEW` | `2/hour` | Interview limiter |
| `MAX_UPLOAD_BYTES` | `5MB` | PDF size cap |

### Production Safety Validator
```python
@model_validator(mode="after")
def _check_production_security(self):
    if self.ENVIRONMENT == "production":
        if not self.COOKIE_SECURE:
            raise ValueError("COOKIE_SECURE must be True in production")
        if "*" in self.CORS_ORIGINS:
            raise ValueError("CORS_ORIGINS must not contain '*' in production")
```
The app **refuses to start** if misconfigured in production mode.

---

## Rate Limiting (`app/core/rate_limit.py`)

Uses **SlowAPI** (a FastAPI wrapper around the `limits` library) backed by **Redis**.

### Key Design: No X-Forwarded-For Trust
```python
def _get_real_client_ip(request: Request) -> str:
    # NEVER trust X-Forwarded-For from untrusted clients
    if request.client:
        return request.client.host or "unknown"
    return "unknown"
```
This prevents rate-limit bypass via header spoofing — a P0 security finding that was fixed.

### Composite Rate-Limit Key (`ats_rate_key`)
For AI endpoints, the rate-limit key is `{IP}|u:{user_uuid}` for authenticated users and `{IP}|anon` for anonymous. This prevents both IP-based and account-based abuse.

---

## Resume Upload Pipeline (`resumes.py`)

The upload endpoint implements **5 layers of validation**:

```
1. Content-Type check    → Only "application/pdf" accepted
2. Content-Length check  → Reject if > 5MB before reading
3. Magic bytes check     → File must start with b"%PDF-" (prevents disguised executables)
4. Page limit check      → Max 20 pages (prevents decompression bombs)
5. Text length check     → Must extract > 50 chars (catches empty/image-only PDFs)
```

After validation:
- File stored in Supabase Storage at `{user_id}/{timestamp}_{filename}`
- Extracted text + metadata inserted into the `resumes` table
- IDOR protection: all queries include `.eq("user_id", user.id)`

---

## Database Tables (Supabase/PostgreSQL)

| Table | Key Columns | Purpose |
|---|---|---|
| `resumes` | `id, user_id, file_url, parsed_content (JSONB), resume_quality_feedback` | Stores uploaded resume metadata + extracted text |
| `ai_analyses` | `id, resume_id, analysis_type, output_data (JSONB), created_at` | Stores ATS scores and Deep Roast results |
| `job_applications` | `id, user_id, resume_id, company_name, job_title, cover_letter_content, cover_letter_file_url, status` | Tracks cover letter drafts and final PDFs |
| `profiles` | `id, is_admin, full_name` | Synced from `auth.users`, stores role flags |

---

## Health Check Endpoint

```
GET /health
```
Verifies both Redis (`PING`) and Supabase (`get_db()`) are reachable. Returns:
```json
{
  "status": "ok",   // or "degraded"
  "checks": {
    "api": "ok",
    "redis": "ok",
    "supabase": "ok"
  }
}
```
The `run.sh` launcher polls this endpoint every 2 seconds (up to 20s) before starting the frontend.
