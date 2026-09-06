# supabase_migration.sql (Blog Application)

**Location:** `prsnl/kareerist_blog/supabase_migration.sql`  
**Type:** Database Migration Script (SQL Schema & Sample Data Setup)

## What This Migration Does

This SQL script is the complete database schema installer for the Kareerist Blog system. It:
1. **Creates the `blog_posts` table** inside the `public` schema.
2. **Defines columns and check constraints** (`type` and `media_type`).
3. **Creates a performance index** on `display_order` to optimize sorting queries.
4. **Configures Row-Level Security (RLS) policies** to grant public read access and authorize anonymous CRUD operations.
5. **Registers a trigger function** to automatically update `updated_at` timestamps on updates.
6. **Populates the database** with 5 high-value, professionally written career advice articles.

## How It Fits Into The System

- **What triggers it:** Run manually inside the Supabase SQL Editor or executed via a database provisioning script.
- **What depends on it:**
  - Standalone Blog (`App.tsx` and `Admin.tsx`) — queries and updates the table created by this script.
  - Main Site Contact Page (`Contact.tsx`) — fetches the recent posts feed from this table.

## Code Breakdown

### Table Definition and Check Constraints
**Lines:** 7–29  
Creates `public.blog_posts` with:
- `id` (UUID, PRIMARY KEY) defaulting to `gen_random_uuid()`.
- `type` (TEXT) constrained to `('featured', 'standard')` to ensure valid card layouts.
- `media_type` (TEXT) constrained to `('image', 'video')` to ensure standard media rendering formats.
- `display_order` (INTEGER, default 0) with a database index (`idx_blog_posts_display_order`) to optimize quick sorting operations.

### RLS Policies (Anonymous Editing Allowed)
**Lines:** 31–55, 72–74  
Because the administrative portal operates as a serverless client, this migration configures RLS policies to allow anonymous editing:
- **SELECT**: Accessible by any anonymous or authenticated role (`anon`, `authenticated`).
- **INSERT / UPDATE / DELETE**: Allowed for anonymous roles (`anon`).
This allows the password-protected admin dashboard on the client side to perform full CRUD actions directly through the Supabase SDK without requiring an intermediary server.

### Automatic Updated At Trigger
**Lines:** 57–70  
Creates a plpgsql trigger function `update_blog_posts_updated_at()` that fires `BEFORE UPDATE` on any blog post row, automatically updating the `updated_at` timestamp to `NOW()`.

### Seed Data
**Lines:** 80–495  
Inserts 5 professional, high-value career articles into the database:
- **Post 1 (Featured):** "Why Your Resume Scores 45/100 on ATS"
- **Post 2:** "The 6 Interview Question Types You'll Face"
- **Post 3:** "The 3-Paragraph Cover Letter Formula"
- **Post 4:** "The College Student's Resume Guide"
- **Post 5:** "Tech Resume Guide for Software Engineers"

## Things To Know Before Editing

- **Table Creation Safety:** The script uses `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` to ensure it can be run multiple times safely without overwriting existing data.
- **Clean Slate Option:** Note that Line 81 contains an active `DELETE FROM public.blog_posts` command. Running this script in its default state will wipe any existing custom posts and restore the 5 default seed articles. Comment out Line 81 if you want to retain your custom blog posts.
