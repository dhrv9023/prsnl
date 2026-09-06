# Chapter 07 — Database & Migrations

## Tables

### `profiles`
App-level user row, synced from `auth.users` via trigger.

```sql
id                    UUID PRIMARY KEY → auth.users(id)
email                 TEXT
full_name             TEXT
avatar_url            TEXT
remaining_credits     INTEGER NOT NULL DEFAULT 0
total_credits_granted INTEGER NOT NULL DEFAULT 0
is_unlimited          BOOLEAN NOT NULL DEFAULT FALSE
is_admin              BOOLEAN NOT NULL DEFAULT FALSE
last_daily_grant_date DATE
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

RLS: users can SELECT and UPDATE their own row only.

### `resumes`
Uploaded resume metadata + extracted text.

```sql
id               UUID PRIMARY KEY
user_id          UUID → auth.users(id)
file_url         TEXT    -- Supabase Storage path
parsed_content   JSONB   -- { raw_text, word_count, ... }
resume_quality_feedback TEXT
created_at       TIMESTAMPTZ
```

### `ai_analyses`
All AI analysis results. One row per analysis run.

```sql
id            UUID PRIMARY KEY
resume_id     UUID → resumes(id)
user_id       UUID → auth.users(id)   -- added in audit_fixes migration
analysis_type TEXT   -- 'job_match_score' | 'deep_analysis' | 'hiring_intel'
output_data   JSONB  -- the full analysis result
created_at    TIMESTAMPTZ
```

RLS: users can SELECT their own rows. Service role can INSERT and DELETE.

### `job_applications`
Cover letter drafts and saved PDFs.

```sql
id           UUID PRIMARY KEY
user_id      UUID → auth.users(id)
resume_id    UUID → resumes(id)
company_name TEXT
job_title    TEXT
final_text   TEXT   -- the cover letter content
pdf_url      TEXT   -- Supabase Storage path (if saved)
created_at   TIMESTAMPTZ
```

### `credit_transactions`
Full audit trail for every credit change.

```sql
id             UUID PRIMARY KEY
user_id        UUID → auth.users(id)
feature        TEXT    -- 'ats_score' | 'initial_grant' | 'daily_grant' | etc.
credits_used   INTEGER -- positive = deduction, negative = grant
credits_before INTEGER
credits_after  INTEGER
metadata       JSONB
created_at     TIMESTAMPTZ
```

Indexes: `(user_id, created_at DESC)`, `(feature)`.
RLS: users can SELECT their own rows.

### `ip_credit_claims`
Anti-farming: one IP = one initial credit grant.

```sql
ip              TEXT PRIMARY KEY
user_id         UUID → auth.users(id) ON DELETE SET NULL
granted_amount  INTEGER
claimed_at      TIMESTAMPTZ
```

RLS: enabled, no SELECT policy for authenticated users. Only service role can read/write.

### `interview_reports`
Persisted interview reports (survives Redis TTL expiry).

```sql
id               UUID PRIMARY KEY
user_id          UUID → auth.users(id)
overall_score    NUMERIC(4,1)
qualitative_score TEXT   -- 'Poor' | 'Decent' | 'Good' | 'Very Good' | 'Excellent'
breakdown        JSONB   -- array of { question, type, user_answer, score, feedback, ideal_answer }
role             TEXT
experience_level TEXT
questions_count  INTEGER
answers_count    INTEGER
created_at       TIMESTAMPTZ
```

Indexes: `(user_id)`, `(created_at DESC)`.
RLS: users can SELECT their own rows. Service role can INSERT.

### `daily_credit_grants`
Tracks daily 50-credit grants per user per day.

```sql
id         UUID PRIMARY KEY
user_id    UUID → auth.users(id)
grant_date DATE
amount     INT DEFAULT 50
created_at TIMESTAMPTZ
UNIQUE (user_id, grant_date)
```

RLS: users can SELECT their own rows. Service role can INSERT.

---

## PostgreSQL Functions

### `handle_new_user()` (trigger)
Fires on `INSERT` to `auth.users`. Creates a profile row with 0 credits. Credits are granted by the FastAPI app layer after IP check — not by the trigger.

### `deduct_credits(p_user_id, p_feature, p_amount, p_metadata)`
Atomic credit deduction with `FOR UPDATE` row lock. Returns `{ ok, remaining, unlimited }`. EXECUTE revoked from all non-service roles.

### `grant_credits(p_user_id, p_amount, p_feature, p_metadata)`
Credit grant. For `daily_grant`: tops up TO cap, doesn't touch `total_credits_granted`. For all others: adds to both `remaining_credits` and `total_credits_granted`. EXECUTE revoked from all non-service roles. Has in-body caller check.

### `admin_set_unlimited(p_user_id, p_unlimited)`
Sets `is_unlimited` flag. EXECUTE revoked from all non-service roles.

### `admin_credit_stats()`
Returns `{ total_granted, total_remaining }` as a DB-side aggregate. Used by admin stats endpoint instead of fetching all profile rows.

---

## Migrations (in order)

| File | What it does |
|------|-------------|
| `20260202140000_profiles_auth_sync.sql` | Creates `profiles` table, `handle_new_user` trigger, RLS |
| `20260513000000_credit_system.sql` | Adds credit columns to profiles, creates `ip_credit_claims`, `credit_transactions`, `deduct_credits` RPC, `grant_credits` RPC, `admin_set_unlimited` |
| `20260515000001_audit_fixes.sql` | Fixes `handle_new_user` to start at 0 credits, adds `user_id` to `ai_analyses`, fixes `ip_credit_claims` FK to `ON DELETE SET NULL` |
| `20260515000002_interview_reports.sql` | Creates `interview_reports` table with RLS |
| `20260517000001_daily_credits.sql` | Creates `daily_credit_grants` table, adds `last_daily_grant_date` to profiles |
| `20260522000001_fix_daily_grant_total.sql` | Fixes `grant_credits` daily grant logic (cap vs add), adds security hardening (REVOKE, caller check, amount validation) |
| `20260522000003_admin_credit_stats_rpc.sql` | Creates `admin_credit_stats()` aggregate function |
| `20260522000004_security_hardening.sql` | Revokes `deduct_credits` EXECUTE from `authenticated`, fixes INSERT RLS policies to use `auth.role() = 'service_role'` |

---

## RLS Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | Own row | Via trigger only | Own row | — |
| `resumes` | Own rows | Service role | Own rows | Own rows |
| `ai_analyses` | Own rows | Service role | — | Service role |
| `job_applications` | Own rows | Service role | Own rows | Own rows |
| `credit_transactions` | Own rows | Via RPC only | — | — |
| `ip_credit_claims` | None | Via RPC only | — | — |
| `interview_reports` | Own rows | Service role | — | — |
| `daily_credit_grants` | Own rows | Service role | — | — |
