import logging
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.endpoints import ai_analysis, auth, resumes, cover_letter, interview, dashboard

# ── Logging Setup ─────────────────────────────────────────────────────────────
# All backend modules should use `logging.getLogger(__name__)` instead of print()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("kareerist")

# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# ── Routes ────────────────────────────────────────────────────────────────────

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(resumes.router, prefix="/resumes", tags=["Resumes"])
api_router.include_router(ai_analysis.router, prefix="/analysis", tags=["AI Analysis"])
api_router.include_router(cover_letter.router, prefix="/cover_letter", tags=["Cover Letter"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])

app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(interview.router, prefix="/api/v1/interview", tags=["AI Interview"])

# ── CORS ──────────────────────────────────────────────────────────────────────

cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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