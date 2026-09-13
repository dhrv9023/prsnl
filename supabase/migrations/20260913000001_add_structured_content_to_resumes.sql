-- ============================================================
-- Migration: Add structured_content column to resumes
-- Created:   2026-09-13
-- Purpose:   Stores the StructuredResume JSON representation
--            used by the Kareerist Resume Editor.
--
-- Safety contract:
--   - ADDITIVE ONLY — no existing column is touched.
--   - Existing rows default to NULL (parsed on first editor open).
--   - 100% reversible: DROP COLUMN IF EXISTS structured_content.
--   - RLS: governed by existing resumes policy (auth.uid() = user_id).
--   - No backfill required; parsing is lazy and on-demand.
-- ============================================================

-- 1. Add the JSONB column
ALTER TABLE public.resumes
ADD COLUMN IF NOT EXISTS structured_content JSONB DEFAULT NULL;

COMMENT ON COLUMN public.resumes.structured_content IS
'Stores the validated StructuredResume document representation used by the
Kareerist Resume Editor. NULL means the resume has not been opened in the
editor yet (will be parsed from parsed_content.raw_text on first access).';

-- 2. Partial GIN index for efficient JSONB queries on structured resumes only
--    (WHERE clause keeps index small — rows still being NULL are excluded)
CREATE INDEX IF NOT EXISTS idx_resumes_structured_content
ON public.resumes USING gin (structured_content)
WHERE structured_content IS NOT NULL;
