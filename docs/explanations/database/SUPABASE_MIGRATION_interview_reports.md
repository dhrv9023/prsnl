# SUPABASE_MIGRATION_interview_reports.sql

**Location:** `prsnl/backend/SUPABASE_MIGRATION_interview_reports.sql`  
**Type:** Database Migration

## What This File Does

Creates the `interview_reports` table for persistent storage of completed mock interview reports. Previously, reports only existed in Redis and were lost on TTL expiry. This table stores `overall_score`, `qualitative_score`, full breakdown JSONB, role, experience level, and question/answer counts.

## How It Fits Into The System

- **Triggers:** Must be run manually via Supabase SQL editor or `psql` before deploying the interview persistence feature. Located in the backend directory (not in `supabase/migrations/`) so it's not auto-applied.
- **Dependencies:** Requires `auth.users` table (for the user_id FK). The interview feature in FastAPI must be updated to write to this table after generating a report.
- **Dependents:** The frontend's Interview History page (`/interview-history`) reads from this table. The FastAPI interview completion endpoint writes here after generating the final report from Redis session data.

## Code Breakdown

### Table Creation

Creates `interview_reports` with the following schema:

| Column | Type | Details |
|--------|------|---------|
| `id` | UUID | Primary key, `gen_random_uuid()` default |
| `user_id` | UUID | FK to `auth.users(id)` with `ON DELETE CASCADE` |
| `overall_score` | NUMERIC(4,1) | Allows scores like 7.5, 10.0 (max 999.9) |
| `qualitative_score` | TEXT | Human-readable rating (e.g., "Good", "Excellent", "Needs Improvement") |
| `breakdown` | JSONB | Full question/answer/evaluation data, defaults to `'[]'::jsonb` |
| `role` | TEXT | The job role being interviewed for (e.g., "Backend Developer") |
| `experience_level` | TEXT | Candidate's experience level (e.g., "Mid-level", "Senior") |
| `questions_count` | INTEGER | Total questions asked in the interview |
| `answers_count` | INTEGER | Total questions answered (may be less if user skipped) |
| `created_at` | TIMESTAMPTZ | Auto-set to `now()` on insert |

The `breakdown` JSONB column stores the complete interview data structure — each element typically contains the question text, user's answer, AI evaluation, individual score, and feedback. This can be large (several KB per report).

### Indexes

Two indexes optimize the most common query patterns:

- **`idx_interview_reports_user_id`** on `(user_id)` — fast lookup of all reports for a specific user. Used by the history page and dashboard.
- **`idx_interview_reports_created_at`** on `(created_at DESC)` — chronological listing with newest first. Used for "recent interviews" displays.

### RLS (Row Level Security)

RLS is enabled with two policies:

- **SELECT policy** (`"Users can view own reports"`): Authenticated users can only read rows where `auth.uid() = user_id`. A user cannot see another user's interview reports.
- **INSERT policy** (service role only): Only the backend (using the service role key) can insert new reports. Users cannot fabricate interview reports through the client.

There is intentionally **no UPDATE or DELETE policy** — interview reports are immutable once created. Neither users nor the backend are expected to modify or delete individual reports (cascade delete from `auth.users` handles account deletion).

## Things To Know Before Editing

- The `breakdown` column stores the full question/answer/evaluation data as JSONB — this can be **several KB per row**. Be mindful of this when writing queries that SELECT all columns without pagination.
- `overall_score` is `NUMERIC(4,1)` allowing one decimal place (e.g., 7.5, 8.0). The max representable value is 999.9 — in practice scores are 0.0–10.0.
- This migration must be run **BEFORE** deploying the interview persistence feature. If the table doesn't exist, the backend will fail silently (or error) when trying to save reports.
- The table has **no UPDATE policy** — reports are immutable once created. If you need to allow corrections, you'll need to add an UPDATE policy and consider the implications for data integrity.
- This file lives in `backend/` not `supabase/migrations/` — it won't be auto-applied by `supabase db push`. You must run it manually.
- The `ON DELETE CASCADE` on `user_id` means deleting a user from `auth.users` automatically deletes all their interview reports. This is intentional for GDPR compliance.
