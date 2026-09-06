# 20260524000002_add_resume_id_to_interview_reports.sql

**Location:** `prsnl/supabase/migrations/20260524000002_add_resume_id_to_interview_reports.sql`  
**Type:** Database Migration (Schema Update / History tracking)

## What This Migration Does

This migration adds a `resume_id` foreign key column to the `public.interview_reports` table. This updates the database schema to associate mock interview reports directly with the specific resume version used to generate them. 
This allows the frontend dashboard to filter the user's interview history based on their selected resume, improving tracking accuracy. It uses an `ON DELETE SET NULL` rule so that deleting a resume does not orphan or delete historical interview logs.

## How It Fits Into The System

- **What triggers it:** Applied during deployment.
- **What it depends on:**
  - `public.resumes` — target table for foreign keys.
  - `public.interview_reports` — modified table.
- **What depends on it:**
  - FastAPI Mock Interview Service — records the ID of the active resume when logging a new interview.
  - Frontend dashboard history grid — filters interview transcripts based on the selected resume version.

## Code Breakdown

### Column and Foreign Key Relationship
**Lines:** 6–9  
```sql
ALTER TABLE public.interview_reports
    ADD COLUMN IF NOT EXISTS resume_id UUID
        REFERENCES public.resumes(id)
        ON DELETE SET NULL;
```
Adds the `resume_id` UUID column and configures it to reference `public.resumes(id)`. 
Crucially, it uses the **`ON DELETE SET NULL`** rule: if a user deletes a historical resume draft, the associated interview report remains intact in the database with `resume_id = NULL`, preserving the user's historical interview logs and credit history.

### Index Definition
**Lines:** 11–13  
```sql
CREATE INDEX IF NOT EXISTS interview_reports_resume_id_idx
    ON public.interview_reports (resume_id);
```
Creates a database index on the `resume_id` column. This index accelerates frontend queries that filter interview history by the active resume.

## Things To Know Before Editing

- **Null Handling:** Legacy interview sessions created before this migration was deployed will have `resume_id = NULL`. Your frontend queries must be designed to fetch and display these legacy reports regardless of which resume is currently selected.
- **Data Integrity:** The `ON DELETE SET NULL` rule is a critical design decision. Changing this to `CASCADE` would cause users to lose their interview history if they deleted an old resume draft.
