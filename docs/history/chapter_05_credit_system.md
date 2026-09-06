# Chapter 05 — Credit System

## Overview

Credits are the usage currency of Kareerist. Every AI feature costs credits. New users get 100 free credits on signup. After exhausting the initial grant, users get 50 free credits per day on login.

The credit system is designed to be:
- **Atomic** — no double-spend, no race conditions
- **Auditable** — every credit change is logged in `credit_transactions`
- **Anti-farming** — one IP = one initial grant
- **Refundable** — if an AI call fails after deduction, credits are refunded

---

## Feature Costs

```python
FEATURE_COSTS = {
    "ats_score":      5,
    "deep_analysis":  15,
    "hiring_intel":   25,
    "interview":      25,
    "cover_letter":   10,
    "humanize":       15,
}
```

---

## Database Layer

### `profiles` table (extended)

```sql
remaining_credits     INTEGER  NOT NULL DEFAULT 0
total_credits_granted INTEGER  NOT NULL DEFAULT 0
is_unlimited          BOOLEAN  NOT NULL DEFAULT FALSE
last_daily_grant_date DATE
```

- `remaining_credits` — what the user can spend right now
- `total_credits_granted` — lifetime total received (initial + purchases + promos). Never decremented.
- `is_unlimited` — admin/tester flag, bypasses all credit checks
- `last_daily_grant_date` — fast-path check to avoid hitting `daily_credit_grants` table on every login

### `credit_transactions` table

Full audit trail. Every credit change (deduction, grant, refund) writes a row:

```sql
user_id        UUID
feature        TEXT    -- 'ats_score' | 'deep_analysis' | 'initial_grant' | 'daily_grant' | etc.
credits_used   INTEGER -- positive = deduction, negative = grant
credits_before INTEGER
credits_after  INTEGER
metadata       JSONB   -- { source, ip, reason, etc. }
created_at     TIMESTAMPTZ
```

### `ip_credit_claims` table

One row per IP address. Prevents multi-account credit farming.

```sql
ip              TEXT PRIMARY KEY
user_id         UUID REFERENCES auth.users ON DELETE SET NULL
granted_amount  INTEGER
claimed_at      TIMESTAMPTZ
```

`ON DELETE SET NULL` is intentional — if a user deletes their account, the IP record persists. This prevents re-farming from the same IP with a new account.

### `daily_credit_grants` table

Tracks daily grants per user per day. Used as a race condition guard.

```sql
user_id    UUID
grant_date DATE
amount     INT
UNIQUE (user_id, grant_date)
```

---

## PostgreSQL RPCs

### `deduct_credits(p_user_id, p_feature, p_amount, p_metadata)`

The core deduction function. Uses `FOR UPDATE` row lock to prevent concurrent double-spend:

```sql
SELECT remaining_credits, is_unlimited
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;  -- locks the row until transaction commits
```

If `is_unlimited = true`, returns success without deducting. Otherwise checks balance, deducts, writes audit record, returns `{ ok: true, remaining: N }`.

Raises exceptions on: `user_not_found`, `insufficient_credits`.

**Security:** EXECUTE is revoked from `authenticated` and `anon` roles. Only `service_role` (the backend) can call it.

### `grant_credits(p_user_id, p_amount, p_feature, p_metadata)`

Used for: initial grants, daily grants, refunds, admin grants.

For `p_feature = 'daily_grant'`:
- Tops up `remaining_credits` TO `p_amount` (the cap), not by `p_amount`
- Does NOT touch `total_credits_granted` (preserves purchase history)
- If user already has >= cap, returns immediately (no-op)

For all other features:
- Adds `p_amount` to `remaining_credits`
- Increments `total_credits_granted` by `p_amount`

**Security:** EXECUTE is revoked from `authenticated` and `anon`. Only `service_role` can call it. Also has an in-body check: `IF current_setting('role') NOT IN ('service_role', 'supabase_admin') THEN RAISE EXCEPTION`.

---

## Application Layer (`credits.py`)

### `grant_initial_credits(supabase, user_id, client_ip)`

Called after signup/OAuth when the IP check passes.

Flow:
1. Check if user already has credits (`total_credits_granted > 0`) → skip if yes
2. Check if IP is in `ip_credit_claims` → deny if yes
3. Call `grant_credits` RPC (atomic)
4. Insert into `ip_credit_claims`

Idempotent — safe to call multiple times for the same user.

### `deduct_feature_credits(supabase, user_id, feature, cost)`

Called by `require_credits()` dependency before every AI feature.

Flow:
1. Check `is_unlimited` flag → skip deduction if true
2. Call `deduct_credits` RPC
3. Parse response — raise `HTTPException(402)` on insufficient credits

### `refund_feature_credits(supabase, user_id, feature, cost)`

Called when an AI call fails after credits were already deducted. Non-fatal — logs on failure but doesn't raise.

### `grant_daily_credits(supabase, user_id)`

Called on every `GET /api/v1/auth/me` (i.e., every page load when logged in).

Eligibility rules:
- User must have received the initial 100-credit grant (`total_credits_granted >= 100`)
- Must not have already received a grant today (checked via `last_daily_grant_date` fast path, then `daily_credit_grants` table as race condition guard)
- Unlimited users are exempt

If eligible:
1. Call `grant_credits` RPC with `p_feature = 'daily_grant'`
2. Insert into `daily_credit_grants`
3. Update `last_daily_grant_date` on profile

---

## Frontend Credit State (`CreditContext.tsx`)

The frontend maintains a local credit balance for optimistic UI updates.

```typescript
interface CreditBalance {
    remaining: number
    total_granted: number
    is_unlimited: boolean
    low_credits: boolean  // remaining < 20
}
```

### `canUse(feature)`

Returns `true` if the user can afford the feature. Returns `true` while loading (prevents false "insufficient credits" flash on first render). Returns `true` for unlimited users.

### `deductLocal(feature)`

Optimistically subtracts the feature's cost from the local balance state without waiting for the backend. Provides instant UI feedback when a user triggers a paid action. The actual deduction happens server-side — if it fails, the next `refresh()` corrects the local state.

> **Sep 6, 2026:** `deductLocal` is now fully active. Previously it was a no-op (`const deductLocal = useCallback((_feature) => {}, [])`). It now properly subtracts from the local `balance.remaining` state.

### `isLoading`

Initialized to `true` (not `false`). This prevents the brief flash where buttons appear disabled before the balance is fetched.

---

## Credit Flow: End-to-End Example

User clicks "Run Deep Analysis" (costs 15 credits):

```
1. Frontend: canUse("deep_analysis") → true (has 45 credits)
2. Frontend: calls POST /api/v1/analysis/deep
3. Frontend: deductLocal("deep_analysis") → local balance shows 30
4. Backend: require_credits("deep_analysis", 15) dependency runs
   → calls deduct_credits RPC with FOR UPDATE lock
   → deducts 15 from remaining_credits
   → writes credit_transactions row
   → returns { ok: true, remaining: 30 }
5. Backend: runs deep analysis, saves to ai_analyses
6. Backend: returns analysis result
7. Frontend: refresh() → fetches real balance (30) from server
   → local state confirmed correct
```

If step 5 fails (Groq API error):
```
5b. Backend: generate_deep_analysis() returns None
    → refund_feature_credits("deep_analysis", 15) called atomically
    → grant_credits RPC adds 15 back to remaining_credits
    → writes credit_transactions row with feature="ai_failure_refund"
    → raises HTTPException(502, "credits refunded")
6b. Frontend: shows error toast with "credits have been refunded" message
    → refresh() → fetches real balance (45) from server
    → local state corrected
```

> **Sep 6, 2026 fix:** Before this date, step 5b did not exist — the endpoint raised 502 without refunding. Deep Analysis (15 cr) and Hiring Intel (25 cr) both had this bug. Both are now fixed.
