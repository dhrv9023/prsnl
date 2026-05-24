-- Migration: add last_sign_in_at to profiles
-- This column is updated by the backend on every successful login
-- (both email/password and OAuth) so the admin panel can display
-- when each user last logged in.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ DEFAULT NULL;

-- Index for sorting/filtering by last login (optional but useful)
CREATE INDEX IF NOT EXISTS profiles_last_sign_in_at_idx
    ON public.profiles (last_sign_in_at DESC NULLS LAST);
