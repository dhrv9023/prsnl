# 20260524000001_add_last_sign_in_at.sql

**Location:** `prsnl/supabase/migrations/20260524000001_add_last_sign_in_at.sql`  
**Type:** Database Migration (Schema Update / Telemetry tracking)

## What This Migration Does

This migration adds a `last_sign_in_at` timestamp column to the `public.profiles` table. This tracking column is updated by the backend API on every successful login (supporting both standard email/password registrations and Google OAuth pathways), allowing the Admin Panel to display the exact date and time a user last accessed the platform.

## How It Fits Into The System

- **What triggers it:** Applied during system updates.
- **What it depends on:**
  - `public.profiles` — target table.
- **What depends on it:**
  - FastAPI session endpoints (`auth.py`) — updates this column on successful token generation.
  - Admin Dashboard — displays active users and sorts accounts by their last active timestamp.

## Code Breakdown

### Column Addition
**Lines:** 6–7  
```sql
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ DEFAULT NULL;
```
Adds the `last_sign_in_at` column as a timezone-aware timestamp (`TIMESTAMPTZ`), defaulting to `NULL` for new registrations until their first login action completes.

### Chronological Performance Index
**Lines:** 9–11  
```sql
CREATE INDEX IF NOT EXISTS profiles_last_sign_in_at_idx
    ON public.profiles (last_sign_in_at DESC NULLS LAST);
```
Creates an index sorted descending with `NULLS LAST`. This is an optimized design that allows the admin panel to quickly retrieve the most recently active users without performance bottlenecks, while pushing inactive or unverified accounts to the end of the query results.

## Things To Know Before Editing

- **Timezone Preservation:** The column strictly uses the `TIMESTAMPTZ` type. Always preserve timezone awareness in your backend queries to ensure login events are logged accurately relative to different user locales.
