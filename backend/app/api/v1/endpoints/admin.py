# app/api/v1/endpoints/admin.py
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.api.dependencies import CurrentUser
from app.db.supabase import get_db
from app.services.credits import admin_grant_credits, FEATURE_COSTS

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Admin guard ────────────────────────────────────────────────────────────────

async def _require_admin(user: CurrentUser) -> dict:
    """
    Server-side admin guard. Reads is_admin from public.profiles.
    Raises 403 if the user is not an admin — even if the frontend thinks they are.
    """
    supabase = await get_db()
    uid = getattr(user, "id", None)
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    res = await supabase.table("profiles").select("is_admin, email").eq("id", str(uid)).limit(1).execute()
    if not res.data or not res.data[0].get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return res.data[0]


# ── GET /admin/stats ───────────────────────────────────────────────────────────

@router.get("/stats")
async def get_admin_stats(user: CurrentUser):
    """
    Returns live platform stats: users, resumes, analyses, cover letters, interviews.
    Includes credit system stats: total credits granted, used, and per-feature breakdown.
    Server-side admin check — the is_admin flag must be set in public.profiles.
    """
    await _require_admin(user)

    supabase = await get_db()

    # ── Total users ──────────────────────────────────────────────────────────
    try:
        users_resp = await supabase.table("profiles").select("id", count="exact").execute()
        total_users = users_resp.count or 0
    except Exception as e:
        logger.warning("Admin stats: failed to count users: %s", e)
        total_users = -1

    # ── Total resumes ────────────────────────────────────────────────────────
    try:
        resumes_resp = await supabase.table("resumes").select("id", count="exact").execute()
        total_resumes = resumes_resp.count or 0
    except Exception as e:
        logger.warning("Admin stats: failed to count resumes: %s", e)
        total_resumes = -1

    # ── Analyses breakdown ───────────────────────────────────────────────────
    try:
        analyses_resp = await supabase.table("ai_analyses").select("analysis_type", count="exact").execute()
        total_analyses = analyses_resp.count or 0
        analyses_data = analyses_resp.data or []

        type_counts: dict[str, int] = {}
        for a in analyses_data:
            t = a.get("analysis_type", "unknown")
            type_counts[t] = type_counts.get(t, 0) + 1
    except Exception as e:
        logger.warning("Admin stats: failed to count analyses: %s", e)
        total_analyses = -1
        type_counts = {}

    # ── Cover letters (from job_applications table) ──────────────────────────
    # L-6 fix: cover letters are stored in job_applications, not ai_analyses
    try:
        cl_resp = await supabase.table("job_applications").select("id", count="exact").execute()
        total_cover_letters = cl_resp.count or 0
    except Exception as e:
        logger.warning("Admin stats: failed to count cover letters: %s", e)
        total_cover_letters = 0

    # ── Interviews (from interview_reports table) ─────────────────────────────
    # L-6 fix: interviews are stored in interview_reports, not ai_analyses
    try:
        iv_resp = await supabase.table("interview_reports").select("id", count="exact").execute()
        total_interviews = iv_resp.count or 0
    except Exception as e:
        logger.warning("Admin stats: failed to count interviews: %s", e)
        total_interviews = 0

    # ── New users in last 7 days ─────────────────────────────────────────────
    try:
        since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        new_users_resp = (
            await supabase.table("profiles")
            .select("id", count="exact")
            .gte("created_at", since)
            .execute()
        )
        new_users_7d = new_users_resp.count or 0
    except Exception as e:
        logger.warning("Admin stats: failed to count new users: %s", e)
        new_users_7d = -1

    # ── Most recent 10 analyses (activity feed) ──────────────────────────────
    try:
        recent_resp = (
            await supabase.table("ai_analyses")
            .select("analysis_type, created_at")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        recent_activity = recent_resp.data or []
    except Exception as e:
        logger.warning("Admin stats: failed to fetch recent activity: %s", e)
        recent_activity = []

    # ── Credit system stats ──────────────────────────────────────────────────
    credit_stats: dict = {
        "total_credits_granted": 0,
        "total_credits_used": 0,
        "per_feature_usage": {},
    }
    try:
        # H-6 fix: use DB-side aggregation instead of fetching all profile rows.
        # At scale, fetching every profile row for a SUM is a full table scan.
        credit_agg = await supabase.rpc("admin_credit_stats").execute()
        agg = credit_agg.data or {}
        if isinstance(agg, list):
            agg = agg[0] if agg else {}

        total_granted = agg.get("total_granted", 0) or 0
        total_remaining = agg.get("total_remaining", 0) or 0

        credit_stats["total_credits_granted"] = total_granted
        credit_stats["total_credits_used"] = max(0, total_granted - total_remaining)

        # Per-feature credit usage from credit_transactions
        # Limit to last 10,000 rows to avoid unbounded scans at scale.
        # At scale this should be replaced with a DB-side aggregate RPC.
        txn_resp = await supabase.table("credit_transactions") \
            .select("feature, credits_used") \
            .order("created_at", desc=True) \
            .limit(10000) \
            .execute()

        per_feature: dict[str, int] = {}
        for txn in (txn_resp.data or []):
            feat = txn.get("feature", "unknown")
            used = txn.get("credits_used", 0) or 0
            per_feature[feat] = per_feature.get(feat, 0) + used

        credit_stats["per_feature_usage"] = per_feature

    except Exception as e:
        logger.warning("Admin stats: failed to fetch credit stats: %s", e)

    return {
        "total_users": total_users,
        "new_users_7d": new_users_7d,
        "total_resumes": total_resumes,
        "total_analyses": total_analyses,
        "total_cover_letters": total_cover_letters,
        "total_interviews": total_interviews,
        "analysis_type_breakdown": type_counts,
        "recent_activity": recent_activity,
        "credit_stats": credit_stats,
        "feature_costs": FEATURE_COSTS,
    }


# ── GET /admin/users ───────────────────────────────────────────────────────────

@router.get("/users")
async def get_all_users(user: CurrentUser):
    """
    Returns all enrolled users with their credit balances and usage stats.
    Sorted by last_sign_in_at (most recent login first), with never-logged-in users at the bottom.
    Admin only.
    """
    await _require_admin(user)
    supabase = await get_db()

    try:
        profiles_resp = await supabase.table("profiles") \
            .select("id, email, full_name, remaining_credits, total_credits_granted, is_unlimited, is_admin, created_at, last_sign_in_at") \
            .order("last_sign_in_at", desc=True) \
            .execute()

        users = profiles_resp.data or []

        # Enrich with used credits
        for u in users:
            granted = u.get("total_credits_granted", 0) or 0
            remaining = u.get("remaining_credits", 0) or 0
            u["credits_used"] = max(0, granted - remaining)

        return users

    except Exception as e:
        logger.error("Admin users list failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch users.")


# ── GET /admin/users/{user_id}/activity ───────────────────────────────────────

@router.get("/users/{target_user_id}/activity")
async def get_user_activity(target_user_id: str, user: CurrentUser):
    """Returns full activity summary for a specific user: resumes, analyses, interviews, cover letters. Admin only."""
    await _require_admin(user)
    supabase = await get_db()

    result = {}

    # Resumes
    try:
        r = await supabase.table("resumes") \
            .select("id, file_url, resume_quality_feedback, created_at") \
            .eq("user_id", target_user_id) \
            .order("created_at", desc=True).limit(20).execute()
        result["resumes"] = r.data or []
    except Exception as e:
        logger.warning("Activity: resumes failed for %s: %s", target_user_id, e)
        result["resumes"] = []

    # Analyses
    try:
        a = await supabase.table("ai_analyses") \
            .select("id, analysis_type, created_at") \
            .eq("user_id", target_user_id) \
            .order("created_at", desc=True).limit(30).execute()
        result["analyses"] = a.data or []
    except Exception as e:
        logger.warning("Activity: analyses failed for %s: %s", target_user_id, e)
        result["analyses"] = []

    # Interviews
    try:
        i = await supabase.table("interview_reports") \
            .select("id, overall_score, qualitative_score, role, experience_level, questions_count, created_at") \
            .eq("user_id", target_user_id) \
            .order("created_at", desc=True).limit(20).execute()
        result["interviews"] = i.data or []
    except Exception as e:
        logger.warning("Activity: interviews failed for %s: %s", target_user_id, e)
        result["interviews"] = []

    # Cover letters
    try:
        cl = await supabase.table("job_applications") \
            .select("id, company_name, job_title, created_at") \
            .eq("user_id", target_user_id) \
            .order("created_at", desc=True).limit(20).execute()
        result["cover_letters"] = cl.data or []
    except Exception as e:
        logger.warning("Activity: cover letters failed for %s: %s", target_user_id, e)
        result["cover_letters"] = []

    # Credit transactions
    try:
        ct = await supabase.table("credit_transactions") \
            .select("id, feature, credits_used, credits_before, credits_after, created_at") \
            .eq("user_id", target_user_id) \
            .order("created_at", desc=True).limit(30).execute()
        result["credit_transactions"] = ct.data or []
    except Exception as e:
        logger.warning("Activity: credit_transactions failed for %s: %s", target_user_id, e)
        result["credit_transactions"] = []

    return result


# ── GET /admin/users/{user_id}/credit-history ─────────────────────────────────

@router.get("/users/{target_user_id}/credit-history")
async def get_user_credit_history(target_user_id: str, user: CurrentUser):
    """Returns the full credit transaction history for a specific user. Admin only."""
    await _require_admin(user)
    supabase = await get_db()

    try:
        res = await supabase.table("credit_transactions") \
            .select("id, feature, credits_used, credits_before, credits_after, metadata, created_at") \
            .eq("user_id", target_user_id) \
            .order("created_at", desc=True) \
            .limit(100).execute()
        return res.data or []
    except Exception as e:
        logger.error("Admin credit history failed for user %s: %s", target_user_id, e)
        raise HTTPException(status_code=500, detail="Failed to fetch credit history.")


# ── POST /admin/users/{user_id}/grant-credits ─────────────────────────────────

class GrantCreditsRequest(BaseModel):
    amount: int = Field(..., gt=0, le=10000, description="Credits to grant (1–10000)")
    reason: str = Field(default="admin_grant", max_length=100)


@router.post("/users/{target_user_id}/grant-credits")
async def grant_credits_to_user(
    target_user_id: str,
    body: GrantCreditsRequest,
    user: CurrentUser,
):
    """
    Admin: grant additional credits to any user.
    Also used to top up users who run out.
    """
    admin = await _require_admin(user)
    supabase = await get_db()

    result = await admin_grant_credits(
        supabase=supabase,
        target_user_id=target_user_id,
        amount=body.amount,
        granted_by=str(getattr(user, "id", "admin")),
        reason=body.reason,
    )

    # ✅ SECURITY: Audit log for admin credit grants
    logger.warning(
        "AUDIT: Admin %s (%s) granted %d credits to user %s. Reason: %s. New balance: %d",
        admin.get("email"),
        str(user.id),
        body.amount,
        target_user_id,
        body.reason,
        result.get("remaining", 0)
    )

    return {
        "msg": f"Successfully granted {body.amount} credits.",
        "target_user_id": target_user_id,
        **result,
    }


# ── POST /admin/users/{user_id}/set-unlimited ─────────────────────────────────

class SetUnlimitedRequest(BaseModel):
    unlimited: bool


@router.post("/users/{target_user_id}/set-unlimited")
async def set_user_unlimited(
    target_user_id: str,
    body: SetUnlimitedRequest,
    user: CurrentUser,
):
    """
    Admin: toggle unlimited credits for a user (e.g. for internal testers, admins).
    Unlimited users bypass all credit deductions.
    """
    admin = await _require_admin(user)
    supabase = await get_db()

    try:
        await supabase.table("profiles") \
            .update({"is_unlimited": body.unlimited}) \
            .eq("id", target_user_id).execute()

        # ✅ SECURITY: Audit log for unlimited status changes
        logger.warning(
            "AUDIT: Admin %s (%s) set is_unlimited=%s for user %s",
            admin.get("email"),
            str(user.id),
            body.unlimited,
            target_user_id
        )

        return {
            "msg": f"User unlimited status set to {body.unlimited}.",
            "target_user_id": target_user_id,
            "is_unlimited": body.unlimited,
        }
    except Exception as e:
        logger.error("set-unlimited failed for user %s: %s", target_user_id, e)
        raise HTTPException(status_code=500, detail="Failed to update unlimited status.")


# ── GET /admin/docs (Documentation Portal) ────────────────────────────────────

def _find_docs_dir() -> Path:
    """Locate the project docs directory relative to repository root or CWD."""
    for parent in Path(__file__).resolve().parents:
        cand = parent / "docs"
        if cand.is_dir() and (cand / "architecture").is_dir():
            return cand
    cwd = Path.cwd()
    for cand in [cwd / "docs", cwd.parent / "docs", cwd.parent.parent / "docs"]:
        if cand.is_dir() and (cand / "architecture").is_dir():
            return cand
    return Path(__file__).resolve().parents[5] / "docs"


def _categorize_doc(rel_path: str) -> tuple[str, str]:
    """Categorize document into logical navigation taxonomy."""
    if rel_path.startswith("architecture/flowcharts/"):
        return "Architecture & Flowcharts", "System Flowcharts (12 Diagrams)"
    elif rel_path.startswith("architecture/"):
        return "Architecture & Flowcharts", "Overview & Guide"
    elif rel_path.startswith("explanations/backend/"):
        return "Backend Architecture", "FastAPI & Core Services"
    elif rel_path.startswith("explanations/frontend/"):
        return "Frontend Architecture", "React Components & State"
    elif rel_path.startswith("explanations/database/"):
        return "Database & Migrations", "Schema & RLS Policies"
    elif rel_path.startswith("explanations/blog/"):
        return "Blog System", "Blog Architecture"
    elif rel_path.startswith("qa/"):
        return "QA Audits & Pentest", "Security & QA Reports"
    elif rel_path.startswith("history/"):
        return "Project History", "Evolution & Changelog"
    elif rel_path.startswith("security/"):
        return "Security Specifications", "Security Standards"
    elif rel_path.startswith("specifications/"):
        return "Master Specifications", "Project Master Docs"
    return "General", "General Documentation"


def _extract_title(f: Path) -> str:
    """Extract clean title from first Markdown # heading or filename."""
    title = f.stem.replace("_", " ").title()
    try:
        lines = f.read_text(encoding="utf-8", errors="ignore").splitlines()
        for line in lines:
            line = line.strip()
            if line.startswith("# "):
                candidate = line[2:].strip()
                if candidate:
                    return candidate
    except Exception:
        pass
    return title


@router.get("/docs")
async def get_admin_docs_catalog(user: CurrentUser):
    """
    Admin: returns the complete catalog of all 119 documentation files,
    categorized by architecture, backend, frontend, database, QA, and history.
    """
    await _require_admin(user)
    docs_dir = _find_docs_dir()
    if not docs_dir or not docs_dir.is_dir():
        raise HTTPException(status_code=404, detail="Documentation directory not found.")

    items = []
    for f in sorted(docs_dir.glob("**/*.*")):
        if f.suffix not in [".md", ".html"]:
            continue
        rel_path = f.relative_to(docs_dir).as_posix()
        cat, group = _categorize_doc(rel_path)
        title = _extract_title(f)

        items.append({
            "id": rel_path.replace("/", "__").replace(".", "_"),
            "path": rel_path,
            "title": title,
            "category": cat,
            "group": group,
            "size": f.stat().st_size,
            "is_flowchart": "flowcharts" in rel_path or "diagram" in rel_path.lower(),
        })

    return {
        "docs": items,
        "total": len(items),
    }


@router.get("/docs/content")
async def get_admin_doc_content(path: str, user: CurrentUser):
    """
    Admin: returns the raw verbatim markdown or HTML content for a specific document.
    Enforces strict path-traversal validation to prevent directory traversal attacks.
    """
    await _require_admin(user)
    docs_dir = _find_docs_dir()
    if not docs_dir or not docs_dir.is_dir():
        raise HTTPException(status_code=404, detail="Documentation directory not found.")

    # Strict path traversal prevention: ensure target is strictly inside docs_dir
    target = (docs_dir / path).resolve()
    try:
        target.relative_to(docs_dir.resolve())
    except ValueError:
        logger.warning("AUDIT: Path traversal blocked for user %s with path: %s", getattr(user, "id", None), path)
        raise HTTPException(status_code=403, detail="Invalid path traversal detected.")

    if not target.is_file():
        raise HTTPException(status_code=404, detail=f"Document not found: {path}")

    try:
        content = target.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        logger.error("Failed to read document %s: %s", path, e)
        raise HTTPException(status_code=500, detail="Failed to read document content.")

    return {
        "path": path,
        "filename": target.name,
        "size": target.stat().st_size,
        "content": content,
    }

