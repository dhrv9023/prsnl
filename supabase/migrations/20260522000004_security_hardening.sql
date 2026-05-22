-- ============================================================
-- Security Hardening Migration
--
-- Fixes two issues found in final security review:
--
-- 1. deduct_credits EXECUTE was granted to `authenticated` role.
--    Any logged-in user could call it directly via supabase.rpc()
--    and deduct credits from any user_id they supply.
--    Fix: revoke from authenticated, keep only service_role access.
--    The backend already uses service_role for all RPC calls.
--
-- 2. INSERT RLS policies on ai_analyses, interview_reports, and
--    daily_credit_grants used WITH CHECK (true) — meaning any
--    authenticated user could insert rows with arbitrary user_id.
--    Fix: restrict INSERT to service_role only using auth.role().
--
-- Run in Supabase SQL Editor.
-- ============================================================

-- ── 1. Lock down deduct_credits ───────────────────────────────────────────────
-- The original credit_system migration granted EXECUTE to authenticated.
-- Only the backend (service_role) should call this.
REVOKE EXECUTE ON FUNCTION public.deduct_credits(UUID, TEXT, INTEGER, JSONB)
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_credits(UUID, TEXT, INTEGER, JSONB)
  FROM anon;
REVOKE EXECUTE ON FUNCTION public.deduct_credits(UUID, TEXT, INTEGER, JSONB)
  FROM PUBLIC;

-- ── 2. Fix INSERT RLS on ai_analyses ─────────────────────────────────────────
-- Old: WITH CHECK (true) — any authenticated user could insert with any user_id
-- New: only service_role (backend) can insert
DROP POLICY IF EXISTS "Service role can insert analyses" ON public.ai_analyses;
CREATE POLICY "Service role can insert analyses"
  ON public.ai_analyses FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── 3. Fix INSERT RLS on interview_reports ────────────────────────────────────
DROP POLICY IF EXISTS "Service role can insert interview reports" ON public.interview_reports;
CREATE POLICY "Service role can insert interview reports"
  ON public.interview_reports FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── 4. Fix INSERT RLS on daily_credit_grants ─────────────────────────────────
DROP POLICY IF EXISTS "Service role can insert daily grants" ON public.daily_credit_grants;
CREATE POLICY "Service role can insert daily grants"
  ON public.daily_credit_grants FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── Verify ────────────────────────────────────────────────────────────────────
-- SELECT grantee, privilege_type FROM information_schema.role_routine_grants
--   WHERE routine_name = 'deduct_credits';
-- SELECT * FROM pg_policies WHERE tablename IN ('ai_analyses','interview_reports','daily_credit_grants');
