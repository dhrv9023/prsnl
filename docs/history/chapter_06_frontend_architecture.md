# Chapter 06 — Frontend Architecture

## Directory Structure

```
FRONTEND/src/
├── App.tsx                    ← routing, provider tree
├── main.tsx                   ← React entry point
├── index.css                  ← global styles, Tailwind base
├── pages/
│   ├── Index.tsx              ← landing page (assembles sections)
│   ├── DashboardPage.tsx      ← main app dashboard
│   ├── ResumeAnalysis.tsx     ← ATS + Deep Analysis + Hiring Intel
│   ├── AIInterview.tsx        ← mock interview UI
│   ├── CoverLetter.tsx        ← cover letter generator
│   ├── CreditsPage.tsx        ← credit balance + history
│   ├── AdminPage.tsx          ← admin dashboard
│   ├── InterviewHistory.tsx   ← past interview reports
│   ├── AuthCallback.tsx       ← OAuth PKCE callback handler
│   ├── Pricing.tsx            ← pricing page (coming soon)
│   └── NotFound.tsx           ← 404
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx         ← navigation, auth state, feature dropdown
│   │   └── Footer.tsx
│   ├── sections/              ← landing page sections
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── FeatureMarquee.tsx
│   │   ├── ValueNarrative.tsx
│   │   ├── Dashboard.tsx      ← dashboard preview section
│   │   ├── Pricing.tsx        ← pricing section
│   │   └── FinalCTA.tsx
│   ├── analysis/
│   │   ├── DeepAnalysisPanel.tsx
│   │   └── HiringIntelPanel.tsx
│   └── ui/
│       ├── AuthModal.tsx      ← login/signup modal
│       ├── CreditBadge.tsx    ← credit balance in navbar
│       ├── CreditDisplay.tsx  ← feature cost display
│       ├── HinglishToggle.tsx ← language toggle
│       └── ... (shadcn components)
├── contexts/
│   ├── AuthContext.tsx        ← wraps useAuth, provides cold-start banner
│   ├── CreditContext.tsx      ← credit balance, canUse, deductLocal
│   └── RoastModeContext.tsx   ← roast mode toggle state
├── hooks/
│   ├── useAuth.ts             ← auth state machine
│   └── use-mobile.tsx         ← responsive breakpoint hook
└── lib/
    ├── api.ts                 ← all API calls, CSRF token injection
    ├── errors.ts              ← friendly error message mapping
    ├── supabase.ts            ← Supabase client (PKCE only)
    └── utils.ts               ← cn() and other utilities
```

---

## App.tsx — Provider Tree & Routing

```tsx
<QueryClientProvider>
  <TooltipProvider>
    <BrowserRouter>
      <AuthProvider>
        <CreditProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              ...
            </Routes>
          </Suspense>
        </CreditProvider>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
</QueryClientProvider>
```

All pages are lazy-loaded via `lazyWithRetry()` — a custom wrapper that handles stale chunk errors after Vercel redeploys. If a chunk fails to load (because a new deploy invalidated the old hash), it reloads the page once. If the reload doesn't fix it, it shows a user-friendly error with a "Return to Home" button.

---

## useAuth.ts — Auth State Machine

The core auth hook. Manages `{ user, isAdmin, isLoading, isSubmitting, error }`.

### On mount

1. Clears any stale Supabase session from localStorage (we use cookies, not localStorage)
2. Calls `GET /api/v1/auth/me` to check if a valid session cookie exists
3. If successful, sets user state and shows daily credit toast if credits were just granted
4. If failed (401), sets user to null

### Methods

- `login(email, password)` — calls `/auth/login`, then `/auth/me`
- `signup(email, password, name)` — calls `/auth/signup`, then auto-logs in
- `loginWithGoogle()` — triggers Supabase PKCE OAuth redirect
- `completeOAuthLogin(code)` — called by AuthCallback, exchanges code for session
- `logout()` — calls `/auth/logout`, clears local state

### Cold Start Banner

`AuthContext.tsx` wraps `useAuth` and adds a cold-start banner. If `isLoading` is still true after 4 seconds, it shows a banner: "Waking up the server… First load takes ~20s on free tier." This manages user expectations on Render's free tier.

---

## CreditContext.tsx — Credit State

See Chapter 05 for full details. Key points:

- `isLoading` starts as `true` (not `false`) — prevents false "insufficient credits" flash
- `canUse(feature)` returns `true` while loading or balance is null
- `deductLocal(feature)` does optimistic subtraction
- `refresh()` re-fetches from server

---

## lib/api.ts — API Client

All API calls go through a single `request<T>()` function:

```typescript
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    
    // Attach CSRF token on state-changing requests
    const csrfHeaders: Record<string, string> = {};
    if (!SAFE_METHODS.has(method)) {
        const token = getCsrfToken();  // reads __krs_xsrf cookie
        if (token) csrfHeaders["X-CSRF-Token"] = token;
    }
    
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        credentials: "include",  // always send cookies
        headers: {
            "Content-Type": "application/json",
            ...DEV_BYPASS_HEADERS,  // X-Dev-Bypass: 1 in dev only
            ...csrfHeaders,
            ...options.headers,
        },
    });
    ...
}
```

`credentials: "include"` is what makes the browser send the HttpOnly cookies on every request.

In development (`import.meta.env.DEV = true`), `X-Dev-Bypass: 1` is added to every request. This header is never present in production builds.

---

## Auth Guards on Protected Pages

There's no `ProtectedRoute` wrapper component. Each protected page handles its own auth guard via `useEffect`:

```typescript
// In DashboardPage.tsx, AIInterview.tsx, etc.
useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
        navigate("/", { replace: true });
    }
}, [auth.isLoading, auth.isAuthenticated, navigate]);
```

The `!auth.isLoading` check is important — without it, the redirect fires before the initial auth check completes, causing a flash.

---

## "Enter Kareerist" Button — Auth-Aware CTA

Both `Hero.tsx` and `FinalCTA.tsx` have an "Enter Kareerist" button. Previously this was a `<Link to="/dashboard">` which caused a redirect loop for unauthenticated users (Dashboard redirects back to `/`).

Now it's a button with an `onClick` handler:

```typescript
const handleEnterKareerist = () => {
    if (auth.isAuthenticated) {
        navigate("/dashboard");
    } else {
        sessionStorage.setItem("redirectAfterLogin", "/dashboard");
        setShowAuthModal(true);
    }
};
```

After successful login, the `AuthModal.onSuccess` callback reads `redirectAfterLogin` from sessionStorage and navigates there.

---

## Navbar — Feature Navigation

The Navbar has a features dropdown. Clicking a feature:
1. If not authenticated → stores the feature's href in `sessionStorage.redirectAfterLogin`, opens `AuthModal`
2. If authenticated → navigates directly

After login via the modal, the Navbar's `onSuccess` callback reads `redirectAfterLogin` and navigates there.

---

## Routing Summary

| Path | Page | Auth Required |
|------|------|---------------|
| `/` | Index (landing) | No |
| `/dashboard` | DashboardPage | Yes → redirects to `/` |
| `/resume-analysis` | ResumeAnalysis | Yes → redirects to `/` |
| `/interview` | AIInterview | Yes → redirects to `/` |
| `/cover-letter` | CoverLetter | Yes → redirects to `/` |
| `/credits` | CreditsPage | Yes → redirects to `/` |
| `/admin` | AdminPage | Yes + isAdmin |
| `/interview/history` | InterviewHistory | Yes → redirects to `/` |
| `/auth/callback` | AuthCallback | No (OAuth callback) |
| `/pricing` | Pricing | No |
