-- ============================================================
-- Audit Fixes Migration — Kareerist
-- Fixes identified in the May 2026 security audit.
-- Run with: supabase db push  OR paste into Supabase SQL Editor
-- ============================================================

-- ── 1. Fix handle_new_user trigger to start credits at 0 ─────────────────────
-- Credits are now granted by the FastAPI app layer after IP check.
-- This prevents the Supabase trigger from bypassing the IP-farming guard.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url,
                                remaining_credits, total_credits_granted)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    0,   -- credits granted by FastAPI after IP check (NOT by trigger)
    0
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = excluded.email,
        full_name  = COALESCE(excluded.full_name, profiles.full_name),
        avatar_url = COALESCE(excluded.avatar_url, profiles.avatar_url),
        updated_at = NOW();
  RETURN new;
END;
$$;

-- ── 2. Add user_id to ai_analyses for direct RLS protection ──────────────────
-- Previously ai_analyses only had resume_id, making RLS impossible.
-- This adds user_id so we can write: USING (user_id = auth.uid())
ALTER TABLE public.ai_analyses
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill user_id from the resumes table for existing rows
UPDATE public.ai_analyses a
  SET user_id = r.user_id
  FROM public.resumes r
  WHERE a.resume_id = r.id
    AND a.user_id IS NULL;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_id
  ON public.ai_analyses(user_id);

-- Enable RLS on ai_analyses
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

-- ── 3. Add resume count constraint (enforced at app layer, documented here) ───
-- The app layer enforces MAX_RESUMES_PER_USER = 20.
-- This comment documents the intent for future DB-level enforcement if needed.
-- ALTER TABLE public.resumes ADD CONSTRAINT max_resumes_per_user ...
-- (Requires a trigger or check constraint — app layer is sufficient for now)

-- ── 4. Ensure ip_credit_claims has correct ON DELETE behavior ─────────────────
-- The original migration used ON DELETE CASCADE which would delete the IP claim
-- if the user is deleted — allowing re-farming from the same IP.
-- Change to SET NULL so the IP record persists even if the user is deleted.
-- Note: This requires dropping and recreating the FK constraint.
-- Only run this if your ip_credit_claims table was created with CASCADE.
-- ALTER TABLE public.ip_credit_claims
--   DROP CONSTRAINT IF EXISTS ip_credit_claims_user_id_fkey;
-- ALTER TABLE public.ip_credit_claims
--   ADD CONSTRAINT ip_credit_claims_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── Done ──────────────────────────────────────────────────────────────────────
-- Verify with:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'ai_analyses';
-- SELECT * FROM pg_policies WHERE tablename = 'ai_analyses';
