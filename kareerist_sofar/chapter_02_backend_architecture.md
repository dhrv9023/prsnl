# Chapter 2 — Backend Architecture Deep Dive

## Overview

The backend is a **Python FastAPI** application running on **Uvicorn** (ASGI). It serves as the central coordinator for all business logic: database operations, AI requests, file processing, rate limiting, credit enforcement, and security.

- **URL**: `http://localhost:8000`
- **Entry point**: `backend/app/main.py`
- **API prefix**: `/api/v1`

---

## App Factory (`main.py`)

The `main.py` file is the app factory. It does the following in order:

1. **Sets up logging** — structured format: `HH:MM:SS | LEVEL | module | message`
2. **Defines `_is_prod`** — `settings.ENVIRONMENT == "production"` — used throughout
3. **Defines security middleware** — `SecurityHeadersMiddleware` and `BodySizeLimitMiddleware`
4. **Creates the FastAPI app** — with OpenAPI/docs disabled in production
5. **Registers SlowAPI rate limiter** and its exception handler
6. **Includes all routers** under `/api/v1`
7. **Adds CORS middleware** with a strict origin whitelist from `settings.CORS_ORIGINS`
8. **Adds security headers middleware** wrapping all responses
9. **Adds `ProxyHeadersMiddleware`** in production — trusts `X-Forwarded-For` from Render's load balancer
10. **Exposes `/` root and `/health` endpoints**

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
| `ProxyHeadersMiddleware` | (Production only) Trusts `X-Forwarded-For` from Render's load balancer so rate limiting reads real client IPs |
| `BodySizeLimitMiddleware` | Rejects requests > 1MB on non-upload routes (prevents oversized JSON abuse) |
| `SecurityHeadersMiddleware` | Injects security headers on every response |
| `CORSMiddleware` | Validates cross-origin requests against the whitelist |

### Security Headers Added to Every Response

**Production CSP:**
```
default-src 'self'
script-src 'self'
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com
img-src 'self' data: https://*.supabase.co
connect-src 'self' https://*.supabase.co
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
```

**Development CSP** (relaxed — allows Vite HMR):
```
default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
connect-src 'self' https://*.supabase.co ws: wss:; frame-ancestors 'none';
```

**Other headers (all environments):**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload  ← HTTPS only
```

---

## API Router Map

```
/api/v1/auth/          → auth.py        (signup, login, logout, refresh, /me, OAuth)
/api/v1/resumes/       → resumes.py     (upload, list, get, delete)
/api/v1/analysis/      → ai_analysis.py (match, deep, hiring-intel, history)
/api/v1/cover_letter/  → cover_letter.py(generate, generate-roast, save_pdf, humanize, list, get)
/api/v1/dashboard/     → dashboard.py   (summary)
/api/v1/interview/     → interview.py   (start, submit, end)
/api/v1/admin/         → admin.py       (stats, users, grant-credits, set-unlimited, credit-history)
/api/v1/credits/       → credits.py     (balance, costs, validate, history)
/api/v1/utils/         → utils.py       (hinglish)
/api/ats/              → ats_score.py   (general ATS score, no auth required)
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
| `RATE_LIMIT_ANALYSIS` | `5/hour` | AI analysis limiter |
| `RATE_LIMIT_COVER_LETTER` | `5/hour` | Cover letter limiter |
| `RATE_LIMIT_INTERVIEW` | `5/hour` | Interview limiter |
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

### Proxy-Aware IP Extraction
```python
def _get_real_client_ip(request: Request) -> str:
    if settings.ENVIRONMENT == "production":
        # Cloudflare sets this header — most reliable
        cf_ip = request.headers.get("CF-Connecting-IP")
        if cf_ip:
            return cf_ip.strip().split(",")[0].strip()

        # Standard reverse proxy header (Render, nginx, etc.)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.strip().split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()

    # Development / direct connection
    if request.client:
        return request.client.host or "unknown"
    return "unknown"
```

In production, `ProxyHeadersMiddleware` is also applied so `request.client.host` is already set correctly from the trusted proxy header. The explicit header reading above provides defense-in-depth for Cloudflare deployments.

### Composite Rate-Limit Key (`ats_rate_key`)
For AI endpoints, the rate-limit key is `{IP}|u:{user_uuid}` for authenticated users and `{IP}|anon` for anonymous. This prevents both IP-based and account-based abuse.

---

## Credit System (`app/services/credits.py` + `app/api/v1/endpoints/credits.py`)

The credit system is the monetization backbone of Kareerist. Every AI feature costs credits; new users get 100 free credits on signup.

### Feature Costs
```python
FEATURE_COSTS = {
    "ats_score":      5,
    "deep_analysis":  15,
    "hiring_intel":   25,
    "interview":      25,
    "cover_letter":   10,
    "humanize":       15,
}
```

### Credit Guard Dependency
```python
def require_credits(feature: str, cost: int) -> Callable:
    async def _credit_guard(user: CurrentUser):
        supabase = await get_db()
        await deduct_feature_credits(
            supabase=supabase,
            user_id=str(user.id),
            feature=feature,
            cost=cost,
        )
    return Depends(_credit_guard)
```

Used on every AI route:
```python
@router.post("/match")
async def ats_score_calculator(
    ...,
    _credits=require_credits("ats_score", 5),
):
```

### Atomic Deduction via PostgreSQL RPC
```python
result = await supabase.rpc("deduct_credits", {
    "p_user_id":  user_id,
    "p_feature":  feature,
    "p_amount":   cost,
    "p_metadata": metadata or {},
}).execute()
```

The `deduct_credits` PostgreSQL function uses `SELECT ... FOR UPDATE` to lock the row, preventing race conditions. It returns `{ ok: bool, remaining: int }`.

### Admin Unlimited Bypass
```python
if profile.get("is_unlimited"):
    return { "remaining": remaining, "is_unlimited": True, "low_credits": False }
```
Users with `is_unlimited = true` in `profiles` skip all credit deductions. Used for admin accounts and internal testers.

### Credit Endpoints
| Endpoint | Purpose |
|---|---|
| `GET /credits/balance` | Current balance, total granted, used, unlimited flag |
| `GET /credits/costs` | All 6 feature costs + labels (public, no auth) |
| `POST /credits/validate` | Check if user can afford a feature (no deduction) |
| `GET /credits/history` | Last 50 credit transactions for the current user |

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
| `profiles` | `id, email, full_name, remaining_credits, total_credits_granted, is_unlimited, is_admin` | User profiles — synced from auth.users via trigger |
| `resumes` | `id, user_id, file_url, parsed_content (JSONB), resume_quality_feedback` | Uploaded resume metadata + extracted text |
| `ai_analyses` | `id, resume_id, analysis_type, output_data (JSONB), created_at` | All AI analysis results |
| `job_applications` | `id, user_id, resume_id, company_name, job_title, cover_letter_content, cover_letter_file_url, status` | Cover letter drafts and final PDFs |
| `credit_transactions` | `id, user_id, feature, credits_used, credits_before, credits_after, metadata, created_at` | Full audit log of every credit event |
| `ip_credit_claims` | `ip, user_id, granted_amount, created_at` | Anti-farming: one IP = one initial credit grant |
| `interview_reports` | `id, user_id, overall_score, qualitative_score, breakdown (JSONB), role, experience_level, questions_count, answers_count, created_at` | Persisted interview reports — survives Redis TTL |

### Supabase Migrations
- `SUPABASE_MIGRATION.sql` — Credit system (profiles columns, credit_transactions, ip_credit_claims, RPCs, trigger)
- `backend/SUPABASE_MIGRATION_interview_reports.sql` — interview_reports table + RLS policies

---

## Health Check Endpoint

```
GET /health
```
Verifies both Redis (`PING`) and Supabase (`get_db()`) are reachable. Returns:
```json
{
  "status": "ok",
  "checks": {
    "api": "ok",
    "redis": "ok",
    "supabase": "ok"
  }
}
```
The `run.sh` launcher polls this endpoint every 2 seconds (up to 20s) before starting the frontend.
