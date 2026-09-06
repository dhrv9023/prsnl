# SUPABASE_MIGRATION.sql

**Location:** `prsnl/SUPABASE_MIGRATION.sql`  
**Type:** Database Migration (Legacy/Alternative)

## What This File Does

An alternative/earlier version of the credit system migration. Creates the same credit infrastructure but with slightly different implementation details: `credit_transactions` references `public.profiles` (not `auth.users`), includes a BEFORE INSERT trigger that auto-grants 100 credits on profile creation (bypassing IP check), and the `deduct_credits` function returns `{ok: false}` instead of raising an exception on insufficient credits.

## How It Fits Into The System

- **Triggers:** Was intended to be run manually via Supabase SQL editor or `psql`. Located at the project root (not in `supabase/migrations/`).
- **Dependencies:** Requires the `profiles` table to exist with an `id` column matching `auth.users`.
- **Dependents:** The FastAPI backend's credit deduction logic handles both the exception-based pattern (supabase/migrations version) and the `{ok: false}` return pattern (this version). This file appears to be the **legacy version kept for reference** — the canonical version is in `supabase/migrations/20260513000000_credit_system.sql`.

## Code Breakdown

### Section 1: ALTER TABLE profiles

Adds the same three columns as the canonical migration:

- `remaining_credits` (INTEGER, DEFAULT 0)
- `total_credits_granted` (INTEGER, DEFAULT 0)
- `is_unlimited` (BOOLEAN, DEFAULT FALSE)

Uses `ADD COLUMN IF NOT EXISTS` for idempotency.

### Section 2: credit_transactions Table

Creates the audit log table with the same structure as the canonical version, but with one key difference:

- `user_id` references **`public.profiles(id)`** instead of `auth.users(id)`.

This means the FK relationship goes through the profiles table rather than directly to auth. Functionally equivalent (profiles.id = auth.users.id in this system), but the canonical version's direct reference to `auth.users` is cleaner.

Same indexes: `(user_id, created_at DESC)` and `(feature)`.

### Section 3: ip_credit_claims Table

Creates the anti-farming table with the same structure:

- PRIMARY KEY on IP address.
- `user_id` references **`public.profiles(id)`** (again, not `auth.users`).
- `granted_amount` and `claimed_at` columns.

Same purpose: prevent one IP from claiming credits on multiple accounts.

### Section 4: grant_credits RPC

Same logic as the canonical version:

```
grant_credits(p_user_id UUID, p_amount INT, p_feature TEXT, p_metadata JSONB)
RETURNS JSONB
```

- SECURITY DEFINER.
- FOR UPDATE row lock.
- Increments `remaining_credits` and `total_credits_granted`.
- Writes audit record with negative `credits_used`.
- Returns `{ok: true, remaining: <new_balance>}`.

### Section 5: deduct_credits RPC

This is the **key behavioral difference** from the canonical version:

```
deduct_credits(p_user_id UUID, p_feature TEXT, p_amount INT, p_metadata JSONB)
RETURNS JSONB
```

- SECURITY DEFINER, FOR UPDATE lock, unlimited user bypass — all the same.
- **On insufficient credits:** Returns `{ok: false, remaining: <current_balance>, reason: 'insufficient_credits'}` instead of raising a PostgreSQL exception.

This means the calling code must check the `ok` field in the response rather than catching an exception. The FastAPI backend handles both patterns (try/except for the exception version, response check for this version).

### Section 6: handle_new_user_credits Trigger

A **BEFORE INSERT** trigger on `profiles` (not on `auth.users`):

- Fires before every new profile row is inserted.
- Sets `remaining_credits = 100` and `total_credits_granted = 100` on the NEW row.
- This means every new user gets 100 credits **unconditionally** — no IP check.

This is the pre-audit behavior. The canonical migration replaced this with a 0-credit start + app-layer IP-verified grant.

### Section 7: Backfill Existing Users

Updates all existing profiles that have `remaining_credits = 0` (or NULL) to have 100 credits:

```sql
UPDATE profiles SET remaining_credits = 100, total_credits_granted = 100
WHERE remaining_credits IS NULL OR remaining_credits = 0;
```

Ensures users who signed up before the credit system was deployed get their initial allocation.

### Section 8: RLS Policies

Same pattern as the canonical version:

- `credit_transactions`: Users can SELECT own rows. Service role has full access.
- `ip_credit_claims`: No direct user access, service role only.
- Appropriate GRANT statements for SELECT and EXECUTE permissions.

## Things To Know Before Editing

- **This file conflicts with the `supabase/migrations/20260513000000_credit_system.sql` version.** Do NOT run both — they create the same objects (`deduct_credits`, `grant_credits`, `credit_transactions`, `ip_credit_claims`) with different behavior.
- The BEFORE INSERT trigger grants 100 credits **unconditionally** (no IP check) — this was the pre-audit behavior that allowed credit farming. The canonical migration fixed this.
- The `deduct_credits` function returns `{ok: false}` instead of raising an exception — the FastAPI code handles both patterns, but new code should use the exception-based version (canonical).
- FK references go to `public.profiles(id)` instead of `auth.users(id)`. If you ever need to query these tables with auth functions like `auth.uid()`, the join path is slightly different.
- This file appears to be kept for **historical reference**. The canonical, production-ready version is `supabase/migrations/20260513000000_credit_system.sql`. If you need to make changes to the credit system, edit the canonical version.
- If someone accidentally runs this file on a database that already has the canonical migration applied, the `CREATE OR REPLACE` functions will **overwrite** the exception-based `deduct_credits` with the `{ok: false}` version — silently changing production behavior.
