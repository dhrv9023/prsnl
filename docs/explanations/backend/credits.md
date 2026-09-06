# credits.py

**Location:** `prsnl/backend/app/services/credits.py`  
**Type:** Business Logic Service

## What This File Does

Implements the credit system business logic: IP-gated initial grants on signup, atomic credit deduction via PostgreSQL RPC functions, admin bypass for unlimited users, and credit refunds when AI calls fail. This is the central authority for all credit-related operations in the application — no other file directly manipulates credit balances.

## How It Fits Into The System

- **What triggers it:** Called by `dependencies.py` (the `require_credits` dependency deducts credits before route execution), `auth.py` (grants initial credits on signup/OAuth), `admin.py` (admin credit grants), and all AI endpoint handlers (refunds on failure).
- **What it depends on:** `logging`, `fastapi.HTTPException`. The Supabase client is passed as a parameter (not imported directly) to allow flexibility in which client is used.
- **What depends on it:** `app.api.dependencies.py` (require_credits factory), `app.api.endpoints.auth.py` (signup/OAuth initial grant), `app.api.endpoints.admin.py` (admin grants), all AI endpoints (refunds).

## Code Breakdown

### FEATURE_COSTS (dict)

Maps feature identifiers to their credit cost:

| Feature | Cost |
|---------|------|
| `ats_score` | 5 |
| `deep_analysis` | 15 |
| `hiring_intel` | 25 |
| `interview` | 25 |
| `cover_letter` | 10 |
| `humanize` | 15 |

These costs are referenced by the `require_credits` dependency and displayed to users in the frontend.

### FEATURE_LABELS (dict)

Human-readable names for each feature (e.g., `"deep_analysis"` → `"Deep Analysis"`). Used in credit history records and admin dashboards.

### INITIAL_CREDIT_GRANT = 100

The number of credits given to new users on signup. This is the free tier allowance.

### LOW_CREDIT_THRESHOLD = 20

When a user's balance drops below this threshold, the API response includes a warning header so the frontend can show a "low credits" notification.

### grant_initial_credits(supabase, user_id, client_ip)

Grants the initial 100 credits to a new user, with two layers of abuse prevention:

1. **User check:** Queries the credits table to see if this user already has a balance. If yes, skips (idempotent).
2. **IP check:** Queries the IP claims table to see if this IP has already claimed initial credits. If yes, skips (prevents multi-account abuse).
3. **Grant:** Calls the `grant_credits` PostgreSQL RPC function to atomically add credits.
4. **Record:** Inserts the IP into the claims table for future checks.

This function is idempotent — safe to call multiple times for the same user without double-granting.

### deduct_feature_credits(supabase, user_id, feature, cost, metadata)

The core deduction function:

1. **Admin bypass:** Checks if the user has `is_unlimited = True` in their credits record. If yes, returns immediately without deducting (admins have infinite credits).
2. **Atomic deduction:** Calls the `deduct_credits` PostgreSQL RPC function, which uses a `FOR UPDATE` row lock to prevent race conditions. The RPC returns the new balance or an error if insufficient.
3. **Insufficient credits:** If the RPC indicates insufficient balance, raises `HTTPException(402)` with a descriptive message including the feature name and cost.
4. **Returns:** The remaining credit balance after deduction.

The `metadata` parameter is stored in the credit history for audit purposes (e.g., which resume was analyzed).

### refund_feature_credits(supabase, user_id, feature, cost, reason)

Grants credits back when an AI call fails after deduction:

1. **Admin skip:** If user is unlimited, no refund needed (nothing was deducted).
2. **Refund:** Calls `grant_credits` RPC to add credits back.
3. **Non-fatal:** Wrapped in try/except — if the refund fails (e.g., database error), it logs an error but does NOT raise. The endpoint still returns an error to the user, and the failed refund requires manual intervention.

The `reason` parameter is recorded in credit history (e.g., "AI call failed: timeout").

### admin_grant_credits(supabase, target_user_id, amount, granted_by, reason)

Admin-only function to manually grant credits to any user:

1. Calls `grant_credits` RPC with the target user's ID
2. Records who granted the credits (`granted_by`) and why (`reason`)
3. Returns the updated balance

Used by the admin panel for customer support (e.g., compensating users for bugs).

## Things To Know Before Editing

- `grant_initial_credits` is idempotent — calling it multiple times for the same user won't double-grant. This is important because both the signup and OAuth flows call it, and race conditions are possible.
- The credit deduction is atomic at the PostgreSQL level using `FOR UPDATE` row locks. This prevents double-spending even under concurrent requests. Do not try to implement deduction logic in Python — always use the RPC.
- Refunds are non-fatal by design. If a refund fails, the user loses credits and manual intervention is needed. This trade-off prevents a refund failure from masking the original AI error.
- The Supabase client is passed as a parameter (not imported at module level). This allows the function to work with either the service-role client or a user-scoped client, and avoids circular imports.
- Changing `FEATURE_COSTS` values takes effect immediately for new requests but doesn't retroactively affect past transactions.
- The `is_unlimited` check happens before deduction — unlimited users never have credit history entries for their usage. If you need to track unlimited user activity, add separate logging.
- The IP-based abuse prevention in `grant_initial_credits` can be circumvented by VPNs. It's a speed bump, not a wall. The primary defense is the credit system itself (limited free credits).
