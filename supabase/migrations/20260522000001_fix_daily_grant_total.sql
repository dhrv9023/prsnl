-- ============================================================
-- Fix: daily grants should NOT accumulate total_credits_granted
--
-- Problem: grant_credits() always does total_credits_granted += amount,
-- so daily 50-credit grants inflate the total: 100 → 150 → 200 etc.
--
-- Fix: only increment total_credits_granted for the initial grant.
-- Daily grants (p_feature = 'daily_grant') only top up remaining_credits
-- to 50 — they do NOT change total_credits_granted.
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
  SELECT remaining_credits INTO v_before
    FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  v_after := v_before + p_amount;

  -- Only count towards total_credits_granted for real grants (not daily top-ups).
  -- Daily grants just refill remaining_credits — they don't change the lifetime total.
  IF p_feature = 'daily_grant' THEN
    UPDATE public.profiles
      SET remaining_credits     = v_after,
          total_credits_granted = p_amount   -- reset total to 50 so UI shows 50/50
      WHERE id = p_user_id;
  ELSE
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
