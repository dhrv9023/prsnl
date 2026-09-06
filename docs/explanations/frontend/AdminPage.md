# AdminPage.tsx

**Location:** `prsnl/FRONTEND/src/pages/AdminPage.tsx`  
**Type:** Authenticated Admin Page

## What This File Does

An admin-only dashboard with two tabs: Overview (platform statistics, credit system health, analysis breakdown chart, activity feed) and Users (user management with expandable rows, credit granting, and unlimited toggle). Protected by an `is_admin` check — non-admin users see an "Access Denied" message.

## How It Fits Into The System

- **Triggers:** Rendered at `/admin` route; requires authentication AND admin role
- **Dependencies:** `api.ts` (apiAdminStats, apiAdminUsers, apiGrantCredits, apiToggleUnlimited), `useAuthContext`
- **Dependents:** None — leaf page component

## Code Breakdown

### Admin Guard

On mount, checks `user.is_admin` from auth context. If `false`, renders an "Access Denied" card with a message and a link back to the dashboard. No API calls are made for non-admins.

### Overview Tab

**Stat Cards:** Grid of key platform metrics:
- Total users
- Active users (last 7 days)
- Total analyses run
- Total interviews completed
- Credits consumed
- Revenue (if applicable)

**Credit System Overview:** Summary of credit distribution — total granted, total consumed, average balance per user.

**Analysis Breakdown Chart:** Visual chart (likely a bar or pie chart) showing distribution of analysis types (ATS vs Deep vs Hiring Intel).

**Activity Feed:** Recent platform activity (new signups, analyses run, interviews completed) as a scrollable list with timestamps.

### Users Tab

**User List:** Expandable rows, each showing:
- Email, signup date, last active
- Credit bar (visual progress of remaining/total credits)
- Expand to reveal:
  - **Grant Credits Input:** Number input + "Grant" button → calls `apiGrantCredits(userId, amount)`
  - **Toggle Unlimited Button:** Switches user to unlimited credits → calls `apiToggleUnlimited(userId)`

**Grant Credits Flow:**
1. Admin enters amount in input field
2. Clicks "Grant"
3. Calls `apiGrantCredits(userId, amount)`
4. On success, updates the user's displayed balance locally
5. Shows toast confirmation

**Toggle Unlimited Flow:**
1. Admin clicks "Toggle Unlimited"
2. Calls `apiToggleUnlimited(userId)`
3. Updates UI to show infinity symbol / "Unlimited" badge
4. User's credit checks will always pass on backend

## Things To Know Before Editing

- The `is_admin` check is client-side for UI purposes — the backend also validates admin status on every admin API call
- Never rely solely on the frontend guard — a determined user could bypass it. Backend protection is the real security layer.
- Grant credits is additive (adds to existing balance), not a set operation
- The activity feed may need pagination for large platforms — check if it's currently paginated
- Chart libraries (if used) add bundle size — ensure they're lazy-loaded with the admin page chunk
- This page is rarely visited — performance optimization is lower priority than user-facing pages
