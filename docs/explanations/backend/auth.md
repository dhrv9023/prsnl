# auth.md

**Location:** `prsnl/backend/app/api/v1/endpoints/auth.py`  
**Type:** API Endpoint

## What This File Does

Handles all authentication flows for the application including email/password signup, login, OAuth PKCE code exchange, token refresh, logout, and the `/me` profile endpoint. It uses HttpOnly cookies exclusively for token storage — no tokens are stored in localStorage (though they are returned in response bodies alongside CSRF tokens for backward compatibility). Password validation enforces security requirements (uppercase, lowercase, digit, minimum 8 characters), and new signups receive IP-based initial credit grants. Login and OAuth success update the `last_sign_in_at` timestamp in profiles for activity tracking.

## How It Fits Into The System

- **Triggers:** Called by the frontend auth modal (signup/login forms), OAuth callback page, and on every page load (`/me` for session validation).
- **Dependencies:** Supabase Auth (server client for password auth, anon client for OAuth PKCE exchange), `profiles` table in Supabase, credit service (for granting initial signup credits), IP geolocation/check service, rate limiter middleware.
- **Dependents:** Every authenticated endpoint in the system depends on the cookies set by this file. The `/me` endpoint is used by the frontend `AuthContext` to hydrate user state on load. The `is_admin` flag returned by `/me` gates access to admin pages.

## Code Breakdown

### Signup Endpoint (`POST /signup`)

Accepts email and password. Validates password against complexity rules (min 8 chars, at least one uppercase, one lowercase, one digit). Creates the user in Supabase Auth, then inserts a row in the `profiles` table. Checks the client's IP address to determine initial credit grant eligibility (prevents abuse from repeated signups on the same IP). Sets access and refresh tokens as HttpOnly cookies on success.

### Login Endpoint (`POST /login`)

Accepts email and password credentials. Authenticates against Supabase Auth. On success:
1. Sets HttpOnly cookies with the access token and refresh token via `set_session_cookies_and_cleanup()`.
2. Generates and returns a CSRF token (added May 23, 2026) in the response body.
3. Updates `last_sign_in_at` timestamp in the user's profile row (added May 27, 2026) — non-fatal if this fails.
4. Returns tokens in response body for backward compatibility (frontend stores in memory, not localStorage), plus minimal user info (id, email).

The CSRF token must be included in subsequent state-changing requests as `X-CSRF-Token` header.

### OAuth PKCE Exchange (`POST /oauth/session`)

Receives the authorization code and code_verifier from the OAuth callback. Uses the Supabase **anon client** (not the service role client) to exchange the code for tokens via PKCE flow. This is critical — the anon client must be used because the PKCE verifier is tied to the anon key's session. On success:
1. Sets the resulting tokens as HttpOnly cookies.
2. Generates and returns a CSRF token.
3. Updates `last_sign_in_at` timestamp in the user's profile (added May 27, 2026) — non-fatal if this fails.
4. Grants initial credits for new OAuth users via IP-gated check (idempotent — safe to call on every OAuth login).
5. Returns tokens in response body alongside CSRF token and user info.

Extensive logging helps debug OAuth flow issues.

### Token Refresh (`POST /refresh`)

Reads the refresh token from the HttpOnly cookie. Calls Supabase Auth to get a new access token. Replaces both cookies with the fresh tokens. This is called automatically by the frontend API client when a 401 is detected.

### Logout (`POST /logout`)

Invalidates the session on Supabase's side and clears both HttpOnly cookies by setting them with expired timestamps.

### Me Endpoint (`GET /me`)

Reads the access token from the HttpOnly cookie (or Authorization header), validates it with Supabase, and returns the user's profile data from the `profiles` table. Includes:
- User ID and email from Supabase Auth
- Full profile object from `profiles` table
- `is_admin` flag which the frontend uses to conditionally render admin UI
- `daily_grant` result — checks and grants daily 50 credits if eligible (idempotent, safe to call on every page load)
- Current access and refresh token values (for debugging/compatibility)

If the token is invalid/expired, returns 401. This endpoint is called on every page load by the frontend `AuthContext` to hydrate user state.

### Password Validation Logic

A helper function that checks:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)

Returns a descriptive error message if any rule fails.

### Rate Limiting

All endpoints in this file are rate-limited to **5 requests per minute** per IP. This prevents brute-force login attempts and signup spam.

## Things To Know Before Editing

- **Tokens are returned in response bodies for backward compatibility.** The frontend stores them in memory (not localStorage) alongside HttpOnly cookies. The cookies are the source of truth for authentication.
- **CSRF tokens are generated on login/OAuth.** The `set_session_cookies_and_cleanup()` function generates a random CSRF token, stores it as a cookie, and returns it. Frontend must include it as `X-CSRF-Token` header on state-changing requests.
- **`last_sign_in_at` is updated on every successful login/OAuth.** Added May 27, 2026 for activity tracking. Non-fatal if the update fails — user still logs in successfully.
- **OAuth must use the anon client.** The PKCE code verifier is bound to the client that initiated the flow. Using the service role client for exchange will fail silently or throw cryptic errors.
- **Cookie settings matter.** The cookies must be set with `Secure`, `HttpOnly`, `SameSite=Lax` (or `None` for cross-origin). Changing these flags can break auth in production or during local development with different origins.
- **IP-based credit grant is idempotent.** The `grant_initial_credits()` function checks if credits were already granted to an IP or user. Safe to call on every signup/OAuth login without risk of double-granting.
- **Rate limit is per-IP, not per-user.** This means users behind shared IPs (corporate NAT, VPNs) may hit limits faster. The 5/minute threshold is intentionally conservative for auth endpoints.
- **The `/me` endpoint triggers daily credit grant check.** Called on every page load, it's idempotent and only grants once per UTC day. Performance matters here — avoid adding expensive queries.
- **OAuth endpoint logs extensively.** Code exchange errors are logged with full context for debugging. Don't remove these logs — OAuth flows are notoriously hard to debug.
