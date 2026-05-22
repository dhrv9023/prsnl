-- ============================================================
-- Fix: daily grants should NOT accumulate total_credits_granted
--
-- Problem: grant_credits() always does total_credits_granted += amount,
-- so daily 50-credit grants inflate the total: 100 → 150 → 200 etc.
--
-- Fix: only increment total_credits_granted for the initial grant.
-- Daily grants (p_feature = 'daily_grant') only top up remaining_credits
-- TO the cap (p_amount) — they do NOT add on top, and do NOT change
-- total_credits_granted.
--
-- Security fixes applied:
--   1. REVOKE execute from public/authenticated/anon — only service_role
--      (backend) may call this function.
--   2. In-body caller check as defense-in-depth.
--   3. p_amount must be positive — prevents negative-amount abuse.
--   4. NOT FOUND raises an exception instead of silently returning.
--
-- Run in Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION public.grant_credits(
  p_user_id UUID,
  p_amount  INTEGER,
  p_feature TEXT DEFAULT 'initial_grant',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before INTEGER;
  v_after  INTEGER;
BEGIN
  -- ── Issue #1 fix: defense-in-depth caller check ──────────────────────────
  -- Primary protection is the REVOKE block at the bottom of this file.
  -- This guard catches any misconfigured grant that re-enables public access.
  IF current_setting('role') NOT IN ('service_role', 'supabase_admin') THEN
    RAISE EXCEPTION 'access_denied: only service_role may call grant_credits';
  END IF;

  -- ── Issue #4 fix: reject non-positive amounts ────────────────────────────
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: p_amount must be a positive integer, got %', p_amount;
  END IF;

  SELECT remaining_credits INTO v_before
    FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  -- ── Issue #5 fix: raise instead of silent return ─────────────────────────
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found: no profile exists for user_id %', p_user_id;
  END IF;

  -- ── Issues #2 & #3 fix: daily grant tops up TO the cap, never adds on top,
  --    and never touches total_credits_granted (preserves purchase history). ──
  IF p_feature = 'daily_grant' THEN
    IF v_before >= p_amount THEN
      -- Already at or above the daily cap — nothing to do.
      RETURN;
    END IF;
    -- Top up TO the cap, not on top of current balance.
    v_after := p_amount;

    UPDATE public.profiles
      SET remaining_credits = v_after
      -- total_credits_granted intentionally NOT touched for daily grants
      WHERE id = p_user_id;

  ELSE
    -- Real grant (initial_grant, promo, purchase, etc.): add on top and
    -- record in the lifetime total.
    v_after := v_before + p_amount;

    UPDATE public.profiles
      SET remaining_credits     = v_after,
          total_credits_granted = total_credits_granted + p_amount
      WHERE id = p_user_id;
  END IF;

  INSERT INTO public.credit_transactions
    (user_id, feature, credits_used, credits_before, credits_after, metadata)
  VALUES
    (p_user_id, p_feature, -p_amount, v_before, v_after, p_metadata);
END;
$$;

-- ── Issue #1 fix: revoke execute from all non-service roles ──────────────────
-- grant_credits must ONLY be callable from the FastAPI backend using the
-- service_role key. Authenticated users calling it directly would be able to
-- grant themselves unlimited credits.
REVOKE EXECUTE ON FUNCTION public.grant_credits(UUID, INTEGER, TEXT, JSONB)
  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_credits(UUID, INTEGER, TEXT, JSONB)
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_credits(UUID, INTEGER, TEXT, JSONB)
  FROM anon;
