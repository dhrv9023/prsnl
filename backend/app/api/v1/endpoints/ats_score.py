import logging

from fastapi import APIRouter, Request

from app.core.config import settings
from app.core.rate_limit import ats_rate_key, limiter
from app.schemas.ats import ATSScoreRequest, ATSScoreResponse
from app.services.ats_scoring import score_resume

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/score",
    response_model=ATSScoreResponse,
    summary="ATS resume score (general or JD mode)",
)
@limiter.limit(settings.RATE_LIMIT_ATS, key_func=ats_rate_key)
async def ats_score(request: Request, body: ATSScoreRequest) -> ATSScoreResponse:
    """
    Single entrypoint for ATS scoring. Routes by `mode`:
    - **general**: rule-based pipeline (Phase 2+)
    - **jd**: embedding similarity vs job description (Phase 3+)
    """
    return await score_resume(body)
