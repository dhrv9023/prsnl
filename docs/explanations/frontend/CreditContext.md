# CreditContext.tsx

**Location:** `prsnl/FRONTEND/src/contexts/CreditContext.tsx`  
**Type:** React Context Provider

## What This File Does

Manages global credit state for the application: current balance, feature costs, and utility functions for checking affordability and optimistically deducting credits. Fetches credit data from the backend when the user logs in and provides reactive state that updates across all consuming components.

## How It Fits Into The System

- **Triggers:** Mounted inside `AuthProvider` in `App.tsx`; fetches data when user becomes authenticated
- **Dependencies:** `apiGetBalance`, `apiGetFeatureCosts` from `api.ts`, `useAuthContext` for user state
- **Dependents:** Every feature page (ResumeAnalysis, AIInterview, CoverLetter), CreditBadge, CreditDisplay, CreditsPage

## Code Breakdown

### State

- `balance` — current credit count (number)
- `totalCredits` — max credits for the plan (for progress bar display)
- `featureCosts` — map of feature name → credit cost (e.g., `{ ats_score: 1, deep_analysis: 3 }`)
- `loading` — whether initial fetch is in progress
- `error` — fetch error message if any

### canUse(feature) Function

Returns `true` if the user has enough credits for the given feature. **Important:** also returns `true` while `loading` is `true` — this prevents a flash of "insufficient credits" warnings before the balance has loaded.

### shortfall(feature) Function

Returns how many additional credits the user needs for a feature. Returns `0` if they can afford it. Used by `InsufficientCreditsWarning` to show "You need X more credits."

### refresh() Function

Re-fetches balance and costs from the backend. Called after purchases, admin grants, or when returning to a page that may have stale data.

### deductLocal(feature) Function

Optimistically subtracts the feature's cost from the local balance state without waiting for the backend. Provides instant UI feedback when a user triggers a paid action. The actual deduction happens server-side — if it fails, the next `refresh()` corrects the local state.

### Data Fetching

Uses `useEffect` watching the user state:
- When user becomes non-null (logged in), fetches balance and feature costs in parallel
- When user becomes null (logged out), resets all state to defaults
- Handles errors gracefully (sets error state, doesn't crash)

## Things To Know Before Editing

- `canUse` returning `true` during loading is intentional — removing this causes UI flicker on every page load
- `deductLocal` is optimistic — it doesn't guarantee the backend accepted the deduction. Always pair with actual API calls that deduct server-side
- The context must be inside `AuthProvider` because it reads user state from `useAuthContext`
- If you add a new paid feature, add its cost key to the backend's feature costs table — the frontend reads costs dynamically
- `refresh()` is debounce-safe to call multiple times — it just re-fetches
