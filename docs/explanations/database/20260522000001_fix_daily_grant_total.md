# 20260522000001_fix_daily_grant_total.sql

**Location:** `prsnl/supabase/migrations/20260522000001_fix_daily_grant_total.sql`  
**Type:** Database Migration (Stored Procedure & Security Hardening)

## What This Migration Does

This migration resolves a critical credit accounting error where automated daily 50-credit grants were being incorrectly added to the user's `total_credits_granted` (a lifetime balance field). This caused the user's lifetime total to inflate unnecessarily (e.g. 100 -> 150 -> 200). 
Additionally, this migration serves as a **critical security hardening patch** for the `public.grant_credits()` stored procedure:
1. Revokes execute permissions from all public, authenticated, and anonymous database roles.
2. Implements a defense-in-depth in-body caller check.
3. Imposes strict positive value parameters.
4. Correctly implements `daily_grant` behaviors to top-up balances up to the daily cap (e.g., 50) without accumulating into the lifetime purchase total.

## How It Fits Into The System

- **What triggers it:** Applied during system maintenance or CLI migration pushes.
- **What it depends on:**
  - `public.profiles` — updates balances.
  - `public.credit_transactions` — writes transaction log entries.
- **What depends on it:**
  - FastAPI credit allocation backend service — calls this function using the system's `service_role` credentials to credit user accounts safely.

## Code Breakdown

### Security Hardening: Caller Verification
**Lines:** 37–42  
The stored procedure is defined with the `SECURITY DEFINER` modifier (running with the elevated privileges of the database owner). To prevent abuse, it incorporates an active caller role check inside the body:
```sql
IF current_setting('role') NOT IN ('service_role', 'supabase_admin') THEN
  RAISE EXCEPTION 'access_denied: only service_role may call grant_credits';
END IF;
```
If an authenticated user attempts to execute this SQL function directly by circumventing the client API, the query immediately terminates and throws an access exception.

### Parameter Validations
**Lines:** 44–47, 52–55  
- Rejects zero or negative amounts (`p_amount <= 0`) to prevent transaction spoofing.
- Validates profile existence, raising an explicit `user_not_found` error rather than failing silently.

### Top-Up vs Purchase Allocation Logic
**Lines:** 57–81  
- **If `p_feature = 'daily_grant'`**:
  Checks if `remaining_credits >= p_amount` (the 50-credit cap). If so, it exits with nothing to do. If the balance is lower, it sets the balance **exactly to the cap** (`v_after := p_amount`) and updates the profile **without touching `total_credits_granted`**. This preserves a clean history of actual purchased credits.
- **If `p_feature != 'daily_grant'` (Purchases, promo, etc.)**:
  Performs standard cumulative addition (`v_after := v_before + p_amount`) and updates BOTH `remaining_credits` and `total_credits_granted`.

### Role Permissions Revocation
**Lines:** 90–99  
Explicitly revokes execute permissions from public roles to ensure that ONLY the system backend using `service_role` can call the function:
```sql
REVOKE EXECUTE ON FUNCTION public.grant_credits(...) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_credits(...) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_credits(...) FROM anon;
```

## Things To Know Before Editing

- **Never downgrade permissions:** This function is a highly sensitive credit administration utility. Never grant execute permissions back to `authenticated` or `anon` roles.
- **`SECURITY DEFINER` search path:** The function strictly declares `SET search_path = public` (Line 31) to prevent search-path hijacking attacks. Always maintain this configuration when editing stored procedures in Supabase.
