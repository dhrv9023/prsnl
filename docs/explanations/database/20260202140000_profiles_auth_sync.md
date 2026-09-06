# 20260202140000_profiles_auth_sync.sql

**Location:** `prsnl/supabase/migrations/20260202140000_profiles_auth_sync.sql`  
**Type:** Database Migration (Schema Setup / Sync Engine)

## What This Migration Does

This migration sets up the core application-level user records by creating the `public.profiles` table and establishing an automatic sync system from Supabase's native `auth.users` authentication schema. It handles sync creation (on new sign-ups) and metadata updates (such as name or avatar changes via Google OAuth logins), applies Row-Level Security (RLS) policies, and runs an idempotent backfill script to populate profiles for any users that signed up before the migration was executed.

## How It Fits Into The System

- **What triggers it:** Automatically applied during database provisioning or running the Supabase CLI (`supabase db push`). After execution, any user inserts or updates in `auth.users` automatically trigger the profile synchronization handlers.
- **What it depends on:**
  - `auth.users` — Supabase's system schema representing authenticated user credentials.
- **What depends on it:** Almost every table in the database references `public.profiles(id)` as a foreign key representing the active user account.

## Code Breakdown

### Table definition
**Lines:** 5–12  
Creates the `public.profiles` table with:
- `id` (UUID, PRIMARY KEY) referencing `auth.users(id)` with `on delete cascade`. This guarantees that if a user deletes their account, all app profile metrics are wiped cleanly for compliance.
- `email`, `full_name`, `avatar_url`.
- `created_at` / `updated_at`.

### Trigger Procedures
**Lines:** 35–95  
Defines two Postgres triggers using the **`security definer`** attribute with search paths forced to `public`. This is a critical security pattern that allows the trigger to execute updates in `public` with elevated privileges even though `auth.users` is a system table.
- **`handle_new_user()`**: Fired `AFTER INSERT` on `auth.users`. It extracts `full_name` and `avatar_url` from OAuth metadata blocks (`raw_user_meta_data`) and inserts a profile. If a record already exists, it updates it.
- **`handle_user_auth_update()`**: Fired `AFTER UPDATE OF email, raw_user_meta_data` on `auth.users`. It updates the cached email and preserves the existing fields if the incoming updates are blank.

### Row Level Security (RLS)
**Lines:** 133–153  
RLS is enabled to protect profile information:
- **`profiles_select_own`**: Authenticated users can only read their own profile row (`auth.uid() = id`).
- **`profiles_update_own`**: Users can only update their own profile row.
- **Insert Policy:** Intentionally absent. Profiles can **only** be created by the system trigger (`security definer` running as owner) to prevent fake account creation bypasses.

## Things To Know Before Editing

- **Security Definer Vulnerability Mitigation:** The procedures are declared with `set search_path = public` (Lines 39, 70). This prevents malicious users from executing SQL search-path hijacking attacks by manipulating temporary schema names. Do not remove `set search_path`.
- **OAuth Fields mapping:** The extraction reads from both `full_name` and standard `name` to support both standard Google OAuth payloads and email registrations.
