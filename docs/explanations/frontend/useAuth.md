# useAuth.ts

**Location:** `prsnl/FRONTEND/src/hooks/useAuth.ts`  
**Type:** React Hook

## What This File Does

Core authentication hook that manages the entire user authentication lifecycle: checking existing sessions on mount, email/password login and signup, Google OAuth via PKCE flow, token refresh, logout, and error state. This is the single source of truth for "is the user logged in and who are they?"

## How It Fits Into The System

- **Triggers:** Called once by `AuthProvider` — all other components access auth via context
- **Dependencies:** `api.ts` (apiGetMe, apiLogin, apiSignup, apiLogout, apiRefreshToken, completeOAuthLogin), `supabase.ts` (OAuth initiation)
- **Dependents:** `AuthContext.tsx` (wraps this hook), indirectly every authenticated component

## Code Breakdown

### State

- `user` — current user object or `null`
- `loading` — `true` during initial session check and during login/signup
- `error` — error message string or `null`

### Mount Behavior (useEffect)

On initial mount:
1. **Clears stale Supabase localStorage** — removes `sb-*` keys that Supabase persists for PKCE. These can cause confusion if they linger after logout.
2. **Calls `apiGetMe()`** — checks if the browser has a valid HttpOnly session cookie. If yes, sets user state. If 401, user stays null (not logged in).
3. Sets `loading: false` when done.

### login(email, password)

Calls `apiLogin`, sets user on success, sets error on failure. Returns the user or throws.

### signup(email, password)

Calls `apiSignup`, sets user on success. Some backends auto-login on signup, others require email verification — this handles both.

### loginWithGoogle()

1. Checks `isSupabaseOAuthConfigured` — if not, shows error
2. Calls `supabase.auth.signInWithOAuth({ provider: 'google' })` with PKCE
3. Supabase redirects to Google → Google redirects back to `/auth/callback`
4. The `code_verifier` is stored in localStorage by Supabase client automatically

### OAuth Code Exchange (handled by AuthCallback)

The `completeOAuthLogin(code)` function:
1. Retrieves `code_verifier` from localStorage (stored during `loginWithGoogle`)
2. Sends both to the backend's OAuth completion endpoint
3. Backend exchanges code + verifier with Supabase, creates session cookie
4. Returns user object

### setAuthUser(user)

Allows `AuthCallback` to set the user directly after OAuth completion without re-calling `apiGetMe`. Avoids an unnecessary round-trip.

### refreshToken()

Calls `apiRefreshToken` to extend the session. Used by interceptors or periodic refresh logic.

### logout()

1. Calls `apiLogout` (clears HttpOnly cookie server-side)
2. Clears Supabase localStorage keys
3. Sets user to `null`

### clearError()

Resets error state to `null`. Called by UI when user dismisses error or starts a new action.

## Things To Know Before Editing

- Session state lives in HttpOnly cookies — you cannot read or set them from JavaScript. The backend manages them.
- The Supabase client is ONLY for initiating OAuth — it does not manage sessions
- Clearing `sb-*` localStorage on mount prevents ghost sessions where Supabase thinks you're logged in but the backend doesn't
- `loading: true` on mount is critical — without it, protected routes would flash "not authenticated" before the session check completes
- The `useRef` guard in some flows prevents React StrictMode double-invocation from causing duplicate API calls
- If Google OAuth breaks, check: (1) Supabase env vars, (2) Google OAuth redirect URIs, (3) code_verifier in localStorage
