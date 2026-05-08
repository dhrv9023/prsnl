# Chapter 5 — Frontend Architecture

## Overview

The frontend is a **React 18 + TypeScript** single-page application built with **Vite**. It runs on `http://localhost:8080` in development and proxies all `/api` requests to the backend.

---

## Application Setup (`main.tsx` → `App.tsx`)

### Provider Stack (outermost to innermost)
```
QueryClientProvider (React Query)
  └── TooltipProvider (Shadcn)
        └── Toaster + Sonner (notifications)
              └── BrowserRouter (React Router)
                    └── AuthProvider (custom context)
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
| `/auth/callback` | `AuthCallback.tsx` | OAuth redirect handler |
| `*` | `NotFound.tsx` | 404 fallback |

---

## Authentication Context (`contexts/AuthContext.tsx`)

Provides `isAuthenticated`, `isLoading`, and `user` to the entire app. On mount it calls `GET /api/v1/auth/me` — if the HttpOnly cookie is valid, the user is authenticated. No token is stored in JS memory.

```typescript
const auth = useAuthContext();
// auth.isAuthenticated → boolean
// auth.user → { id, email, is_admin }
// auth.isLoading → boolean (during initial /me check)
```

Protected pages redirect to `/` if `!auth.isAuthenticated` after the loading check completes.

---

## API Client (`lib/api.ts`)

All backend communication goes through a centralized `request<T>()` function:

```typescript
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`/api/v1${path}`, {
        ...options,
        credentials: "include",  // Always sends HttpOnly cookies
        headers: { "Content-Type": "application/json", ...options.headers },
    });
    // Error parsing → throws Error(detail) from JSON body
}
```

### Key: `credentials: "include"`
This single line ensures the browser automatically attaches the HttpOnly `access_token` cookie to every request. The user never has to manage tokens.

### File Upload Exception
The resume upload uses a raw `fetch()` call (not the `request()` wrapper) because `FormData` must not have a manually-set `Content-Type` header — the browser sets it automatically with the correct multipart boundary.

### Exported API Functions

| Function | Endpoint | Purpose |
|---|---|---|
| `apiSignup()` | POST `/auth/signup` | Register |
| `apiLogin()` | POST `/auth/login` | Login |
| `apiLogout()` | POST `/auth/logout` | Logout |
| `apiGetMe()` | GET `/auth/me` | Session check |
| `apiExchangeOAuthSession()` | POST `/auth/oauth/session` | PKCE exchange |
| `apiUploadResume()` | POST `/resumes/upload` | Upload PDF |
| `apiListResumes()` | GET `/resumes/` | List user resumes |
| `apiGetAtsScore()` | POST `/analysis/match` | ATS match score |
| `apiGetRoast()` | POST `/analysis/roast` | Deep Roast |
| `apiTranslateAnalysis()` | POST `/analysis/translate` | Hinglish toggle |
| `apiGenerateCoverLetter()` | POST `/cover_letter/generate` | Generate letter |
| `apiHumanizeCoverLetter()` | POST `/cover_letter/humanize` | Humanize text |
| `apiSaveCoverLetterPdf()` | POST `/cover_letter/save_pdf` | Export PDF |
| `apiGetDashboard()` | GET `/dashboard/summary` | Dashboard data |
| `apiStartInterview()` | POST `/interview/start` | Begin interview |
| `apiSubmitAnswer()` | POST `/interview/submit` | Submit answer |
| `apiEndInterview()` | POST `/interview/end` | Get report |

---

## Vite Configuration (`vite.config.ts`)

```typescript
const backendTarget = env.VITE_WSL_IP
    ? `http://${env.VITE_WSL_IP}:8000`
    : "http://127.0.0.1:8000";

proxy: {
    "/api": { target: backendTarget }
    // changeOrigin is intentionally NOT set
    // Setting it would rewrite Origin header → breaks CORS origin checks
}
```

### WSL2 Networking Fix
`run.sh` detects the WSL internal IP (`hostname -I`) and writes it to `FRONTEND/.env.local` as `VITE_WSL_IP`. Vite picks this up via `loadEnv()`. This was necessary because `localhost` in Windows Node.js doesn't always resolve to the WSL2 network interface.

---

## Pages Overview

### Landing Page (`/`) — `Index.tsx`
Renders the full marketing page composed of sections:
- `Hero.tsx` — headline + CTA
- `FeatureMarquee.tsx` — scrolling feature ticker
- `Features.tsx` — feature cards grid
- `ValueNarrative.tsx` — storytelling section
- `Dashboard.tsx` — animated dashboard preview
- `Pricing.tsx` (section component) — pricing tiers
- `FinalCTA.tsx` — bottom call-to-action

### Dashboard (`/dashboard`) — `DashboardPage.tsx`
The authenticated user's home screen. Sections:
- **System Insight Panel** — shows latest roast summary + #1 action item. Has Hinglish toggle button.
- **Metrics Grid** — 4 cards: ATS Score, Overall Grade, Resume Count, Analysis Count
- **Analysis History** — last 10 analyses, each expandable to show full section breakdown inline. Each history item has its own Hinglish toggle.
- **Improvement Tracker** — shows all section grades + top 5 action items from latest roast

Features:
- Skeleton loading states (shimmer animations)
- `timeAgo()` helper for human-readable timestamps
- Auth guard: redirects to `/` if not logged in
- Language auto-detection: scans summary text for Hinglish words

### Resume Analysis (`/resume-analysis`) — `ResumeAnalysis.tsx`
Multi-step flow:
1. Upload PDF → shows extraction success + character count
2. (Optional) Enter job description
3. Run ATS Match Score
4. Run Deep Roast
5. Toggle Hinglish on results

### Cover Letter (`/cover-letter`) — `CoverLetter.tsx`
Two-panel layout:
1. Left: Select resume + enter JD, company name, job title → Generate
2. Right: Editable text area with generated letter
- Humanize button → rewrites the text in place
- Download as PDF button → calls save_pdf endpoint

### AI Interview (`/interview`) — `AIInterview.tsx`
Step-by-step interview UI:
1. Setup: select resume, enter role, experience level
2. Question display (one at a time): theory text area, MCQ radio buttons, code Monaco editor
3. Submit → shows evaluation card (score + feedback + ideal answer)
4. Next question → continues
5. End → shows full report with overall score + breakdown table

### Auth Callback (`/auth/callback`) — `AuthCallback.tsx`
Handles the Google OAuth redirect:
1. Reads `code` from URL query params
2. Reads `code_verifier` from localStorage (set by Supabase JS before redirecting)
3. POSTs to `/api/v1/auth/oauth/session`
4. Clears localStorage
5. Redirects to `/dashboard`

### Admin Page (`/admin`) — `AdminPage.tsx`
Protected by `is_admin` check from `/me`. Shows platform-level stats and user management UI.

---

## Component Architecture

```
components/
├── layout/
│   ├── Navbar.tsx     — Top nav with auth state, mobile menu, login/logout
│   └── Footer.tsx     — Links and copyright
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

---

## Frontend `.env` Variables

```bash
VITE_SUPABASE_URL="https://xxxxx.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJ..."  # Public anon key — safe to expose
```

The Anon Key is used only by `@supabase/supabase-js` on the frontend to initiate the PKCE OAuth flow. It cannot perform admin operations.

---

## Key Frontend Patterns

1. **No global state library** — Auth state in Context, server state via React Query, local UI state via `useState`
2. **Optimistic UX** — Skeleton loaders on every async operation, spinners on buttons during requests
3. **Error surfacing** — All API errors caught and shown inline (not just console.log)
4. **Dark mode** — Tailwind dark mode via `class` strategy, theme initialized via `public/theme-init.js` before React hydrates (prevents flash of wrong theme)
