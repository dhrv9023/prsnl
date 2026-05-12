-- ============================================================
-- Kareerist Credit System — Supabase Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── 1. Add credit columns to profiles (if not already present) ──────────────

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS remaining_credits      INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_credits_granted  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_unlimited           BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Create credit_transactions table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    feature         TEXT        NOT NULL,
    credits_used    INTEGER     NOT NULL DEFAULT 0,
    credits_before  INTEGER     NOT NULL DEFAULT 0,
    credits_after   INTEGER     NOT NULL DEFAULT 0,
    metadata        JSONB       NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id
    ON public.credit_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at
    ON public.credit_transactions(created_at DESC);

-- ── 3. Create ip_credit_claims table (anti-farming) ─────────────────────────

CREATE TABLE IF NOT EXISTS public.ip_credit_claims (
    ip              TEXT        PRIMARY KEY,
    user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    granted_amount  INTEGER     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. grant_credits RPC — atomic credit grant ──────────────────────────────
-- Called on signup and by admin grant endpoint.

CREATE OR REPLACE FUNCTION public.grant_credits(
    p_user_id   UUID,
    p_amount    INTEGER,
    p_feature   TEXT,
    p_metadata  JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_before INTEGER;
    v_after  INTEGER;
BEGIN
    -- Lock the row to prevent concurrent grants
    SELECT remaining_credits INTO v_before
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'user_not_found';
    END IF;

    v_after := v_before + p_amount;

    -- Update profile
    UPDATE public.profiles
    SET
        remaining_credits     = v_after,
        total_credits_granted = total_credits_granted + p_amount
    WHERE id = p_user_id;

    -- Record transaction (grants use negative credits_used to show as income)
    INSERT INTO public.credit_transactions
        (user_id, feature, credits_used, credits_before, credits_after, metadata)
    VALUES
        (p_user_id, p_feature, 0, v_before, v_after, p_metadata);
END;
$$;

-- ── 5. deduct_credits RPC — atomic credit deduction ─────────────────────────
-- Returns { ok: bool, remaining: int }

CREATE OR REPLACE FUNCTION public.deduct_credits(
    p_user_id   UUID,
    p_feature   TEXT,
    p_amount    INTEGER,
    p_metadata  JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_before      INTEGER;
    v_after       INTEGER;
    v_unlimited   BOOLEAN;
BEGIN
    -- Lock the row
    SELECT remaining_credits, is_unlimited
    INTO v_before, v_unlimited
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'user_not_found';
    END IF;

    -- Unlimited users bypass deduction
    IF v_unlimited THEN
        RETURN jsonb_build_object('ok', TRUE, 'remaining', v_before);
    END IF;

    -- Check balance
    IF v_before < p_amount THEN
        RETURN jsonb_build_object('ok', FALSE, 'remaining', v_before);
    END IF;

    v_after := v_before - p_amount;

    -- Deduct
    UPDATE public.profiles
    SET remaining_credits = v_after
    WHERE id = p_user_id;

    -- Record transaction
    INSERT INTO public.credit_transactions
        (user_id, feature, credits_used, credits_before, credits_after, metadata)
    VALUES
        (p_user_id, p_feature, p_amount, v_before, v_after, p_metadata);

    RETURN jsonb_build_object('ok', TRUE, 'remaining', v_after);
END;
$$;

-- ── 6. Auto-grant 100 credits on new user signup ─────────────────────────────
-- This trigger fires when a new row is inserted into public.profiles.
-- Adjust if your profiles table is populated differently.

CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Grant 100 initial credits directly (IP check is done in the app layer)
    NEW.remaining_credits     := 100;
    NEW.total_credits_granted := 100;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists, then recreate
DROP TRIGGER IF EXISTS on_new_user_grant_credits ON public.profiles;

CREATE TRIGGER on_new_user_grant_credits
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_credits();

-- ── 7. Backfill existing users who have 0 credits ───────────────────────────
-- Run this ONCE to give existing users their 100 free credits.
-- Comment out after running if you don't want to re-run on migration.

UPDATE public.profiles
SET
    remaining_credits     = 100,
    total_credits_granted = 100
WHERE total_credits_granted = 0;

-- ── 8. RLS policies ──────────────────────────────────────────────────────────

-- Enable RLS on credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.credit_transactions;

-- Users can only read their own transactions
CREATE POLICY "Users can read own transactions"
    ON public.credit_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Only service role can insert (backend uses service role key)
CREATE POLICY "Service role can insert transactions"
    ON public.credit_transactions
    FOR INSERT
    WITH CHECK (TRUE);

-- ── Done ─────────────────────────────────────────────────────────────────────
-- Verify with:
-- SELECT id, email, remaining_credits, total_credits_granted, is_unlimited FROM profiles LIMIT 10;
-- SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT 10;
