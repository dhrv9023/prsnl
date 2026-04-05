from fastapi import FastAPI, APIRouter
from app.core.config import settings
from app.api.v1.endpoints import ai_analysis, auth, resumes, cover_letter, interview, dashboard
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Create the main router for v1
api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(resumes.router, prefix="/resumes", tags=["resumes"])
api_router.include_router(ai_analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(cover_letter.router, prefix="/cover_letter", tags=["cover_letter"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(interview.router, prefix="/api/v1/interview", tags=["AI Interviewer"])

app.include_router(api_router, prefix=settings.API_V1_STR)

# Parse CORS origins from config
cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "AI Career Toolkit Backend is Running", 
        "env": settings.PROJECT_NAME
    }

@app.get("/health")
async def health_check():
    return {"status": "ok"}