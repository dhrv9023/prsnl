-- ============================================================
-- Credit System Migration — Kareerist
-- Run with: supabase db push  OR paste into Supabase SQL Editor
-- ============================================================

-- ── 1. Extend public.profiles ─────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS remaining_credits  INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_credits_granted INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_unlimited        BOOLEAN  NOT NULL DEFAULT FALSE;

-- Backfill existing users who already have profiles (give them their 100 credits
-- only if they haven't been given credits yet AND their IP hasn't been seen).
-- Since we can't check IPs retroactively, we grant 100 to all existing users once.
UPDATE public.profiles
  SET remaining_credits = 100, total_credits_granted = 100
  WHERE remaining_credits = 0 AND total_credits_granted = 0;

-- Admin users get unlimited automatically
UPDATE public.profiles
  SET is_unlimited = TRUE
  WHERE is_admin = TRUE;

-- ── 2. IP credit claims table ─────────────────────────────────────────────────
-- One row per client IP. Prevents multi-account credit farming.
CREATE TABLE IF NOT EXISTS public.ip_credit_claims (
  ip              TEXT        PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_amount  INTEGER     NOT NULL DEFAULT 100,
  claimed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ip_credit_claims IS
  'Tracks which IPs have already claimed initial free credits. Prevents multi-account farming.';

-- ── 3. Credit transactions table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature        TEXT        NOT NULL,   -- 'ats_score' | 'deep_analysis' | 'hiring_intel' | 'interview' | 'cover_letter' | 'initial_grant'
  credits_used   INTEGER     NOT NULL,   -- positive = deduction, negative = grant
  credits_before INTEGER     NOT NULL,
  credits_after  INTEGER     NOT NULL,
  metadata       JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.credit_transactions IS
  'Full audit trail for every credit deduction and grant.';

CREATE INDEX IF NOT EXISTS credit_tx_user_created_idx
  ON public.credit_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS credit_tx_feature_idx
  ON public.credit_transactions (feature);

-- ── 4. Atomic deduct_credits RPC ──────────────────────────────────────────────
-- Called from the FastAPI backend via supabase.rpc('deduct_credits', {...}).
-- Uses FOR UPDATE row lock to prevent concurrent double-spend.
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_feature  TEXT,
  p_amount   INTEGER,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before    INTEGER;
  v_after     INTEGER;
  v_unlimited BOOLEAN;
BEGIN
  -- Lock the profile row to prevent concurrent deductions
  SELECT remaining_credits, is_unlimited
    INTO v_before, v_unlimited
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  -- Admins / unlimited users bypass credit check entirely
  IF v_unlimited THEN
    RETURN jsonb_build_object(
      'ok',        true,
      'remaining', v_before,
      'unlimited', true
    );
  END IF;

  -- Check sufficient balance
  IF v_before < p_amount THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  v_after := v_before - p_amount;

  -- Deduct from profile
  UPDATE public.profiles
    SET remaining_credits = v_after
    WHERE id = p_user_id;

  -- Write audit record
  INSERT INTO public.credit_transactions
    (user_id, feature, credits_used, credits_before, credits_after, metadata)
  VALUES
    (p_user_id, p_feature, p_amount, v_before, v_after, p_metadata);

  RETURN jsonb_build_object(
    'ok',        true,
    'remaining', v_after,
    'unlimited', false
  );
END;
$$;

-- ── 5. Grant credits function ──────────────────────────────────────────────────
-- Called from FastAPI after signup/OAuth when IP check passes.
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

  UPDATE public.profiles
    SET remaining_credits       = v_after,
        total_credits_granted   = total_credits_granted + p_amount
    WHERE id = p_user_id;

  INSERT INTO public.credit_transactions
    (user_id, feature, credits_used, credits_before, credits_after, metadata)
  VALUES
    (p_user_id, p_feature, -p_amount, v_before, v_after, p_metadata);
END;
$$;

-- ── 6. Admin helper: grant unlimited ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_unlimited(
  p_user_id    UUID,
  p_unlimited  BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
    SET is_unlimited = p_unlimited
    WHERE id = p_user_id;
END;
$$;

-- ── 7. Update handle_new_user trigger (start at 0, grant via app layer) ───────
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
    0,   -- credits granted by FastAPI after IP check
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

-- ── 8. RLS ────────────────────────────────────────────────────────────────────

-- credit_transactions: users see only their own rows
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ct_select_own" ON public.credit_transactions;
CREATE POLICY "ct_select_own"
  ON public.credit_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ip_credit_claims: no direct access for authenticated users
ALTER TABLE public.ip_credit_claims ENABLE ROW LEVEL SECURITY;
-- (No SELECT policy — only service role can read/write via security definer functions)

-- Grant permissions
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits TO authenticated;
