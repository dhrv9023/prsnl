# App.tsx

**Location:** `prsnl/FRONTEND/src/App.tsx`  
**Type:** Application Shell / Router

## What This File Does

Sets up the entire application structure: React Router for client-side navigation, context providers (QueryClient, Tooltip, Auth, Credit), and lazy-loaded route components with a custom retry mechanism for handling stale chunks after Vercel redeploys. This is the single orchestration point between bootstrapping (`main.tsx`) and actual page content.

## How It Fits Into The System

- **Triggers:** Rendered by `main.tsx` as the root component
- **Dependencies:** React Router, TanStack Query, Tooltip provider, `AuthProvider`, `CreditProvider`, all page components (lazy-loaded)
- **Dependents:** Every page and layout component lives inside this shell

## Code Breakdown

### lazyWithRetry Helper

Wraps `React.lazy()` with chunk-load failure recovery. When Vercel redeploys, old chunk hashes become invalid. This helper:
1. Catches the dynamic import error
2. Checks `sessionStorage` to see if a reload was already attempted
3. If not, sets a flag and calls `window.location.reload()` to fetch fresh chunks
4. If already retried, renders an error fallback instead of infinite reload loops

### Provider Stack

Nests providers in this order (outermost → innermost):
1. `QueryClientProvider` — TanStack Query cache for server state
2. `TooltipProvider` — shadcn/ui tooltip context
3. `AuthProvider` — user session, login/logout state
4. `CreditProvider` — credit balance, feature costs, optimistic deductions

Order matters: CreditProvider depends on auth state, so it must be inside AuthProvider.

### Route Definitions

| Path | Component | Notes |
|------|-----------|-------|
| `/` | Index | Landing page (public) |
| `/dashboard` | DashboardPage | Authenticated |
| `/admin` | AdminPage | Admin-only |
| `/resume-analysis` | ResumeAnalysis | Authenticated |
| `/interview` | AIInterview | Authenticated |
| `/cover-letter` | CoverLetter | Authenticated |
| `/credits` | CreditsPage | Authenticated |
| `/interview/history` | InterviewHistory | Authenticated |
| `/auth/callback` | AuthCallback | OAuth redirect handler |
| `/pricing` | NotFound | Placeholder redirect |
| `*` | NotFound | Catch-all 404 |

### Suspense Fallback

All lazy routes are wrapped in `<Suspense>` with a loading spinner/skeleton. This shows while chunks are being downloaded.

## Things To Know Before Editing

- Adding a new route? Import it with `lazyWithRetry`, not plain `React.lazy` — otherwise stale deploys will break it
- Provider order is intentional — don't reorder without checking dependencies between contexts
- The `QueryClient` is created outside the component (module-level) so it persists across re-renders
- Route-level code splitting means each page is a separate chunk — keep page components as route-level exports
- The `/pricing` route intentionally renders NotFound — pricing is handled externally or not yet built
