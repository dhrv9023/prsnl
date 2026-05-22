-- Migration: Create interview_reports table for persistent interview report storage
-- Run this in Supabase SQL Editor before deploying the interview persistence fix.

CREATE TABLE IF NOT EXISTS public.interview_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    overall_score NUMERIC(4, 1) NOT NULL DEFAULT 0,
    qualitative_score TEXT,
    breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    role TEXT,
    experience_level TEXT,
    questions_count INTEGER DEFAULT 0,
    answers_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user-scoped queries
CREATE INDEX IF NOT EXISTS idx_interview_reports_user_id
    ON public.interview_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_interview_reports_created_at
    ON public.interview_reports(created_at DESC);

-- RLS: users can only read their own reports
ALTER TABLE public.interview_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own interview reports" ON public.interview_reports;
DROP POLICY IF EXISTS "Service role can insert interview reports" ON public.interview_reports;

-- Users can only read their own reports
CREATE POLICY "Users can view own interview reports"
    ON public.interview_reports
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role (backend) can insert
CREATE POLICY "Service role can insert interview reports"
    ON public.interview_reports
    FOR INSERT
    WITH CHECK (true);

COMMENT ON TABLE public.interview_reports IS 'Persisted interview reports — survives Redis TTL expiry';
