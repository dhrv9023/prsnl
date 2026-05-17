import logging

import sentry_sdk
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.request_logger import RequestLoggerMiddleware
from app.core.auth_cookies import CSRF_COOKIE_NAME
from app.api.v1.endpoints import ai_analysis, ats_score, auth, resumes, cover_letter, interview, dashboard, admin, credits, utils

# ── Logging Setup ─────────────────────────────────────────────────────────────
# All backend modules should use `logging.getLogger(__name__)` instead of print()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("kareerist")

# ── Sentry Error Monitoring ───────────────────────────────────────────────────
# Initialise before the app is created so all exceptions are captured.
# Set SENTRY_DSN in production environment variables.

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1,   # 10% of requests traced — adjust as needed
        send_default_pii=False,   # never send user PII to Sentry
    )
    logger.info("Sentry error monitoring enabled (environment: %s)", settings.ENVIRONMENT)

# ── Security Headers Middleware ───────────────────────────────────────────────

_is_prod = settings.ENVIRONMENT == "production"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds standard security headers to every response."""

    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Production CSP: allow the React app to load its own assets, fonts, and Supabase
        # API-only backend doesn't serve HTML, but this protects any error pages
        if _is_prod:
            csp_parts = [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com",
                "img-src 'self' data: https://*.supabase.co",
                "connect-src 'self' https://*.supabase.co",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'",
            ]
            response.headers["Content-Security-Policy"] = "; ".join(csp_parts)
        else:
            # Development: relaxed CSP
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https://*.supabase.co; "
                "connect-src 'self' https://*.supabase.co ws: wss:; "
                "frame-ancestors 'none';"
            )

        # HSTS — only meaningful over HTTPS; skip for plain HTTP dev server
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        return response


_MAX_JSON_BODY = 1 * 1024 * 1024  # 1 MB — stops oversized JSON payloads on non-upload routes


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Rejects requests whose Content-Length exceeds 1 MB for non-file routes."""

    _UPLOAD_PATHS = {"/api/v1/resumes/upload"}

    async def dispatch(self, request: StarletteRequest, call_next) -> Response:
        if request.url.path not in self._UPLOAD_PATHS:
            cl = request.headers.get("content-length")
            if cl and int(cl) > _MAX_JSON_BODY:
                return Response(
                    content='{"detail":"Request body too large"}',
                    status_code=413,
                    media_type="application/json",
                )
        return await call_next(request)


# ── CSRF Double-Submit Middleware ─────────────────────────────────────────────

# Paths that are exempt from CSRF validation:
# - GET/HEAD/OPTIONS are safe methods (no state change)
# - /auth/* login/signup/oauth endpoints set the cookie in the first place
# - /health and /ping are public read-only endpoints
_CSRF_EXEMPT_PREFIXES = (
    "/auth/",
    "/api/v1/auth/",
    "/health",
    "/ping",
    "/",
)
_CSRF_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Double-submit CSRF protection for cross-site cookie setups (SameSite=None).

    How it works:
    1. On login, the backend sets a JS-readable `csrf_token` cookie alongside
       the HttpOnly auth cookies.
    2. The frontend reads `csrf_token` from document.cookie and sends it as
       the `X-CSRF-Token` request header on every POST/PUT/DELETE.
    3. This middleware checks that the header value matches the cookie value.
    4. An attacker's cross-site page cannot read the cookie (same-origin policy),
       so they cannot forge the header — CSRF is defeated.

    Only enforced in production (SameSite=None is only set in production).
    In development SameSite=Lax is sufficient and CSRF checks are skipped.
    """

    async def dispatch(self, request: StarletteRequest, call_next) -> Response:
        # Only enforce in production where SameSite=None is active
        if settings.ENVIRONMENT != "production":
            return await call_next(request)

        # Safe HTTP methods don't change state — no CSRF risk
        if request.method in _CSRF_SAFE_METHODS:
            return await call_next(request)

        # Exempt auth endpoints (they create the session, not consume it)
        path = request.url.path
        if any(path.startswith(p) for p in _CSRF_EXEMPT_PREFIXES):
            return await call_next(request)

        # Validate double-submit: header must match cookie
        cookie_token = request.cookies.get(CSRF_COOKIE_NAME, "")
        header_token = request.headers.get("X-CSRF-Token", "")

        if not cookie_token or not header_token:
            return Response(
                content='{"detail":"CSRF token missing. Refresh the page and try again."}',
                status_code=403,
                media_type="application/json",
            )

        # Constant-time comparison to prevent timing attacks
        import hmac
        if not hmac.compare_digest(cookie_token, header_token):
            return Response(
                content='{"detail":"CSRF token mismatch. Refresh the page and try again."}',
                status_code=403,
                media_type="application/json",
            )

        return await call_next(request)


# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=None if _is_prod else f"{settings.API_V1_STR}/openapi.json",
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    # CSRF is handled by SameSite=Lax cookies (set in auth endpoints).
    # A custom origin-check middleware is redundant and breaks Vite proxy setups.
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Routes ────────────────────────────────────────────────────────────────────

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(resumes.router, prefix="/resumes", tags=["Resumes"])
api_router.include_router(ai_analysis.router, prefix="/analysis", tags=["AI Analysis"])
api_router.include_router(cover_letter.router, prefix="/cover_letter", tags=["Cover Letter"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(credits.router, prefix="/credits", tags=["Credits"])
api_router.include_router(utils.router, prefix="/utils", tags=["Utils"])

app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(interview.router, prefix="/api/v1/interview", tags=["AI Interview"])
app.include_router(ats_score.router, prefix="/api/ats", tags=["ATS Resume Analyzer"])

# ── CORS ──────────────────────────────────────────────────────────────────────

cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
)

# Security headers — added AFTER CORSMiddleware so it wraps all responses
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(BodySizeLimitMiddleware)
app.add_middleware(CSRFMiddleware)
# Request logger — outermost so it captures all requests including errors
app.add_middleware(RequestLoggerMiddleware)

# Trust proxy headers (X-Forwarded-For, X-Forwarded-Proto) from Render's load balancer
if _is_prod:
    app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# ── Health & Root ─────────────────────────────────────────────────────────────


@app.get("/", tags=["System"])
async def root():
    return {"message": "Kareerist Backend is running", "version": "1.0.0"}


@app.get("/health", tags=["System"])
async def health_check():
    """Verifies that Redis and Supabase are reachable."""
    checks = {"api": "ok"}

    # Redis check
    try:
        from app.db.redis_client import get_redis
        r = await get_redis()
        await r.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"

    # Supabase check
    try:
        from app.db.supabase import get_db
        await get_db()
        checks["supabase"] = "ok"
    except Exception:
        checks["supabase"] = "error"

    status = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": status, "checks": checks}


@app.get("/ping", tags=["System"])
async def ping():
    """
    Lightweight keep-alive endpoint for cron-job.org or UptimeRobot.
    Ping every 10 minutes to prevent Render free-tier cold starts.
    No auth required — returns minimal payload.
    """
    return {"ok": True}
