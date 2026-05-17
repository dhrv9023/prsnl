-- ============================================================
-- Reset test user credits — Run in Supabase SQL Editor
-- This bypasses RLS (SQL Editor runs as postgres/service role)
-- ============================================================

-- Step 1: See what users exist and their current credits
SELECT id, email, remaining_credits, total_credits_granted, last_daily_grant_date
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Reset ALL profiles to 100 credits (clean slate for testing)
-- Comment this out if you only want to reset one user
UPDATE public.profiles
SET remaining_credits = 100,
    total_credits_granted = 100,
    last_daily_grant_date = NULL;

-- Step 3: Verify
SELECT id, email, remaining_credits, total_credits_granted
FROM public.profiles;
