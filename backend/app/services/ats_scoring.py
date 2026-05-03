import logging

from app.schemas.ats import ATSScoreRequest, ATSScoreResponse
from app.services.ats_general_engine import compute_general_score
from app.services.ats_jd_engine import compute_jd_score

logger = logging.getLogger(__name__)


async def score_resume(body: ATSScoreRequest) -> ATSScoreResponse:
    if body.mode == "general":
        logger.info("ATS score request: general mode (%d chars)", len(body.resume_text))
        score = compute_general_score(body.resume_text)
        return ATSScoreResponse(mode="general", score=score)

    logger.info(
        "ATS score request: jd mode (resume %d chars, jd %d chars)",
        len(body.resume_text),
        len(body.job_description),
    )
    score = await compute_jd_score(body.resume_text, body.job_description)
    return ATSScoreResponse(mode="jd", score=score)
