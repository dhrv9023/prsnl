# app/services/credits.py
"""
Credit System Service.

Handles:
- Client IP extraction (proxy-aware)
- IP-based initial credit grant (anti-farming)
- Atomic credit deduction via PostgreSQL RPC
- Admin unlimited bypass
- Credit refund on AI failure
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
DAILY_CREDIT_GRANT = 50       # granted once per calendar day after initial 100 are used
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


async def refund_feature_credits(
    supabase,
    user_id: str,
    feature: str,
    cost: int,
    reason: str = "ai_failure_refund",
) -> None:
    """
    Refunds `cost` credits to the user when an AI call fails after deduction.
    Uses the same grant_credits RPC for atomicity.
    Non-fatal — logs on failure but does not raise.
    """
    try:
        # Skip refund for unlimited users (they were never charged)
        profile_resp = await supabase.table("profiles") \
            .select("is_unlimited") \
            .eq("id", user_id) \
            .limit(1).execute()

        if profile_resp.data and profile_resp.data[0].get("is_unlimited"):
            return

        await supabase.rpc("grant_credits", {
            "p_user_id": user_id,
            "p_amount":  cost,
            "p_feature": reason,
            "p_metadata": {"refund_for": feature, "reason": reason},
        }).execute()

        logger.info(
            "refund_feature_credits: refunded %d credits to user %s for failed %s",
            cost, user_id, feature
        )
    except Exception as e:
        # Non-fatal — log and continue. Manual refund may be needed.
        logger.error(
            "refund_feature_credits FAILED for user %s feature %s: %s",
            user_id, feature, e
        )


async def grant_daily_credits(supabase, user_id: str) -> dict:
    """
    Grants DAILY_CREDIT_GRANT (50) credits to a user once per calendar day (UTC),
    but ONLY after their initial 100-credit grant has been fully used.

    Rules:
    - Unlimited users are exempt (they don't need daily credits)
    - Only triggers when total_credits_granted >= INITIAL_CREDIT_GRANT (user has used the initial grant)
    - One grant per user per UTC calendar day
    - Non-cumulative: daily credits don't carry over (enforced by the 50-credit cap per day)

    Returns:
        {
            "granted": bool,          # True if credits were granted this call
            "amount": int,            # 50 if granted, 0 otherwise
            "already_granted_today": bool,
            "not_eligible": bool,     # True if initial 100 not yet used
        }
    """
    from datetime import datetime, timezone

    if not user_id:
        return {"granted": False, "amount": 0, "already_granted_today": False, "not_eligible": True}

    try:
        today_utc = datetime.now(timezone.utc).date().isoformat()  # "2026-05-17"

        # ── 1. Fetch profile ───────────────────────────────────────────────
        profile_resp = await supabase.table("profiles") \
            .select("remaining_credits, total_credits_granted, is_unlimited, last_daily_grant_date") \
            .eq("id", user_id).limit(1).execute()

        if not profile_resp.data:
            logger.warning("grant_daily_credits: profile not found for user %s", user_id)
            return {"granted": False, "amount": 0, "already_granted_today": False, "not_eligible": True}

        profile = profile_resp.data[0]

        # ── 2. Unlimited users are exempt ──────────────────────────────────
        if profile.get("is_unlimited"):
            return {"granted": False, "amount": 0, "already_granted_today": False, "not_eligible": True}

        # ── 3. Only eligible after initial 100 credits are used ────────────
        total_granted = profile.get("total_credits_granted", 0)
        if total_granted < INITIAL_CREDIT_GRANT:
            logger.info(
                "grant_daily_credits: user %s not yet eligible (total_granted=%d < %d)",
                user_id, total_granted, INITIAL_CREDIT_GRANT
            )
            return {"granted": False, "amount": 0, "already_granted_today": False, "not_eligible": True}

        # ── 4. Check if already granted today (fast path via profiles column) ──
        last_grant = profile.get("last_daily_grant_date")
        if last_grant and str(last_grant)[:10] == today_utc:
            logger.info("grant_daily_credits: user %s already received daily credits today", user_id)
            return {"granted": False, "amount": 0, "already_granted_today": True, "not_eligible": False}

        # ── 5. Double-check via daily_credit_grants table (race condition guard) ──
        existing = await supabase.table("daily_credit_grants") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("grant_date", today_utc) \
            .limit(1).execute()

        if existing.data:
            # Update the fast-path column so next check is instant
            await supabase.table("profiles") \
                .update({"last_daily_grant_date": today_utc}) \
                .eq("id", user_id).execute()
            return {"granted": False, "amount": 0, "already_granted_today": True, "not_eligible": False}

        # ── 6. Grant 50 credits ────────────────────────────────────────────
        await supabase.rpc("grant_credits", {
            "p_user_id": user_id,
            "p_amount":  DAILY_CREDIT_GRANT,
            "p_feature": "daily_grant",
            "p_metadata": {"source": "daily_login", "date": today_utc},
        }).execute()

        # ── 7. Record the grant ────────────────────────────────────────────
        await supabase.table("daily_credit_grants").insert({
            "user_id":    user_id,
            "grant_date": today_utc,
            "amount":     DAILY_CREDIT_GRANT,
        }).execute()

        # ── 8. Update fast-path column ─────────────────────────────────────
        await supabase.table("profiles") \
            .update({"last_daily_grant_date": today_utc}) \
            .eq("id", user_id).execute()

        logger.info(
            "grant_daily_credits: granted %d credits to user %s for %s",
            DAILY_CREDIT_GRANT, user_id, today_utc
        )
        return {"granted": True, "amount": DAILY_CREDIT_GRANT, "already_granted_today": False, "not_eligible": False}

    except Exception as e:
        logger.error("grant_daily_credits failed for user %s: %s", user_id, e)
        return {"granted": False, "amount": 0, "already_granted_today": False, "not_eligible": False}


async def admin_grant_credits(    supabase,
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
