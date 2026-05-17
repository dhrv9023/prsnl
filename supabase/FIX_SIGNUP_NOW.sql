-- ============================================================
-- FIX SIGNUP — Run this in Supabase SQL Editor
-- This fixes the "Database error saving new user" on signup.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- ── Step 1: Ensure profiles table has all required columns ───────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS remaining_credits      INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_credits_granted  INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_unlimited           BOOL NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_admin               BOOL NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_daily_grant_date  DATE;

-- ── Step 2: Replace handle_new_user trigger ───────────────────────────────────
-- Creates profile with 0 credits (credits granted by FastAPI after IP check).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, avatar_url,
    remaining_credits, total_credits_granted,
    is_unlimited, is_admin
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    0,   -- credits granted by FastAPI after IP check
    0,
    FALSE,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = excluded.email,
        full_name  = COALESCE(excluded.full_name, profiles.full_name),
        avatar_url = COALESCE(excluded.avatar_url, profiles.avatar_url),
        updated_at = NOW();
  RETURN new;
END;
$$;

-- ── Step 3: Ensure trigger is attached ───────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Step 4: Add user_id to ai_analyses for RLS ───────────────────────────────
ALTER TABLE public.ai_analyses
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill user_id from resumes table
UPDATE public.ai_analyses a
  SET user_id = r.user_id
  FROM public.resumes r
  WHERE a.resume_id = r.id
    AND a.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_id ON public.ai_analyses(user_id);

ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own analyses" ON public.ai_analyses;
CREATE POLICY "Users can view own analyses"
  ON public.ai_analyses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can insert analyses" ON public.ai_analyses;
CREATE POLICY "Service role can insert analyses"
  ON public.ai_analyses FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete analyses" ON public.ai_analyses;
CREATE POLICY "Service role can delete analyses"
  ON public.ai_analyses FOR DELETE
  USING (true);

-- ── Step 5: Create daily_credit_grants table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_credit_grants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    grant_date  DATE NOT NULL,
    amount      INT  NOT NULL DEFAULT 50,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT daily_credit_grants_user_date_unique UNIQUE (user_id, grant_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_credit_grants_user_id
    ON public.daily_credit_grants(user_id);

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

-- ── Done ──────────────────────────────────────────────────────────────────────
-- Verify with:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY column_name;
-- SELECT * FROM pg_policies WHERE tablename IN ('ai_analyses', 'daily_credit_grants');
