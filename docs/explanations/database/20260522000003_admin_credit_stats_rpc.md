# 20260522000003_admin_credit_stats_rpc.sql

**Location:** `prsnl/supabase/migrations/20260522000003_admin_credit_stats_rpc.sql`  
**Type:** Database Migration (Stored Procedure / Performance Optimization)

## What This Migration Does

This migration implements the `public.admin_credit_stats()` database function. This stored procedure was introduced to optimize the **Admin Analytics Dashboard**. Previously, compiling platform-wide credit statistics required a full table scan in Python, which fetched every profile row over the network to calculate sums. This function shifts that calculation to the database level, compiling total granted and remaining credits into a single optimized query that returns a JSONB payload, while securing execution permissions.

## How It Fits Into The System

- **What triggers it:** Called by the FastAPI Admin stats endpoint (`backend/app/api/v1/endpoints/admin.py`).
- **What it depends on:**
  - `public.profiles` — aggregates balance data.
- **What depends on it:**
  - Admin Analytics Page — displays platform credit distribution metrics to system administrators.

## Code Breakdown

### Database-Level Aggregation
**Lines:** 11–22  
Defines the `admin_credit_stats()` stored procedure. It performs a single query to compute totals directly inside the PostgreSQL engine, using `jsonb_build_object` to format the result into a clean JSON response:
```sql
CREATE OR REPLACE FUNCTION public.admin_credit_stats()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_granted',   COALESCE(SUM(total_credits_granted), 0),
    'total_remaining', COALESCE(SUM(remaining_credits), 0)
  )
  FROM public.profiles;
$$;
```
- **`SECURITY DEFINER`**: Runs with the elevated privileges of the database owner, allowing the function to bypass Row-Level Security (RLS) selectors to calculate global platform metrics.
- **`COALESCE`**: Protects the query from returning `NULL` if no profiles exist in the database, defaulting the sums to `0`.

### Executable Role Restrictions
**Lines:** 24–28  
To prevent unauthorized users from viewing global credit statistics, execute permissions are explicitly revoked from public roles:
```sql
REVOKE EXECUTE ON FUNCTION public.admin_credit_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_credit_stats() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_credit_stats() FROM anon;
```
This ensures that only administrative connections using the system's `service_role` key can run this query.

## Things To Know Before Editing

- **Security Precaution:** Global calculations that bypass RLS must be strictly guarded. Never remove the `REVOKE` block or expose this stored procedure directly to client-side calls.
- **`SET search_path`**: Always maintain `SET search_path = public` to ensure the stored procedure executes securely.
