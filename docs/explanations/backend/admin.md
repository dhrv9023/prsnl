# admin.md

**Location:** `prsnl/backend/app/api/v1/endpoints/admin.py`  
**Type:** API Endpoint

## What This File Does

Provides admin-only endpoints for platform management. Includes platform-wide statistics, user management, credit history viewing, credit granting, and unlimited status toggling. All endpoints are protected by a server-side admin check that verifies the `is_admin` flag on the user's profile in the database — not just a frontend gate.

## How It Fits Into The System

- **Triggers:** Called by the frontend Admin page, which is only rendered for users with `is_admin: true` (as returned by `/me`).
- **Dependencies:** Supabase database (`profiles` table for admin check, `resumes` table, `ai_analyses` table, `credit_transactions` table for history), authentication middleware, credit service (for granting credits).
- **Dependents:** No other backend endpoints depend on this file. The frontend Admin page is the sole consumer.

## Code Breakdown

### Admin Guard (Authorization Check)

Every endpoint in this file first verifies the user is an admin:
1. Get the authenticated user's ID from the session.
2. Query the `profiles` table for `is_admin` flag.
3. If `is_admin` is not `true`, return 403 Forbidden.

This is a **server-side check** — it doesn't trust the frontend's knowledge of admin status. Even if someone crafts a direct API request, they'll be rejected without the database flag.

### Platform Stats (`GET /stats`)

Returns aggregate metrics for the entire platform:
- Total registered users
- Total resumes uploaded
- Total analyses performed
- Credit statistics (total granted, total consumed, average balance)

All queries are unscoped (no user_id filter) — they scan the full tables. This could become slow at scale.

### List Users (`GET /users`)

Returns all users on the platform with their:
- User ID, email, display name
- Current credit balance
- Account creation date
- `is_admin` flag
- `unlimited` status
- `last_sign_in_at` — Last login timestamp

Ordered by `last_sign_in_at` (most recent login first), with never-logged-in users at the bottom. No pagination currently — returns all users.

### User Activity (`GET /users/{user_id}/activity`)

**Added: May 29, 2026**

Returns comprehensive activity summary for a specific user across all platform features:

**Resumes:**
- Resume ID, file URL
- Resume quality feedback
- Upload timestamp
- Last 20 uploads

**Analyses:**
- Analysis ID and type (match, deep, hiring-intel)
- Creation timestamp
- Last 30 analyses

**Interviews:**
- Interview report ID
- Overall score and qualitative score
- Role and experience level
- Questions count
- Creation timestamp
- Associated resume_id
- Last 20 interviews

**Cover Letters:**
- Application ID, company name, job title
- Creation timestamp
- Last 20 cover letters

**Credit Transactions:**
- Transaction ID, feature, credits used
- Before/after balance
- Creation timestamp
- Last 30 transactions

Used by the admin panel's user activity modal (added May 29) to provide a 360° view of user engagement across all features.

### User Credit History (`GET /users/{user_id}/credit-history`)

Returns the full credit transaction log for a specific user:
- Transaction type (grant, deduction, refund)
- Amount
- Description/reason
- Timestamp
- Feature that triggered the transaction

Ordered by date (newest first). Limited to last 100 transactions. Useful for debugging credit issues or auditing usage.

### Grant Credits (`POST /users/{id}/grant-credits`)

Manually adds credits to a user's balance:
1. Validate the grant amount (must be positive).
2. Add credits to the user's balance.
3. Create a credit transaction record with type `admin_grant`.
4. Log the action with the admin's user ID for audit trail.
5. Return the new balance.

The audit log records WHO granted credits, TO WHOM, HOW MUCH, and WHEN.

### Set Unlimited (`POST /users/{id}/set-unlimited`)

Toggles a user's unlimited credit status:
1. Accept a boolean `unlimited` value.
2. Update the user's profile `unlimited` flag.
3. Log the action with the admin's user ID for audit trail.
4. Return confirmation.

When `unlimited` is true, the credit service skips balance checks for that user — they can use any feature without deduction.

## Things To Know Before Editing

- **The admin check queries the database on every request.** It doesn't cache the admin status. This is intentional for security (admin can be revoked immediately) but adds a query per request.
- **No pagination on `/users`.** This will become a problem at scale. If the platform grows beyond a few hundred users, add pagination parameters.
- **`/stats` queries are full table scans.** At scale, these will be slow. Consider materialized views or cached counters if performance degrades.
- **Audit logging is critical.** Every credit grant and unlimited toggle is logged with the admin's ID. Don't remove or bypass this — it's the only accountability mechanism for admin actions.
- **The `is_admin` flag is in the `profiles` table, not Supabase Auth metadata.** If you move it to auth metadata, you'll need to update this guard and the `/me` endpoint.
- **Grant credits creates a transaction record.** This means the credit history accurately reflects admin grants. Don't use direct database updates that bypass the transaction log.
- **Unlimited users still show in credit stats.** Their usage is tracked even though they're not charged. This is useful for understanding actual platform costs.
