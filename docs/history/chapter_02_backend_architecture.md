# Chapter 02 — Backend Architecture

## Directory Structure

```
backend/
├── app/
│   ├── main.py                  ← FastAPI app, all middleware, route registration
│   ├── .env                     ← secrets (gitignored)
│   ├── api/
│   │   ├── dependencies.py      ← get_current_user, require_credits
│   │   └── v1/
│   │       └── endpoints/
│   │           ├── auth.py      ← login, signup, logout, OAuth, /me
│   │           ├── resumes.py   ← upload, list, delete
│   │           ├── ai_analysis.py ← deep analysis, hiring intel, ATS match
│   │           ├── ats_score.py ← ATS scoring endpoint
│   │           ├── interview.py ← start, submit, submit_voice, end, history
│   │           ├── cover_letter.py ← generate, humanize, save PDF
│   │           ├── dashboard.py ← summary endpoint
│   │           ├── credits.py   ← balance, history, daily grant
│   │           ├── admin.py     ← stats, users, grant credits
│   │           └── utils.py     ← misc utilities
│   ├── core/
│   │   ├── config.py            ← all settings via pydantic-settings
│   │   ├── auth_cookies.py      ← cookie set/clear helpers
│   │   ├── rate_limit.py        ← SlowAPI limiter + composite rate key
│   │   └── request_logger.py    ← structured request logging middleware
│   ├── db/
│   │   ├── supabase.py          ← async Supabase client singleton
│   │   └── redis_client.py      ← async Redis client + session helpers
│   ├── schemas/
│   │   ├── models.py            ← all Pydantic request/response models
│   │   └── ats.py               ← ATS-specific schemas
│   └── services/
│       ├── ai_interview.py      ← question generation + answer evaluation
│       ├── ai_retry.py          ← shared retry utility for AI calls
│       ├── ats_general_engine.py ← rule-based ATS scorer (no JD)
│       ├── ats_jd_engine.py     ← JD-match ATS scorer
│       ├── ats_scoring.py       ← orchestrates both engines
│       ├── cover_letter_gen.py  ← cover letter + roast mode generation
│       ├── credits.py           ← credit grant/deduct/refund logic
│       ├── deep_analysis.py     ← deep resume analysis LLM service
│       ├── hiring_intel.py      ← hiring intelligence report service
│       ├── humanizer.py         ← AI tone humanizer service
│       ├── llm_client.py        ← shared Groq client + chat_complete()
│       ├── math_engine.py       ← embeddings + cosine similarity
│       ├── prompt_sanitizer.py  ← strips prompt injection from user text
│       └── resume_analyzer.py   ← PDF parsing + text extraction
```

---

## main.py — The App Entry Point

`main.py` is where everything comes together. It:

1. Initializes Sentry (if `SENTRY_DSN` is set)
2. Defines all middleware classes
3. Creates the FastAPI app
4. Registers all routers
5. Configures CORS
6. Adds middleware in the correct order

### Middleware Stack (outermost to innermost)

```
RequestLoggerMiddleware    ← logs every request with user ID, path, status, duration
ProxyHeadersMiddleware     ← trusts X-Forwarded-For from Render's load balancer (prod only)
CSRFMiddleware             ← double-submit CSRF validation (prod only)
BodySizeLimitMiddleware    ← rejects requests > 1MB (except /resumes/upload)
SecurityHeadersMiddleware  ← X-Content-Type-Options, X-Frame-Options, CSP, HSTS
CORSMiddleware             ← allows the Vercel frontend origin
```

Order matters. Middleware is applied in reverse registration order in Starlette — the last one added is the outermost wrapper. `RequestLoggerMiddleware` is added last so it wraps everything and captures the final status code.

### Security Headers (every response)

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(self), geolocation=()
X-XSS-Protection: 1; mode=block
Content-Security-Policy: (strict in prod, relaxed in dev)
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload (HTTPS only)
```

### OpenAPI docs

In production, `/docs`, `/redoc`, and `/openapi.json` are all disabled. This prevents attackers from browsing your API schema.

---

## config.py — Settings

All configuration is loaded from environment variables via `pydantic-settings`. The `.env` file lives at `backend/app/.env` (gitignored).

Key settings:

```python
ENVIRONMENT: "development" | "production"   # controls CSRF, cookie flags, rate limit behavior
GROQ_API_KEY                                # Groq LLM + Whisper STT
SUPABASE_URL / SUPABASE_SERVICE_ROLE        # DB access (service role bypasses RLS)
SUPABASE_ANON_KEY                           # PKCE OAuth exchange
SUPABASE_JWT_SECRET                         # JWT verification for rate limit key
HUGGINGFACE_API_KEY                         # Embeddings for ATS
REDIS_URL                                   # Upstash in prod, localhost in dev
CORS_ORIGINS                                # comma-separated allowed origins
COOKIE_SECURE / COOKIE_SAMESITE             # cookie security flags
AUTH_ACCESS_MAX_AGE_SECONDS = 345600        # 4 days
AUTH_REFRESH_MAX_AGE_SECONDS = 2592000      # 30 days
```

There's a `@model_validator` that runs at startup and raises `ValueError` if:
- `ENVIRONMENT=production` but `COOKIE_SECURE=False`
- `ENVIRONMENT=production` but `CORS_ORIGINS` contains `*`

This is a **fail-fast** pattern — the server won't start with a misconfigured production setup.

---

## dependencies.py — Auth & Credit Guards

Two FastAPI dependencies used across all protected routes:

### `get_current_user`

Reads the `__krs_sid` HttpOnly cookie, strips any legacy `Bearer ` prefix, and calls `supabase.auth.get_user(token)` to verify it. Returns the Supabase user object.

In development, if `X-Dev-Bypass: 1` header is present and `DEV_BYPASS_USER_ID` is set in `.env`, auth is skipped entirely and a mock user is returned. This header is never sent in production (the frontend only sends it when `import.meta.env.DEV` is true).

### `require_credits(feature, cost)`

A dependency factory. Returns a FastAPI `Depends` that:
1. Checks if dev bypass is active (skip deduction if so)
2. Calls `deduct_feature_credits()` which atomically deducts via the `deduct_credits` PostgreSQL RPC
3. Raises `HTTPException(402)` if insufficient credits

Usage in a route:

```python
@router.post("/start")
async def start_interview(
    body: StartInterviewRequest,
    user: CurrentUser,
    _credits=require_credits("interview", 25),
):
    ...
```

The `_credits` parameter is just a placeholder — the dependency runs for its side effect (deduction). If it raises, the route handler never executes.

---

## Request Flow (example: Deep Analysis)

```
1. Browser sends POST /api/v1/analysis/deep
   - Cookie: __krs_sid=<jwt>
   - Header: X-CSRF-Token=<token>
   - Body: { resume_id: "...", job_description: "..." }

2. RequestLoggerMiddleware: logs incoming request

3. CSRFMiddleware: validates X-CSRF-Token matches __krs_xsrf cookie

4. BodySizeLimitMiddleware: checks Content-Length < 1MB

5. CORSMiddleware: validates Origin header

6. Route handler: ai_analysis.deep_analysis_route()
   a. get_current_user: reads __krs_sid, calls supabase.auth.get_user()
   b. require_credits("deep_analysis", 15): deducts 15 credits atomically
   c. Fetches resume text from Supabase
   d. Calls deep_analysis.analyze() → sanitizes text → calls Groq LLM
   e. Saves result to ai_analyses table
   f. Returns JSON response

7. RequestLoggerMiddleware: logs response status + duration
```
