from fastapi import FastAPI, APIRouter
from app.core.config import settings
from app.api.v1.endpoints import ai_analysis, auth
from app.api.v1.endpoints import auth, resumes, cover_letter
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import interview

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Create the main router for v1
api_router = APIRouter()

# We will include actual routes here later like:
api_router.include_router(auth.router, prefix="/auth", tags=["auth"]) # <--- ADD THIS LINE

api_router.include_router(resumes.router, prefix="/resumes", tags=["resumes"])
api_router.include_router(ai_analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(cover_letter.router, prefix="/cover_letter", tags=["cover_letter"])
app.include_router(interview.router, prefix="/api/v1/interview", tags=["AI Interviewer"])

app.include_router(api_router, prefix=settings.API_V1_STR)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows your HTML file to talk to the backend
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