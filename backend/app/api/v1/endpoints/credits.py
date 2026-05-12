# app/api/v1/endpoints/credits.py
"""
Credit balance, history, and validation endpoints.
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.api.dependencies import CurrentUser
from app.db.supabase import get_db
from app.services.credits import FEATURE_COSTS, FEATURE_LABELS, LOW_CREDIT_THRESHOLD

logger = logging.getLogger(__name__)
router = APIRouter()


# ── GET /credits/balance ───────────────────────────────────────────────────────

@router.get("/balance")
async def get_credit_balance(user: CurrentUser):
    """
    Returns the current user's full credit balance.
    Includes remaining, total granted, unlimited flag, and low-credit warning.
    """
    supabase = await get_db()
    uid = str(user.id)

    res = await supabase.table("profiles") \
        .select("remaining_credits, total_credits_granted, is_unlimited") \
        .eq("id", uid).limit(1).execute()

    if not res.data:
        return {
            "remaining":     0,
            "total_granted": 0,
            "used":          0,
            "is_unlimited":  False,
            "low_credits":   False,
        }

    profile = res.data[0]
    remaining = profile.get("remaining_credits", 0)
    total_granted = profile.get("total_credits_granted", 0)
    is_unlimited = bool(profile.get("is_unlimited", False))

    return {
        "remaining":     remaining,
        "total_granted": total_granted,
        "used":          max(0, total_granted - remaining),
        "is_unlimited":  is_unlimited,
        "low_credits":   (not is_unlimited) and (remaining < LOW_CREDIT_THRESHOLD),
    }


# ── GET /credits/costs ─────────────────────────────────────────────────────────

@router.get("/costs")
async def get_feature_costs():
    """
    Returns the credit cost for every feature.
    Public — no auth required (used by landing page pricing UI).
    """
    return {
        feature: {
            "cost":  cost,
            "label": FEATURE_LABELS.get(feature, feature),
        }
        for feature, cost in FEATURE_COSTS.items()
    }


# ── POST /credits/validate ─────────────────────────────────────────────────────

class ValidateRequest(BaseModel):
    feature: str

@router.post("/validate")
async def validate_credits(body: ValidateRequest, user: CurrentUser):
    """
    Checks whether the user has enough credits for a feature WITHOUT deducting.
    Returns { can_use: bool, remaining: int, cost: int, shortfall: int }.
    Used by the frontend to gate buttons before the user clicks.
    """
    supabase = await get_db()
    uid = str(user.id)

    cost = FEATURE_COSTS.get(body.feature)
    if cost is None:
        raise HTTPException(status_code=400, detail=f"Unknown feature: {body.feature}")

    res = await supabase.table("profiles") \
        .select("remaining_credits, is_unlimited") \
        .eq("id", uid).limit(1).execute()

    if not res.data:
        return {"can_use": False, "remaining": 0, "cost": cost, "shortfall": cost}

    profile = res.data[0]
    is_unlimited = bool(profile.get("is_unlimited", False))
    remaining = profile.get("remaining_credits", 0)

    if is_unlimited:
        return {"can_use": True, "remaining": remaining, "cost": cost, "shortfall": 0, "is_unlimited": True}

    can_use = remaining >= cost
    return {
        "can_use":      can_use,
        "remaining":    remaining,
        "cost":         cost,
        "shortfall":    max(0, cost - remaining),
        "is_unlimited": False,
    }


# ── GET /credits/history ───────────────────────────────────────────────────────

@router.get("/history")
async def get_credit_history(user: CurrentUser):
    """Returns the last 50 credit transactions for the current user."""
    supabase = await get_db()
    uid = str(user.id)

    res = await supabase.table("credit_transactions") \
        .select("id, feature, credits_used, credits_before, credits_after, metadata, created_at") \
        .eq("user_id", uid) \
        .order("created_at", desc=True) \
        .limit(50).execute()

    rows = res.data or []

    # Enrich with human-readable labels
    for row in rows:
        feature = row.get("feature", "")
        row["label"] = FEATURE_LABELS.get(feature, feature)

    return rows
