# 20260515000002_interview_reports.sql

**Location:** `prsnl/supabase/migrations/20260515000002_interview_reports.sql`  
**Type:** Database Migration (Table Schema and RLS)

## What This Migration Does

This migration creates the `public.interview_reports` table, which is designed to persistently store the results of completed mock interviews. Before this migration, interview transcripts and AI evaluations only existed inside transient Redis caches (which expired after a short TTL). This migration adds durable columns, fast look-up indexes, and configures Row-Level Security (RLS) policies allowing users to view their own records while securing insertion permissions.

## How It Fits Into The System

- **What triggers it:** Applied during database build stages (`supabase db push`).
- **What it depends on:**
  - `auth.users` — references `auth.users(id)` as a foreign key with cascade deletions.
- **What depends on it:**
  - FastAPI Mock Interview service (`ai_interview.py`) — updates profile rows and inserts final completed interview reports into this table on session conclusion.
  - Frontend history tab (`/interview-history`) — reads historical reports to render results.

## Code Breakdown

### Table Definition
**Lines:** 4–15  
Establishes the `public.interview_reports` table:
- `id` (UUID, PRIMARY KEY) defaults to `gen_random_uuid()`.
- `user_id` (UUID, foreign key to `auth.users(id)` with `ON DELETE CASCADE`). Deleting a user account cleans up all corresponding mock interview records for absolute GDPR/privacy compliance.
- `overall_score` (NUMERIC(4,1)) — stores numeric ratings (e.g. 7.5, 8.0).
- `qualitative_score` (TEXT) — stores rating descriptions.
- `breakdown` (JSONB, default `[]`) — stores the complete question, answer, and AI feedback array, allowing rich nested JSON trees to be saved inside a single row.
- `role` / `experience_level` / `questions_count` / `answers_count`.

### Database Indexes
**Lines:** 17–22  
Defines two query optimizing indexes:
- **`idx_interview_reports_user_id`**: Accelerates dashboard queries compiling historical statistics for a specific user.
- **`idx_interview_reports_created_at`**: Optimized for ordering list queries descending (`created_at DESC`) to render the "Most Recent Interviews" feed instantly without database sorting overhead.

### Row Level Security (RLS)
**Lines:** 24–41  
- **`Users can view own interview reports`**: Restricts `SELECT` access so authenticated users can only load their own interview reports (`auth.uid() = user_id`).
- **`Service role can insert interview reports`**: Grants the FastAPI backend (`service_role` / system key) absolute insertion permissions.
- **Immutability Principle:** Note that there are **no UPDATE or DELETE policies** assigned to authenticated roles. Once generated, an interview report becomes immutable.

## Things To Know Before Editing

- **Large Payload Warning:** Because the `breakdown` column holds the entire transcript and paragraph evaluations as JSONB, this column can grow large. Use paginated limits when querying this table to avoid database transfer bottlenecking.
- **Decimal Precision:** `overall_score` is a decimal type `NUMERIC(4,1)`. Do not submit scores with higher decimal levels, as Postgres will round them to fit.
