# Chapter 5 — Frontend Architecture

## Overview

The frontend is a **React 18 + TypeScript** single-page application built with **Vite**. It runs on `http://localhost:8080` in development and proxies all `/api` requests to the backend. In production on Vercel, `VITE_API_BASE` env var points directly to the Render backend.

---

## Application Setup (`main.tsx` → `App.tsx`)

### Provider Stack (outermost to innermost)
```
QueryClientProvider (React Query)
  └── TooltipProvider (Shadcn)
        └── Toaster + Sonner (notifications)
              └── BrowserRouter (React Router)
                    └── AuthProvider (custom context)
                          └── CreditProvider (custom context)
                                └── Suspense (lazy page loading)
                                      └── Routes
```

### Route Map

| Path | Component | Access |
|---|---|---|
| `/` | `Index.tsx` | Public — Landing page |
| `/pricing` | `Pricing.tsx` | Public |
| `/dashboard` | `DashboardPage.tsx` | Protected (auth guard) |
| `/resume-analysis` | `ResumeAnalysis.tsx` | Protected |
| `/cover-letter` | `CoverLetter.tsx` | Protected |
| `/interview` | `AIInterview.tsx` | Protected |
| `/admin` | `AdminPage.tsx` | Protected + Admin only |
| `/credits` | `CreditsPage.tsx` | Protected |
| `/auth/callback` | `AuthCallback.tsx` | OAuth redirect handler |
| `*` | `NotFound.tsx` | 404 fallback |

All pages are **lazy-loaded** via `React.lazy()` + `Suspense` with a `PageLoader` spinner fallback.

---

## Authentication Context (`contexts/AuthContext.tsx` + `hooks/useAuth.ts`)

Provides `isAuthenticated`, `isLoading`, `isAdmin`, and `user` to the entire app. On mount it calls `GET /api/v1/auth/me` — if the HttpOnly cookie is valid, the user is authenticated. No token is stored in JS memory.

```typescript
const auth = useAuthContext();
// auth.isAuthenticated → boolean
// auth.user → { id, email }
// auth.isAdmin → boolean (fetched from /me after login)
// auth.isLoading → boolean (during initial /me check)
```

### `useAuth.ts` — Key Behaviors
- **On mount**: calls `apiGetMe()` to restore session from HttpOnly cookie
- **After login**: calls `apiGetMe()` again to get `is_admin` flag (sequential, no race condition)
- **After OAuth**: `setAuthUser()` is called from `AuthCallback`, which then calls `apiGetMe()` for `is_admin`
- **On logout**: clears all state, CreditContext resets to null

Protected pages redirect to `/` if `!auth.isAuthenticated` after the loading check completes.

---

## Credit Context (`contexts/CreditContext.tsx`)

Provides credit balance and feature gating to the entire app. Sits inside `AuthProvider` so it can react to auth state changes.

```typescript
const { balance, featureCosts, canUse, shortfall, refresh, deductLocal } = useCreditContext();
```

### Key Methods

| Method | Purpose |
|---|---|
| `canUse(feature)` | Returns `true` if user has enough credits (or is unlimited) |
| `shortfall(feature)` | Returns how many credits short (0 if affordable) |
| `deductLocal(feature)` | Optimistically subtracts credits locally for instant UI feedback |
| `refresh()` | Re-fetches balance from backend (called after feature use) |

### FeatureKey Type
```typescript
export type FeatureKey =
    | "ats_score"
    | "deep_analysis"
    | "hiring_intel"
    | "interview"
    | "cover_letter"
    | "humanize";
```

### Credit Flow on Feature Use
1. User clicks "Generate" → `canUse("cover_letter")` checked → button enabled/disabled
2. User clicks → `deductLocal("cover_letter")` called → balance updates instantly in UI
3. API call made → backend deducts atomically via PostgreSQL RPC
4. On success → `refresh()` called → balance synced from backend
5. On failure → `refresh()` still called → balance corrected

### Auto-fetch
Credits are fetched on login and whenever `auth.isAuthenticated` changes. On logout, `balance` is reset to `null`.

---

## API Client (`lib/api.ts`)

All backend communication goes through a centralized `request<T>()` function:

```typescript
const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const BASE = `${API_BASE}/api/v1`;
const INTERVIEW_BASE = `${API_BASE}/api/v1/interview`;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        credentials: "include",  // Always sends HttpOnly cookies
        headers: { "Content-Type": "application/json", ...options.headers },
    });
    // Error parsing → throws Error(detail) from JSON body
}
```

### Production vs Development
- **Development**: `VITE_API_BASE` is empty → `BASE = "/api/v1"` → Vite proxy handles routing
- **Production**: `VITE_API_BASE = "https://your-backend.onrender.com"` → direct calls to Render

### Exported API Functions

| Function | Endpoint | Credit Cost |
|---|---|---|
| `apiSignup()` | POST `/auth/signup` | Free |
| `apiLogin()` | POST `/auth/login` | Free |
| `apiLogout()` | POST `/auth/logout` | Free |
| `apiGetMe()` | GET `/auth/me` | Free |
| `apiExchangeOAuthSession()` | POST `/auth/oauth/session` | Free |
| `apiUploadResume()` | POST `/resumes/upload` | Free |
| `apiListResumes()` | GET `/resumes/` | Free |
| `apiGetAtsScore()` | POST `/analysis/match` | 5 credits |
| `apiGetDeepAnalysis()` | POST `/analysis/deep` | 15 credits |
| `apiGetHiringIntel()` | POST `/analysis/hiring-intel` | 25 credits |
| `apiGenerateCoverLetter()` | POST `/cover_letter/generate` | 10 credits |
| `apiGenerateRoastCoverLetter()` | POST `/cover_letter/generate-roast` | 10 credits |
| `apiHumanizeCoverLetter()` | POST `/cover_letter/humanize` | 15 credits |
| `apiSaveCoverLetterPdf()` | POST `/cover_letter/save_pdf` | Free |
| `apiGetDashboard()` | GET `/dashboard/summary` | Free |
| `apiStartInterview()` | POST `/interview/start` | 25 credits |
| `apiSubmitAnswer()` | POST `/interview/submit` | Free |
| `apiEndInterview()` | POST `/interview/end` | Free |
| `apiGetCreditBalance()` | GET `/credits/balance` | Free |
| `apiGetFeatureCosts()` | GET `/credits/costs` | Free |
| `apiValidateCredits()` | POST `/credits/validate` | Free |
| `apiGetCreditHistory()` | GET `/credits/history` | Free |
| `apiGetAdminStats()` | GET `/admin/stats` | Free (admin) |
| `apiGetAdminUsers()` | GET `/admin/users` | Free (admin) |
| `apiGrantCredits()` | POST `/admin/users/{id}/grant-credits` | Free (admin) |
| `apiSetUnlimited()` | POST `/admin/users/{id}/set-unlimited` | Free (admin) |

---

## Pages Overview

### Landing Page (`/`) — `Index.tsx`
Full marketing page composed of sections:
- `Hero.tsx` — headline + CTA
- `FeatureMarquee.tsx` — scrolling feature ticker
- `Features.tsx` — feature cards grid
- `ValueNarrative.tsx` — storytelling section
- `Dashboard.tsx` — animated dashboard preview
- `Pricing.tsx` (section component) — pricing tiers (static, no payment integration yet)
- `FinalCTA.tsx` — bottom call-to-action

### Dashboard (`/dashboard`) — `DashboardPage.tsx`
The authenticated user's home screen. Shows:
- Latest ATS score, deep analysis grade, resume count, analysis count
- Analysis history (last 20 analyses, expandable)
- Latest hiring intel summary
- Auth guard: redirects to `/` if not logged in

### Resume Analysis (`/resume-analysis`) — `ResumeAnalysis.tsx`
Multi-step flow:
1. Upload PDF → shows extraction success + character count
2. (Optional) Enter job description
3. Run ATS Match Score (5 credits)
4. Run Deep Analysis (15 credits)
5. Run Hiring Intelligence (25 credits)
6. Results shown inline with `DeepAnalysisPanel` and `HiringIntelPanel` components

### Cover Letter (`/cover-letter`) — `CoverLetter.tsx`
Two-panel layout:
1. Left: Select resume + enter JD, company name, job title → Generate (10 credits)
2. Right: Editable text area with generated letter
- Humanize button → rewrites the text in place (15 credits)
- Download as text button
- Save PDF button → calls save_pdf endpoint (free)

**Credit fix applied**: Humanize button correctly checks `canUse("humanize")` and calls `deductLocal("humanize")` — not `"cover_letter"`.

### AI Interview (`/interview`) — `AIInterview.tsx`
Step-by-step interview UI:
1. Setup: select resume, enter role, experience level
2. Question display (one at a time): theory text area, MCQ radio buttons, code editor
3. Submit → shows evaluation card (score + feedback + ideal answer)
4. Next question → continues
5. End → shows full report with overall score + qualitative grade + breakdown table

### Credits (`/credits`) — `CreditsPage.tsx`
- Balance card with progress bar and low-credit warning
- Feature cost reference grid
- Transaction history tab (last 50 transactions with icons, timestamps, delta)
- Buy Credits tab (plans shown, all disabled with "Coming Soon" — payment not yet integrated)

### Admin (`/admin`) — `AdminPage.tsx`
Protected by `auth.isAdmin` (frontend) + `_require_admin()` (backend). Shows:
- Platform stats: total users, resumes, analyses, cover letters, interviews
- Credit system overview: total granted, used, per-feature breakdown
- Analysis type breakdown with progress bars
- Recent activity feed
- User management: list all users, grant credits, toggle unlimited status

### Auth Callback (`/auth/callback`) — `AuthCallback.tsx`
Handles the Google OAuth redirect:
1. Reads `code` from URL query params
2. Checks for OAuth error params — shows error UI if present
3. Reads `code_verifier` from localStorage
4. POSTs to `/api/v1/auth/oauth/session` with exponential backoff retry (4 attempts)
5. Clears localStorage
6. Calls `setAuthUser()` → redirects to `/dashboard`

### Not Found (`*`) — `NotFound.tsx`
Clean 404 page with the attempted path shown and a "Back to Home" `<Link>` button. No `console.error` in production.

---

## Component Architecture

```
components/
├── layout/
│   ├── Navbar.tsx     — Top nav with auth state, credit badge, mobile menu, login/logout
│   └── Footer.tsx     — Links and copyright
│
├── ui/
│   ├── AuthModal.tsx  — Login/signup modal with Google OAuth button
│   ├── CreditBadge.tsx — Compact credit balance in navbar (shows remaining/total)
│   ├── CreditDisplay.tsx — FeatureCostTag + InsufficientCreditsWarning components
│   └── HinglishToggle.tsx — Toggle button for Hinglish translation
│
├── analysis/
│   ├── DeepAnalysisPanel.tsx — Renders deep analysis section breakdown
│   └── HiringIntelPanel.tsx  — Renders full 9-section hiring intel report
│
└── sections/          — Landing page sections (pure presentational)
    ├── Hero.tsx
    ├── Features.tsx
    ├── FeatureMarquee.tsx
    ├── ValueNarrative.tsx
    ├── Dashboard.tsx
    ├── Pricing.tsx
    └── FinalCTA.tsx
```

### CreditBadge
Shows in the Navbar when authenticated. Displays `{remaining} cr` with color coding:
- Green: > 20 credits
- Amber: ≤ 20 credits (low credit warning)
- Violet: Unlimited (admin)

Clicking it navigates to `/credits`.

### CreditDisplay
Two sub-components used on feature pages:
- `FeatureCostTag` — small badge showing credit cost (e.g., "5 cr")
- `InsufficientCreditsWarning` — shown when `!canUse(feature)`, links to `/credits`

---

## Frontend `.env` Variables

```bash
# FRONTEND/.env (committed — only public keys)
VITE_SUPABASE_URL="https://xxxxx.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJ..."  # Public anon key — safe to expose

# FRONTEND/.env.local (gitignored — local overrides)
VITE_WSL_IP=172.xx.xx.xx         # Auto-set by run.sh for WSL2 proxy
# VITE_API_BASE=https://your-backend.onrender.com  # Set this in Vercel for production
```

---

## Key Frontend Patterns

1. **No global state library** — Auth state in `AuthContext`, credit state in `CreditContext`, server state via React Query, local UI state via `useState`
2. **Optimistic credit deduction** — `deductLocal()` updates the balance instantly; `refresh()` syncs from backend after the API call
3. **Skeleton loaders** — Every async operation shows shimmer animations
4. **Error surfacing** — All API errors caught and shown inline (not just console.log)
5. **Dark mode** — Tailwind dark mode via `class` strategy, theme initialized via `public/theme-init.js` before React hydrates (prevents flash of wrong theme)
6. **Lazy loading** — All pages are `React.lazy()` loaded with a `PageLoader` spinner fallback
