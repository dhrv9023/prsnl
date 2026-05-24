-- Migration: add resume_id to interview_reports
-- This column lets us filter interview history by the selected resume
-- in the dashboard. Interviews started before this migration will have
-- resume_id = NULL and are shown regardless of which resume is selected.

ALTER TABLE public.interview_reports
    ADD COLUMN IF NOT EXISTS resume_id UUID
        REFERENCES public.resumes(id)
        ON DELETE SET NULL;

-- Index for fast resume-based filtering
CREATE INDEX IF NOT EXISTS interview_reports_resume_id_idx
    ON public.interview_reports (resume_id);
