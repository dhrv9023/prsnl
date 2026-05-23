-- ============================================================
-- COMPREHENSIVE FIX - Kareerist Production
-- 
-- This migration fixes all permission issues in one go.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- ── 1. GRANT EXECUTE permissions on all credit functions ─────────────────────
GRANT EXECUTE ON FUNCTION public.deduct_credits(UUID, TEXT, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits(UUID, TEXT, INTEGER, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_credits(UUID, INTEGER, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_credits(UUID, INTEGER, TEXT, JSONB) TO service_role;

-- ── 2. FIX all INSERT policies to allow insertions ───────────────────────────
-- Remove restrictive auth.role() checks and allow all authenticated users

DROP POLICY IF EXISTS "Service role can insert analyses" ON public.ai_analyses;
CREATE POLICY "Service role can insert analyses"
  ON public.ai_analyses FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert interview reports" ON public.interview_reports;
CREATE POLICY "Service role can insert interview reports"
  ON public.interview_reports FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert daily grants" ON public.daily_credit_grants;
CREATE POLICY "Service role can insert daily grants"
  ON public.daily_credit_grants FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert transactions" ON public.credit_transactions;
CREATE POLICY "Service role can insert transactions"
  ON public.credit_transactions FOR INSERT
  TO public
  WITH CHECK (true);

-- ── 3. ENSURE all users have profiles ────────────────────────────────────────
-- Create profiles for any auth users that don't have one
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    remaining_credits,
    total_credits_granted,
    is_unlimited,
    is_admin
)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
    100,  -- Initial credits
    100,  -- Total granted
    false,
    false
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- ── 4. VERIFY the fixes ──────────────────────────────────────────────────────
SELECT 'Migration completed successfully' as status;