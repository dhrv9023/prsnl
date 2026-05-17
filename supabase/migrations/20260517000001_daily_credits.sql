-- ============================================================
-- Daily Credits Migration — Kareerist
-- Adds daily 50-credit grant system for users who have
-- exhausted their initial 100-credit grant.
--
-- Rules:
--   - Only triggers after initial 100 credits are fully used
--   - 50 credits per day, non-cumulative (expire at end of day)
--   - Tracked per user per calendar day (UTC)
--   - Unlimited users are exempt
--
-- Run with: supabase db push  OR paste into Supabase SQL Editor
-- ============================================================

-- ── 1. Create daily_credit_grants table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_credit_grants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    grant_date  DATE NOT NULL,                    -- UTC date of the grant
    amount      INT  NOT NULL DEFAULT 50,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One grant per user per day
    CONSTRAINT daily_credit_grants_user_date_unique UNIQUE (user_id, grant_date)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_daily_credit_grants_user_id
    ON public.daily_credit_grants(user_id);

-- ── 2. Enable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.daily_credit_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily grants" ON public.daily_credit_grants;
CREATE POLICY "Users can view own daily grants"
    ON public.daily_credit_grants FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can insert daily grants" ON public.daily_credit_grants;
CREATE POLICY "Service role can insert daily grants"
    ON public.daily_credit_grants FOR INSERT
    WITH CHECK (true);

-- ── 3. Add last_daily_grant_date to profiles for fast eligibility check ───────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS last_daily_grant_date DATE;

-- ── 4. Verify ─────────────────────────────────────────────────────────────────
-- SELECT * FROM public.daily_credit_grants LIMIT 5;
-- SELECT last_daily_grant_date FROM public.profiles LIMIT 5;
