# AuthCallback.tsx

**Location:** `prsnl/FRONTEND/src/pages/AuthCallback.tsx`  
**Type:** OAuth Callback Page

## What This File Does

Handles the Google OAuth redirect after the user authenticates with Google. Reads the authorization code from URL parameters, exchanges it for a session via the backend, and navigates the user to the dashboard (or a stored redirect path). Shows error state with retry capability if something goes wrong.

## How It Fits Into The System

- **Triggers:** Browser redirects here after Google OAuth (`/auth/callback?code=...`)
- **Dependencies:** `api.ts` (completeOAuthLogin), `useAuthContext` (setAuthUser), React Router (useNavigate, useSearchParams)
- **Dependents:** None — this is a transient page, users pass through it

## Code Breakdown

### URL Cleanup (Security)

Immediately after reading the `code` parameter from the URL, the component cleans the URL by replacing the current history entry with just `/auth/callback` (no query params). This prevents:
- The auth code from lingering in browser history
- Accidental sharing of URLs containing valid auth codes
- Replay attacks if someone accesses browser history

### OAuth Code Exchange

1. Reads `code` from `useSearchParams()`
2. Calls `completeOAuthLogin(code)` — sends code + code_verifier to backend
3. Backend exchanges with Supabase, creates HttpOnly session cookie, returns user object
4. Calls `setAuthUser(user)` to update auth context without an extra `apiGetMe` round-trip
5. Navigates to `/dashboard` or a stored redirect path (from `sessionStorage`)

### StrictMode Double-Invoke Guard

Uses a `useRef` flag to prevent the OAuth exchange from running twice in React StrictMode (development). Without this:
- StrictMode mounts → runs effect → unmounts → remounts → runs effect again
- Second call would fail because the auth code is single-use
- The ref ensures the exchange only executes once

```typescript
const hasRun = useRef(false);
useEffect(() => {
  if (hasRun.current) return;
  hasRun.current = true;
  // ... exchange logic
}, []);
```

### Error State

If the exchange fails (expired code, network error, backend error):
- Shows an error message explaining what went wrong
- Displays a "Try Again" button that navigates back to `/` where the user can re-initiate login
- Does NOT automatically retry (auth codes are single-use)

### Loading State

While the exchange is in progress, shows a loading spinner/message. The user typically sees this for 1-2 seconds.

## Things To Know Before Editing

- Auth codes are single-use — if the exchange fails, the user must start the OAuth flow over
- The `useRef` guard is essential in development — removing it causes "code already used" errors
- The URL cleanup must happen synchronously before any async work — don't move it into a callback
- Stored redirect path (sessionStorage) allows deep-linking: user tries to access `/resume-analysis` → redirected to login → after OAuth → lands on `/resume-analysis` instead of dashboard
- If this page shows errors in production, common causes: (1) expired code (user waited too long), (2) code_verifier mismatch (localStorage cleared), (3) backend OAuth config mismatch
