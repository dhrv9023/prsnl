import logging
import os

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.rate_limit import limiter
from app.api.v1.endpoints import ai_analysis, ats_score, auth, resumes, cover_letter, interview, dashboard

# ── Logging Setup ─────────────────────────────────────────────────────────────
# All backend modules should use `logging.getLogger(__name__)` instead of print()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("kareerist")

# ── Security Headers Middleware ───────────────────────────────────────────────


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds standard security headers to every response."""

    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; "
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


# ── FastAPI App ───────────────────────────────────────────────────────────────

_is_prod = settings.ENVIRONMENT == "production"

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
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# Security headers — added AFTER CORSMiddleware so it wraps all responses
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(BodySizeLimitMiddleware)

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
