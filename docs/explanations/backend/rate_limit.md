# rate_limit.py

**Location:** `prsnl/backend/app/core/rate_limit.py`  
**Type:** Rate Limiting Infrastructure

## What This File Does

Configures the slowapi rate limiter with composite rate limit keys that combine client IP with an optional authenticated user ID. Uses Redis as the storage backend in production for distributed rate limiting across multiple workers, and falls back to in-memory storage for local development and tests. Also provides IP extraction logic that correctly handles Cloudflare, reverse proxies, and direct connections.

## How It Fits Into The System

- **What triggers it:** Imported by `main.py` to attach the limiter to the FastAPI app state. Individual endpoint files import the `limiter` instance and key functions to apply `@limiter.limit()` decorators.
- **What it depends on:** `app.core.config` (for REDIS_URL, SUPABASE_JWT_SECRET), `jwt` (PyJWT for token decoding), `slowapi` (rate limiting library).
- **What depends on it:** All endpoint files that use rate limiting decorators (`auth.py`, `resumes.py`, `analysis.py`, `cover_letter.py`, `interview.py`, `ats.py`, `utils.py`), and the credit system which uses `ats_rate_key` for per-user tracking.

## Code Breakdown

### _get_real_client_ip(request)

Extracts the true client IP address by checking headers in priority order:

1. `CF-Connecting-IP` — set by Cloudflare (most reliable when behind CF)
2. `X-Forwarded-For` — standard proxy header (takes the first/leftmost IP)
3. `X-Real-IP` — set by Nginx and some reverse proxies
4. `request.client.host` — direct connection fallback

This ordering ensures correct IP identification regardless of the infrastructure stack.

### _build_limiter()

Factory function that creates the SlowAPI `Limiter` instance with the appropriate storage backend:

- **Production (REDIS_URL points to a remote host):** Uses `RedisStorage` for distributed, persistent rate limit counters that survive restarts and are shared across workers.
- **Local development / tests (REDIS_URL is localhost or unset):** Uses in-memory storage so developers don't need Redis running locally.

The default rate limit key function is set to `get_client_ip`.

### get_client_ip(request)

Public alias for `_get_real_client_ip`. This is the default key function used by the limiter when no custom key is specified. Endpoints that only need IP-based rate limiting use this implicitly.

### _cookie_access_token(request)

Extracts the JWT access token from the HttpOnly cookie. Reads the cookie by name (from settings), strips the `"Bearer "` prefix that `auth_cookies.py` adds when setting the cookie. Returns `None` if the cookie is missing or empty.

### _verified_sub(token)

Decodes the JWT using `SUPABASE_JWT_SECRET` to extract the `sub` claim (the user's UUID). Returns `None` on any failure (expired token, invalid signature, malformed JWT). Failures are intentionally silent — logged at debug level only — because this is used for rate limiting, not authentication.

### ats_rate_key(request)

Builds a composite rate limit key that differentiates authenticated users from anonymous ones:

- **Authenticated:** `"192.168.1.1|u:abc123-def456"` — IP + user UUID
- **Anonymous:** `"192.168.1.1|anon"` — IP only

This allows per-user rate limits for logged-in users while still rate-limiting anonymous users by IP. The composite format ensures that a user hitting the API from different IPs still shares one rate limit counter.

## Things To Know Before Editing

- If `REDIS_URL` points to `localhost` or `127.0.0.1`, rate limits use in-memory storage. This means limits reset on every server restart and aren't shared between workers.
- Changing the format of `ats_rate_key` (e.g., changing the separator or prefix) will effectively reset all existing rate limit counters in Redis, since the keys won't match anymore.
- JWT decode failures in `_verified_sub` are intentionally silent (debug-level logging). This is by design — a failed decode just means the user is treated as anonymous for rate limiting purposes.
- The `limiter` instance is created at module level. If Redis is unreachable at import time in production, the app will fail to start.
- SlowAPI stores counters with the rate limit string as part of the key — changing a rate limit value in config (e.g., "5/minute" to "10/minute") creates new counter keys, effectively resetting limits.
- The `X-Forwarded-For` header can be spoofed if the app is not behind a trusted proxy. Cloudflare's `CF-Connecting-IP` is the most trustworthy source.
