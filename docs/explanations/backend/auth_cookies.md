# auth_cookies.py

**Location:** `prsnl/backend/app/core/auth_cookies.py`  
**Type:** Cookie Management Utility

## What This File Does

Provides helper functions to set and clear HttpOnly session cookies on FastAPI responses. Manages two cookies: an access token (short-lived, 1 hour) and a refresh token (long-lived, 30 days). The access token is stored with a `"Bearer "` prefix baked into the cookie value. All cookie parameters (path, secure, httponly, samesite, domain) are centrally controlled via settings.

## How It Fits Into The System

- **What triggers it:** Called by auth endpoint handlers whenever a session needs to be created (login, OAuth callback, token refresh) or destroyed (logout).
- **What it depends on:** `app.core.config` (settings for cookie names, paths, secure flag, samesite, domain, max ages).
- **What depends on it:** `auth.py` endpoints (login, signup, OAuth callback, refresh, logout). Any future endpoint that needs to issue or revoke session cookies.

## Code Breakdown

### _base_cookie_args()

Returns a dictionary of common cookie parameters shared by both access and refresh cookies:

- `path` — from `AUTH_COOKIE_PATH` (typically `/`)
- `httponly` — always `True` (JavaScript cannot read these cookies)
- `secure` — from `COOKIE_SECURE` (must be `True` in production for HTTPS-only)
- `samesite` — from `COOKIE_SAMESITE` (typically `"lax"`)
- `domain` — from `AUTH_COOKIE_DOMAIN` (optional, for cross-subdomain auth)

This centralizes cookie configuration so changes propagate to all cookie operations.

### set_access_token_cookie(response, access_token)

Sets the access token cookie on the response:

- Cookie name: from `AUTH_ACCESS_COOKIE_NAME`
- Value: `"Bearer " + access_token` (prefix included in the stored value)
- Max age: `AUTH_ACCESS_MAX_AGE_SECONDS` (3600 = 1 hour)

The `"Bearer "` prefix is stored directly in the cookie so that consumers (like `rate_limit.py` and `dependencies.py`) can strip it and use the raw token.

### set_refresh_token_cookie(response, refresh_token)

Sets the refresh token cookie on the response:

- Cookie name: from `AUTH_REFRESH_COOKIE_NAME`
- Value: raw refresh token (no prefix)
- Max age: `AUTH_REFRESH_MAX_AGE_SECONDS` (2592000 = 30 days)

### set_session_cookies(response, access_token, refresh_token)

Convenience function that calls both `set_access_token_cookie` and `set_refresh_token_cookie`. Used after successful login/signup/OAuth to set the full session in one call.

### clear_session_cookies(response)

Deletes both cookies by calling `response.delete_cookie()` with the same path and domain parameters. Used during logout to invalidate the client-side session. The cookies are removed from the browser immediately.

## Things To Know Before Editing

- The `"Bearer "` prefix is stored IN the cookie value itself. Every consumer that reads the access token cookie must strip this prefix before using the token. If you remove the prefix here, you'll break `dependencies.py` and `rate_limit.py`.
- `COOKIE_SECURE` must be `True` in production. If it's `False`, cookies will be sent over HTTP, which is a session hijacking vulnerability. The config validator enforces this, but be aware.
- If `AUTH_COOKIE_DOMAIN` is set (e.g., `.example.com`), cookies are scoped to that domain and all subdomains. Misconfiguring this (e.g., setting it to a different domain) will make cookies invisible to the frontend, breaking auth silently.
- `delete_cookie` must use the same `path` and `domain` as `set_cookie` — otherwise the browser won't match and delete the correct cookie. The `_base_cookie_args()` function ensures consistency.
- Changing cookie names in config will immediately invalidate all existing sessions (browsers will still send the old-named cookies, but the backend won't read them).
- The `samesite` attribute affects cross-origin behavior. Setting it to `"none"` requires `secure=True` and is needed for cross-origin deployments (e.g., frontend on a different domain than the API).
