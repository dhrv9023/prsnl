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
    - Latest hiring intelligence report
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
    latest_intel = None
    latest_deep_analysis = None

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

        # 4. Extract latest hiring intel
        for a in analyses:
            if a["analysis_type"] == "hiring_intel":
                latest_intel = a["output_data"]
                break

        # 5. Extract latest deep analysis
        for a in analyses:
            if a["analysis_type"] == "deep_analysis":
                latest_deep_analysis = a["output_data"]
                break

    # 5. Build analysis history
    # Build a mapping of resume_id → human-readable file name
    # The file_url format is: "user_id/timestamp_filename.pdf"
    def _extract_name(url: str) -> str:
        parts = url.split("/")
        name = parts[-1] if parts else "Unknown Document"
        # Strip leading timestamp (e.g., "1712345678_resume.pdf" → "resume.pdf")
        import re
        name = re.sub(r"^\d+_", "", name)
        return name

    resume_id_to_name = {r["id"]: _extract_name(r.get("file_url", "")) for r in resumes}

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
            elif a["analysis_type"] == "hiring_intel":
                item["score"] = a["output_data"].get("report", {}).get("final_verdict", {}).get("hiring_readiness")
            elif a["analysis_type"] == "deep_analysis":
                item["score"] = a["output_data"].get("overall_feedback")
        except (KeyError, TypeError):
            pass
        history.append(item)

    return {
        "total_resumes": len(resumes),
        "total_analyses": len(analyses),
        "latest_ats_score": latest_ats_score,
        "latest_intel": latest_intel,
        "latest_deep_analysis": latest_deep_analysis,
        "analysis_history": history[:20],
    }
