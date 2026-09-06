# api.ts

**Location:** `prsnl/FRONTEND/src/lib/api.ts`  
**Type:** API Client Library

## What This File Does

Centralized fetch wrapper for all backend communication with automatic JWT token management. Every API call in the app goes through this file. It handles base URL resolution, JWT Authorization headers (stored in localStorage), CSRF token management (for cross-origin cookie setup), automatic token refresh on 401 responses, JSON parsing, error extraction, and exports typed functions for every backend endpoint. Supports both HttpOnly cookie auth (production) and dev bypass mode (local development).

## How It Fits Into The System

- **Triggers:** Called by pages, hooks, and context providers whenever they need backend data
- **Dependencies:** Browser `fetch` API, environment variables (`VITE_API_BASE`), localStorage (for JWT tokens), sessionStorage (for CSRF token), document.cookie (for CSRF fallback)
- **Dependents:** Every page component, `useAuth` hook, `CreditContext`, `AuthContext`, admin features

## Code Breakdown

### Base URL Configuration

**Updated May 23, 2026: Unified interview API**

Single base URL `API_BASE` for all backend endpoints including interview:
- Reads from `VITE_API_BASE` environment variable
- Empty in development (Vite proxy forwards `/api` → `http://localhost:8000`)
- Set to production backend URL in prod builds
- All endpoints prefixed with `/api/v1` (including interview)

### Dev Bypass Mode

**Added May 23, 2026**

In development (`import.meta.env.DEV === true`):
- Adds `X-Dev-Bypass: 1` header to all requests
- Backend skips Supabase auth and uses `DEV_BYPASS_USER_ID` from `.env`
- Never sent in production (when `VITE_API_BASE` is set)
- Speeds up local development by removing auth flow dependency

### CSRF Token Management

**Added May 23, 2026**

For cross-origin production setups where cookies with `SameSite=None` cannot be read by JS:
- Backend returns `csrf_token` in login/OAuth response body
- Stored in memory (`csrfTokenCache`) and sessionStorage (`__krs_csrf`)
- Attached as `X-CSRF-Token` header on all state-changing requests (POST/PUT/DELETE/PATCH)
- Falls back to reading `__krs_xsrf` cookie in same-origin dev setups
- Cleared on logout

### JWT Token Storage

**Added May 27, 2026**

Backend returns tokens in response body for cross-origin compatibility:
- `access_token` stored in localStorage (`__krs_access_token`)
- `refresh_token` stored in localStorage (`__krs_refresh_token`)
- Attached as `Authorization: Bearer {token}` header on all authenticated requests
- HttpOnly cookies still sent via `credentials: "include"` for backward compatibility
- Tokens cleared on logout

### Automatic Token Refresh

**Added May 27, 2026**

When a request returns 401 Unauthorized (except login/refresh endpoints):
1. Reads `refresh_token` from localStorage
2. Calls `POST /auth/refresh` with refresh token in body
3. If successful, updates stored access & refresh tokens
4. Retries the original request with new access token
5. If refresh fails, clears all tokens (user logged out)

This prevents users from being logged out mid-session when access token expires.

### Core Fetch Wrapper

A private `request<T>(path, options)` function that:
1. Prepends `${API_BASE}/api/v1` to the path
2. Determines if request is state-changing (POST/PUT/DELETE/PATCH) vs safe (GET/HEAD/OPTIONS)
3. For state-changing requests: attaches CSRF token via `X-CSRF-Token` header (if available)
4. For all authenticated requests: attaches JWT access token via `Authorization: Bearer {token}` header
5. Sets `credentials: "include"` (sends HttpOnly cookies automatically for backward compat)
6. Sets `Content-Type: application/json` for request bodies (except FormData uploads)
7. Adds dev bypass header if in development mode
8. Calls `fetch()`
9. If response is 401 and not on login/refresh endpoint: attempts automatic token refresh and retries
10. Checks `response.ok` — if not, extracts error message from JSON body or status text
11. Parses and returns typed JSON response

**Interview endpoints** use a separate `interviewRequest<T>()` wrapper that:
- Uses `${API_BASE}/api/v1/interview` as base path
- Otherwise identical logic to `request()`
- Needed because interview router mounted differently in backend

### TypeScript Interfaces

Defines response types for all API shapes:
- `User`, `AuthResponse`, `MeResponse`
- `Resume`, `ResumeListResponse`
- `ATSScoreResponse`, `DeepAnalysisResponse`, `HiringIntelResponse`
- `CoverLetterResponse`
- `DashboardSummary`
- `InterviewSession`, `InterviewQuestion`, `InterviewEvaluation`, `InterviewReport`
- `AdminStats`, `AdminUser`
- `CreditBalance`, `FeatureCosts`, `CreditTransaction`

### Exported Endpoint Functions

Grouped by domain:

**Auth:** `apiLogin`, `apiSignup`, `apiGetMe`, `apiLogout`, `apiExchangeOAuthSession`

**Resumes:** `apiUploadResume`, `apiListResumes`

**Analysis:** `apiGetAtsScore`, `apiGetDeepAnalysis`, `apiGetHiringIntel`

**Cover Letter:** `apiGenerateCoverLetter`, `apiGenerateRoastCoverLetter`, `apiHumanizeCoverLetter`, `apiSaveCoverLetterPdf`

**Dashboard:** `apiGetDashboard`

**Interview:** `apiStartInterview`, `apiSubmitAnswer`, `apiSubmitVoiceAnswer`, `apiEndInterview`, `apiGetInterviewHistory`, `apiGetActiveInterviewSession`, `apiAbandonInterview`

**Admin:** `apiGetAdminStats`, `apiGetAdminUsers`, `apiGrantCredits`, `apiSetUnlimited`, `apiGetUserCreditHistory`, `apiGetUserActivity`

**Credits:** `apiGetCreditBalance`, `apiGetFeatureCosts`, `apiValidateCredits`, `apiGetCreditHistory`, `apiClaimDailyCredits`

### Interview Endpoint Separation

Interview functions use a separate `interviewRequest()` wrapper instead of the generic `request()`. This exists because the interview service router is mounted at `/api/v1/interview` path on the backend. The logic is identical to `request()` but with the interview-specific base path.

## Things To Know Before Editing

- **JWT tokens are primary auth method** — stored in localStorage, sent as Authorization headers. HttpOnly cookies still sent via `credentials: "include"` for backward compatibility.
- **CSRF tokens are for cross-origin cookie protection** — in production with `SameSite=None` cookies, the CSRF token proves the request came from the legitimate frontend.
- **Auto-refresh prevents logout mid-session** — when access token expires (typically 15-60min), the refresh token (typically 7-30 days) gets a new access token automatically.
- **Dev bypass header is dev-only** — it's never sent in production. Backend checks `X-Dev-Bypass` and uses a hardcoded user ID instead of validating tokens.
- If you add a new endpoint, define its TypeScript response interface AND export a typed function that calls `request()` or `interviewRequest()`
- **Error extraction tries JSON first** — backend should always return `{ detail: "message" }` on failure. If JSON parse fails, falls back to `statusText`.
- **Interview endpoints use separate wrapper** — don't accidentally use `request()` for interview endpoints; use `interviewRequest()`.
- **FormData requests (file uploads) must NOT set Content-Type** — the browser sets the multipart boundary automatically. Override headers to omit Content-Type.
- **Type assertions (`as T`) trust the backend** — the backend is assumed to match these TypeScript shapes. Runtime validation is not performed.
- **Token storage uses try-catch** — localStorage/sessionStorage can throw if disabled/full. Failures are silently ignored to avoid breaking the app.
- **CSRF token has 3-tier fallback:** memory cache → sessionStorage → document.cookie. This handles page refreshes and cross-origin setups.
- **Automatic retry only happens once** — if the refreshed request also returns 401, the user is logged out (both tokens invalid).
- **login/OAuth endpoints store tokens** — they extract `csrf_token`, `access_token`, `refresh_token` from response body and store them. Other endpoints just use stored values.
