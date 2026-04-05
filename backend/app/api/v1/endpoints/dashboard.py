# app/api/v1/endpoints/dashboard.py
from fastapi import APIRouter
from app.api.dependencies import CurrentUser
from app.db.supabase import get_db

router = APIRouter()


@router.get("/summary")
async def get_dashboard_summary(user: CurrentUser):
    """
    Returns all dashboard data in a single call:
    - User's resumes count
    - Total analyses count
    - Latest ATS score
    - Latest deep analysis (roast)
    - Analysis history list
    """
    user_id = user.id
    supabase = await get_db()

    # 1. Fetch user's resumes
    resumes_resp = await supabase.table("resumes") \
        .select("id, file_url, resume_quality_feedback, created_at") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .execute()

    resumes = resumes_resp.data or []

    # 2. Fetch all analyses for this user's resumes
    resume_ids = [r["id"] for r in resumes]

    analyses = []
    latest_ats_score = None
    latest_roast = None

    if resume_ids:
        analyses_resp = await supabase.table("ai_analyses") \
            .select("id, resume_id, analysis_type, output_data, created_at") \
            .in_("resume_id", resume_ids) \
            .order("created_at", desc=True) \
            .execute()

        analyses = analyses_resp.data or []

        # 3. Extract latest ATS score
        for a in analyses:
            if a["analysis_type"] == "job_match_score":
                try:
                    latest_ats_score = a["output_data"]["score"]
                except (KeyError, TypeError):
                    pass
                break  # first match is latest (sorted desc)

        # 4. Extract latest roast
        for a in analyses:
            if a["analysis_type"] == "general_roast":
                latest_roast = a["output_data"]
                break

    # 5. Build analysis history
    # First, create a mapping of resume_id to its original file name
    resume_id_to_name = {r["id"]: r.get("file_name", "Unknown Document") for r in resumes}

    history = []
    for a in analyses:
        item = {
            "id": a["id"],
            "resume_id": a["resume_id"],
            "resume_name": resume_id_to_name.get(a["resume_id"], "Unknown Document"),
            "type": a["analysis_type"],
            "created_at": a["created_at"],
            "score": None,
            "output_data": a.get("output_data") # Ensure the frontend has full details
        }
        try:
            if a["analysis_type"] == "job_match_score":
                item["score"] = a["output_data"]["score"]
            elif a["analysis_type"] == "general_roast":
                # Try to extract overall feedback as the "score" label
                item["score"] = a["output_data"].get("overall_feedback")
        except (KeyError, TypeError):
            pass
        history.append(item)

    return {
        "total_resumes": len(resumes),
        "total_analyses": len(analyses),
        "latest_ats_score": latest_ats_score,
        "latest_roast": latest_roast,
        "analysis_history": history[:20],  # cap at 20 items
    }
