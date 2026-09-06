# AuthContext.tsx

**Location:** `prsnl/FRONTEND/src/contexts/AuthContext.tsx`  
**Type:** React Context Provider

## What This File Does

Wraps the `useAuth` hook in a React context so authentication state (user, loading, login, logout, etc.) is accessible anywhere in the component tree without prop drilling. Also renders a `ColdStartBanner` after 4 seconds of loading to warn users about Render free-tier cold starts.

## How It Fits Into The System

- **Triggers:** Mounted in `App.tsx` as part of the provider stack
- **Dependencies:** `useAuth` hook, React Context API
- **Dependents:** Every component that calls `useAuthContext()` — pages, Navbar, CreditContext, protected routes

## Code Breakdown

### AuthProvider Component

1. Calls `useAuth()` to get the full auth state and methods
2. Passes everything into a React context value
3. Renders a `ColdStartBanner` conditionally (see below)
4. Renders `children` (the rest of the app)

### ColdStartBanner

A dismissible banner that appears after 4 seconds of the auth `loading` state being `true`. This handles the UX problem where the backend (hosted on Render free tier) takes 30-60 seconds to wake up on first request.

- Uses `setTimeout` to show after 4s delay
- Displays a message like "Server is waking up, this may take a moment..."
- Disappears automatically once loading completes
- Can be manually dismissed

### useAuthContext Hook

A convenience hook that:
1. Calls `useContext(AuthContext)`
2. Throws an error if used outside `AuthProvider` (developer guard)
3. Returns the full auth state object

## Things To Know Before Editing

- The context value is the entire return value of `useAuth()` — if you add fields to `useAuth`, they're automatically available via context
- The 4-second delay for ColdStartBanner is a UX choice — too short shows it unnecessarily on fast connections, too long defeats the purpose
- If you migrate off Render free tier, the ColdStartBanner can be removed entirely
- `useAuthContext` vs `useAuth`: components should use `useAuthContext` (reads from context), only `AuthProvider` should call `useAuth` directly (creates the state)
