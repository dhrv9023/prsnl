# DashboardPage.tsx

**Location:** `prsnl/FRONTEND/src/pages/DashboardPage.tsx`  
**Type:** Authenticated Page

## What This File Does

The main user dashboard that provides a career intelligence overview. Displays ATS score, career readiness indicators, resume count, analysis count, credit balance, interview history, and past analysis results with expandable details. Acts as the central hub after login.

## How It Fits Into The System

- **Triggers:** Rendered at `/dashboard` route; redirects to `/` if not authenticated
- **Dependencies:** `apiDashboardSummary`, `apiInterviewHistory` from `api.ts`, `useAuthContext`, `useCreditContext`, layout components
- **Dependents:** None — leaf page component

## Code Breakdown

### Authentication Guard

On mount, checks `useAuthContext()` for a logged-in user. If no user and not loading, redirects to `/` (landing page). This prevents unauthenticated access.

### Data Fetching

Two parallel fetches on mount:
1. **`apiDashboardSummary()`** — returns ATS score, readiness metrics, resume count, analysis count, recent analyses
2. **`apiInterviewHistory()`** — returns past interview sessions with scores

Both use loading states with skeleton placeholders.

### Dashboard Sections

**Stats Row:** Cards showing key metrics (ATS score, resumes uploaded, analyses run, career readiness)

**Credit Card:** Uses `CreditCard` component from CreditDisplay to show balance with progress bar

**Interview History:** Recent sessions with score, role, and timestamp. Links to full history page.

**Analysis History:** Expandable cards showing past resume analyses. Each card reveals:
- ATS score with circular gauge
- Key findings and recommendations
- Timestamp and resume name

### Skeleton Loaders

While data is fetching, renders animated skeleton placeholders matching the layout of each section. Prevents layout shift when data arrives.

## Things To Know Before Editing

- The redirect logic must account for the `loading` state — don't redirect while auth is still being checked
- Dashboard summary is a single API call that aggregates data from multiple tables — if it's slow, the issue is backend
- Expandable analysis details use local state (`useState` per card) — not a global accordion
- The credit card here is the full `CreditCard` variant, not the compact navbar badge
- If you add new dashboard sections, maintain the skeleton loader pattern for consistency
