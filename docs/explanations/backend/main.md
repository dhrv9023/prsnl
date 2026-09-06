# main.py

**Location:** `prsnl/backend/app/main.py`  
**Type:** Application Entry Point / FastAPI App Factory

## What This File Does

This is the root of the entire backend application. It creates the FastAPI app instance, registers all API routers, configures middleware (CORS, security headers, body size limits, request logging), initializes Sentry error monitoring, and defines system health-check endpoints. Every HTTP request to the backend passes through this file's middleware stack.

## How It Fits Into The System

- **What triggers it:** Uvicorn loads this module on server start. Every incoming HTTP request flows through the middleware stack defined here.
- **What it depends on:** `app.core.config` (settings), `app.core.rate_limit` (limiter), `app.core.request_logger` (logging middleware), and all endpoint routers.
- **What depends on it:** Nothing imports from main.py — it's the top-level orchestrator. The deployment platform (Render) points at `app.main:app`.

## Code Breakdown

### Logging Setup
**Lines:** 1–27  
Configures Python's built-in logging with a timestamped format. All backend modules should use `logging.getLogger(__name__)` instead of `print()`. The root logger is set to INFO level with a human-readable format showing time, level, module name, and message.

### Sentry Error Monitoring
**Lines:** 29–40  
Initializes Sentry SDK if `SENTRY_DSN` is set in environment variables. Traces 10% of requests for performance monitoring. PII is never sent. Only activates in production when the DSN is configured.

### SecurityHeadersMiddleware class
**Lines:** 42–82  
A Starlette `BaseHTTPMiddleware` that adds security headers to every response:
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `X-Frame-Options: DENY` — prevents clickjacking
- `Referrer-Policy` — limits referrer leakage
- `Permissions-Policy` — disables camera/mic/geo
- `X-XSS-Protection` — legacy XSS filter
- `Content-Security-Policy` — strict in production, relaxed in development
- `Strict-Transport-Security` — HSTS only over HTTPS

In production, CSP is locked down to self + Supabase + Google Fonts. In development, it allows unsafe-inline/eval and WebSocket connections for Vite HMR.

### BodySizeLimitMiddleware class
**Lines:** 84–100  
Rejects requests with `Content-Length` exceeding 1 MB for non-upload routes. The `/api/v1/resumes/upload` path is exempted since it handles PDF files up to 5 MB. Returns a 413 JSON response if the limit is exceeded.

### FastAPI App Creation
**Lines:** 102–113  
Creates the FastAPI instance with:
- OpenAPI/docs disabled in production (security)
- Rate limiter attached to app state
- Rate limit exceeded handler registered

### Route Registration
**Lines:** 115–128  
Creates an `APIRouter` and includes all endpoint routers with their prefixes:
- `/api/v1/auth` — authentication
- `/api/v1/resumes` — resume upload/management
- `/api/v1/analysis` — ATS scoring, deep analysis, hiring intel
- `/api/v1/cover_letter` — cover letter generation
- `/api/v1/dashboard` — dashboard summary
- `/api/v1/admin` — admin panel
- `/api/v1/credits` — credit balance/history
- `/api/v1/utils` — utility endpoints (Hinglish)
- `/api/v1/interview` — AI mock interview (mounted separately)
- `/api/ats` — standalone ATS scoring endpoint (mounted separately)

### CORS Configuration
**Lines:** 130–139  
Parses `CORS_ORIGINS` from settings (comma-separated), enables credentials (for HttpOnly cookies), and allows standard HTTP methods and headers.

### Middleware Stack Order
**Lines:** 141–149  
Middleware is added in reverse execution order:
1. `SecurityHeadersMiddleware` — wraps all responses
2. `BodySizeLimitMiddleware` — rejects oversized payloads
3. `RequestLoggerMiddleware` — outermost, captures all requests
4. `ProxyHeadersMiddleware` — trusts X-Forwarded-For in production

### Root Endpoint (`GET /`)
**Lines:** 153–155  
Returns a simple JSON confirming the backend is running with version info.

### Health Check (`GET /health`)
**Lines:** 158–176  
Verifies Redis and Supabase connectivity. Returns `{ status: "ok" | "degraded", checks: {...} }`. Used by monitoring services to detect outages.

### Ping Endpoint (`GET /ping`)
**Lines:** 179–185  
Lightweight keep-alive endpoint for cron-job.org or UptimeRobot. Pinged every 10 minutes to prevent Render free-tier cold starts. No auth required, returns minimal `{ ok: true }`.

## Things To Know Before Editing

- Middleware order matters. CORS must be added before security headers. Request logger should be outermost.
- Adding a new router requires importing it at the top AND including it in the `api_router` or directly on `app`.
- The interview and ATS routers are mounted directly on `app` (not through `api_router`) because they have different prefix patterns.
- Disabling OpenAPI in production is intentional — don't re-enable it without understanding the security implications.
- The `ProxyHeadersMiddleware` trusts all hosts (`["*"]`) — this is safe because Render's load balancer is the only thing that can reach the server directly.
