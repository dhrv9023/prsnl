# app/services/credits.py
"""
Credit System Service.

Handles:
- Client IP extraction (proxy-aware)
- IP-based initial credit grant (anti-farming)
- Atomic credit deduction via PostgreSQL RPC
- Admin unlimited bypass
"""
import logging
from typing import Optional

from fastapi import HTTPException

logger = logging.getLogger(__name__)

# ── Feature cost constants ─────────────────────────────────────────────────────

FEATURE_COSTS: dict[str, int] = {
    "ats_score":      5,
    "deep_analysis":  15,
    "hiring_intel":   25,
    "interview":      25,
    "cover_letter":   10,
    "humanize":       15,
}

# Human-readable feature labels for API responses
FEATURE_LABELS: dict[str, str] = {
    "ats_score":      "ATS Score Analyzer",
    "deep_analysis":  "Deep Resume Analysis",
    "hiring_intel":   "Hiring Intelligence Report",
    "interview":      "Mock Interview",
    "cover_letter":   "Cover Letter Generator",
    "humanize":       "Humanize AI Tone",
}

INITIAL_CREDIT_GRANT = 100

LOW_CREDIT_THRESHOLD = 20  # warn the user when remaining credits fall below this


# ── Initial credit grant (IP-gated) ───────────────────────────────────────────

async def grant_initial_credits(supabase, user_id: str, client_ip: str) -> int:
    """
    Grants INITIAL_CREDIT_GRANT credits to a new user if their IP has not already
    claimed credits. Idempotent — safe to call multiple times for the same user.

    Returns the amount granted (100 or 0).
    """
    if not user_id or not client_ip or client_ip == "unknown":
        logger.warning("grant_initial_credits: missing user_id or IP — skipping grant")
        return 0

    try:
        # Check if this user already received credits
        profile_resp = await supabase.table("profiles") \
            .select("total_credits_granted, is_unlimited") \
            .eq("id", user_id) \
            .limit(1).execute()

        if profile_resp.data and profile_resp.data[0].get("total_credits_granted", 0) > 0:
            logger.info("grant_initial_credits: user %s already has credits — skip", user_id)
            return 0

        # Check if this IP has already been used to claim credits
        ip_resp = await supabase.table("ip_credit_claims") \
            .select("ip, granted_amount") \
            .eq("ip", client_ip) \
            .limit(1).execute()

        if ip_resp.data:
            logger.warning(
                "grant_initial_credits: IP %s already claimed credits (user %s denied)",
                client_ip, user_id
            )
            return 0

        # Grant credits via PostgreSQL function (atomic)
        await supabase.rpc("grant_credits", {
            "p_user_id": user_id,
            "p_amount":  INITIAL_CREDIT_GRANT,
            "p_feature": "initial_grant",
            "p_metadata": {"source": "signup", "ip": client_ip},
        }).execute()

        # Record the IP claim
        await supabase.table("ip_credit_claims").insert({
            "ip":             client_ip,
            "user_id":        user_id,
            "granted_amount": INITIAL_CREDIT_GRANT,
        }).execute()

        logger.info(
            "grant_initial_credits: granted %d credits to user %s (IP: %s)",
            INITIAL_CREDIT_GRANT, user_id, client_ip
        )
        return INITIAL_CREDIT_GRANT

    except Exception as e:
        # Non-fatal — log and continue. User can contact support.
        logger.error("grant_initial_credits failed for user %s: %s", user_id, e)
        return 0


# ── Atomic credit deduction ────────────────────────────────────────────────────

async def deduct_feature_credits(
    supabase,
    user_id: str,
    feature: str,
    cost: int,
    metadata: Optional[dict] = None,
) -> dict:
    """
    Atomically deducts `cost` credits from the user's balance via the
    PostgreSQL `deduct_credits` RPC.

    Admins with `is_unlimited = true` bypass deduction entirely.

    Returns dict: { "remaining": int, "is_unlimited": bool, "low_credits": bool }
    Raises HTTPException(402) on insufficient credits.
    Raises HTTPException(500) on unexpected DB errors.
    """
    try:
        # ── Check unlimited flag first (admin bypass) ──────────────────────
        profile_resp = await supabase.table("profiles") \
            .select("is_unlimited, remaining_credits") \
            .eq("id", user_id) \
            .limit(1).execute()

        if profile_resp.data:
            profile = profile_resp.data[0]
            if profile.get("is_unlimited"):
                remaining = profile.get("remaining_credits", 0)
                logger.info(
                    "deduct_feature_credits: unlimited user %s — skipping deduction for %s",
                    user_id, feature
                )
                return {
                    "remaining": remaining,
                    "is_unlimited": True,
                    "low_credits": False,
                }

        # ── Atomic deduction via PostgreSQL RPC ────────────────────────────
        result = await supabase.rpc("deduct_credits", {
            "p_user_id":  user_id,
            "p_feature":  feature,
            "p_amount":   cost,
            "p_metadata": metadata or {},
        }).execute()

        data = result.data
        if isinstance(data, list):
            data = data[0] if data else {}

        if not data.get("ok"):
            label = FEATURE_LABELS.get(feature, feature)
            raise HTTPException(
                status_code=402,
                detail=f"Insufficient credits. {label} costs {cost} credits. Please top up your balance."
            )

        remaining = data.get("remaining", 0)
        return {
            "remaining": remaining,
            "is_unlimited": False,
            "low_credits": remaining < LOW_CREDIT_THRESHOLD,
        }

    except HTTPException:
        raise
    except Exception as e:
        err_str = str(e).lower()
        if "insufficient_credits" in err_str:
            label = FEATURE_LABELS.get(feature, feature)
            raise HTTPException(
                status_code=402,
                detail=f"Insufficient credits. {label} costs {cost} credits. Please top up your balance."
            )
        if "user_not_found" in err_str:
            raise HTTPException(status_code=404, detail="User profile not found.")
        logger.error("deduct_feature_credits failed for user %s: %s", user_id, e)
        raise HTTPException(status_code=500, detail="Credit system error — please try again.")


async def admin_grant_credits(
    supabase,
    target_user_id: str,
    amount: int,
    granted_by: str,
    reason: str = "admin_grant",
) -> dict:
    """
    Admin-only: grant additional credits to any user.
    Uses the same `grant_credits` RPC for atomicity.
    Returns updated balance.
    """
    try:
        await supabase.rpc("grant_credits", {
            "p_user_id": target_user_id,
            "p_amount":  amount,
            "p_feature": reason,
            "p_metadata": {"granted_by": granted_by, "reason": reason},
        }).execute()

        # Fetch updated balance
        res = await supabase.table("profiles") \
            .select("remaining_credits, total_credits_granted") \
            .eq("id", target_user_id).limit(1).execute()

        if res.data:
            return {
                "remaining": res.data[0].get("remaining_credits", 0),
                "total_granted": res.data[0].get("total_credits_granted", 0),
            }
        return {"remaining": 0, "total_granted": 0}

    except Exception as e:
        logger.error("admin_grant_credits failed for user %s: %s", target_user_id, e)
        raise HTTPException(status_code=500, detail="Failed to grant credits.")
