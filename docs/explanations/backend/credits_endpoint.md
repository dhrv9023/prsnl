# credits_endpoint.md

**Location:** `prsnl/backend/app/api/v1/endpoints/credits.py`  
**Type:** API Endpoint

## What This File Does

Provides user-facing credit management endpoints. Users can check their balance, view feature pricing, validate whether they can afford a specific action before attempting it, claim daily credit grants, and review their transaction history. This is the read/query side of the credit system — actual deductions happen in the feature endpoints (analysis, interview, etc.), not here.

## How It Fits Into The System

- **Triggers:** Called by the frontend Credit Badge component (balance), Credits page (history), pricing display (costs), and pre-action checks (validate).
- **Dependencies:** Supabase database (`credit_transactions` table, `profiles` table for unlimited flag), authentication middleware (except `/costs` which is public).
- **Dependents:** The frontend `CreditContext` consumes the balance endpoint to maintain global credit state. Feature endpoints use the same underlying credit service but don't call these endpoints directly.

## Code Breakdown

### Balance (`GET /balance`)

Returns the user's current credit state:
- `remaining` — Credits available to spend
- `total` — Total credits ever received (grants + signup bonus)
- `used` — Total credits consumed
- `unlimited` — Boolean flag (if true, user has unlimited access)
- `low_warning` — Boolean flag indicating balance is below a threshold (triggers UI warning)

The `low_warning` flag is computed server-side (e.g., remaining < 10 credits) so the frontend doesn't need to hardcode the threshold.

### Costs (`GET /costs`)

**Public endpoint — no authentication required.**

Returns the credit cost for every feature in the system:
```json
{
  "match_analysis": 5,
  "deep_analysis": 15,
  "hiring_intel": 25,
  "ats_score": 5,
  "cover_letter": 10,
  "cover_letter_roast": 10,
  "humanize": 15,
  "interview": 25
}
```

This is public so the pricing page can display costs to unauthenticated users. The frontend reads this to show credit costs on buttons before users click them.

### Validate (`POST /validate`)

**Added to documentation: June 3, 2026** (endpoint existed earlier)

Checks if the user can afford a specific feature without actually deducting credits:
- Accepts a `feature` identifier (e.g., `"deep_analysis"`).
- Looks up the cost from the `FEATURE_COSTS` table.
- Compares against the user's balance (or checks unlimited flag).
- Returns:
  ```json
  {
    "can_use": true/false,
    "remaining": 42,
    "cost": 15,
    "shortfall": 0,
    "is_unlimited": false
  }
  ```

Used by the frontend to disable buttons or show warnings before the user attempts an action that would fail due to insufficient credits. The `shortfall` field shows how many more credits are needed.

### History (`GET /history`)

Returns the last 50 credit transactions for the authenticated user:
- Transaction type (`deduction`, `grant`, `refund`, `signup_bonus`, `admin_grant`, `daily_grant`)
- Amount (positive for grants, negative for deductions)
- Feature identifier and human-readable label
- Description (e.g., "Deep Analysis - resume.pdf" instead of raw IDs)
- Credits before and after the transaction
- Metadata (additional context if available)
- Timestamp

Ordered by date (newest first). Limited to 50 to keep response size reasonable.

### Daily Grant (`POST /daily-grant`)

**Added: May 17, 2026**

Claims the daily 50-credit grant for the current user:
- Only eligible after the initial 100 signup credits have been used
- Grants once per UTC day (idempotent within the same day)
- Safe to call on every login/page load — checks eligibility internally
- Returns:
  ```json
  {
    "granted": true/false,
    "amount": 50,
    "already_granted_today": false,
    "not_eligible": false,
    "remaining": 75
  }
  ```

Called automatically by `/me` endpoint on every page load, but can also be called explicitly by the frontend.

### Human-Readable Labels

The history endpoint transforms raw transaction data into user-friendly descriptions:
- `match_analysis` → "ATS Match Analysis"
- `deep_analysis` → "Deep Resume Analysis"
- `interview_start` → "AI Interview Session"
- `admin_grant` → "Credits granted by admin"
- `signup_bonus` → "Welcome bonus"

This mapping is maintained in this file. If you add new features with credit costs, add their labels here too.

## Things To Know Before Editing

- **`/costs` is the single source of truth for pricing.** If you change credit costs, change them in `FEATURE_COSTS` constant AND in the feature endpoints that actually deduct. They must stay in sync.
- **`/costs` is public (no auth).** Don't accidentally add user-specific data to this endpoint or require authentication — it would break the pricing page for logged-out users.
- **`/validate` doesn't deduct.** It's a dry-run check. Don't add side effects to this endpoint. Returns `can_use` (not `can_afford`) to match actual implementation.
- **`/validate` returns shortfall.** The `shortfall` field tells users exactly how many more credits they need, improving UX for the buy credits prompt.
- **Daily grant is idempotent.** The `/daily-grant` endpoint checks eligibility (initial 100 used) and UTC day. Safe to call multiple times per day without risk of double-granting.
- **Daily grant is auto-triggered by `/me`.** The auth `/me` endpoint calls `grant_daily_credits()` on every page load. The explicit `/daily-grant` endpoint is mostly for frontend control.
- **The 50-transaction limit on history is hardcoded.** If users want to see more, you'd need to add pagination. For now, 50 covers most users' recent activity.
- **`low_warning` threshold should match frontend expectations.** If you change the `LOW_CREDIT_THRESHOLD` (currently in credit service), the frontend warning will trigger at a different point. Coordinate the change.
- **Unlimited users bypass balance checks.** The `/validate` endpoint returns `can_use: true` and includes `is_unlimited: true` flag for unlimited users regardless of their numerical balance.
- **Human-readable labels must be maintained manually.** The `FEATURE_LABELS` mapping lives in the credit service. When adding new features, update the mapping there or history will show raw identifiers.
