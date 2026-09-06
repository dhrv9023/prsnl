# supabase.ts

**Location:** `prsnl/FRONTEND/src/lib/supabase.ts`  
**Type:** Client Configuration

## What This File Does

Creates and exports a Supabase client instance configured exclusively for OAuth PKCE flow. This client is NOT used for data access (all data goes through the custom backend API). It only handles the OAuth redirect dance with Google. Returns `null` if required environment variables are missing.

## How It Fits Into The System

- **Triggers:** Imported by `useAuth` hook when initiating Google OAuth login
- **Dependencies:** `@supabase/supabase-js`, environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **Dependents:** `useAuth.ts` (Google login flow), `AuthCallback.tsx` (code exchange)

## Code Breakdown

### Environment Variable Check

Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `import.meta.env`. If either is missing, the client is set to `null` and `isSupabaseOAuthConfigured` is exported as `false`. This allows the app to run without OAuth in development.

### Client Configuration

```typescript
createClient(url, anonKey, {
  auth: {
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: false,
  }
})
```

- **`flowType: "pkce"`** — Uses Proof Key for Code Exchange. The client generates a `code_verifier`, stores it in localStorage, and sends a `code_challenge` to Supabase. On callback, the verifier is used to exchange the code for tokens. More secure than implicit flow.
- **`persistSession: true`** — Required so the `code_verifier` survives the OAuth redirect (page navigation clears memory but not localStorage). The actual user session is NOT managed by Supabase — it's managed by the backend's HttpOnly cookies.
- **`autoRefreshToken: false`** — Supabase should not try to refresh tokens. The backend handles session refresh via its own `/auth/refresh` endpoint.

### Exports

- `supabase` — The client instance (or `null`)
- `isSupabaseOAuthConfigured` — Boolean flag for conditional UI rendering (hide Google button if not configured)

## Things To Know Before Editing

- This client is for OAuth flow ONLY — never use it for database queries, storage, or realtime
- `persistSession: true` is not about user sessions — it's about preserving the PKCE `code_verifier` across the redirect
- If you see Supabase localStorage keys lingering after logout, the `useAuth` hook clears them manually
- The anon key is safe to expose client-side (it's a public key with RLS restrictions)
- If OAuth stops working after a deploy, check that both env vars are set in the hosting platform
