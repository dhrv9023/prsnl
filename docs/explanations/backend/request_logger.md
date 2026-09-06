# request_logger.py

**Location:** `prsnl/backend/app/core/request_logger.py`  
**Type:** Middleware / Observability

## What This File Does

Logs every HTTP request with structured metadata including method, path, status code, response duration, user ID (extracted from the JWT cookie), client IP, and a unique request ID. Outputs structured JSON in production (for log aggregators like Datadog or CloudWatch) and human-readable formatted lines in development. Automatically skips noisy health-check paths to keep logs clean.

## How It Fits Into The System

- **What triggers it:** Added as middleware in `main.py`. Every incoming HTTP request passes through this middleware's `dispatch` method before reaching route handlers.
- **What it depends on:** `app.core.config` (to determine environment for log format), `jwt` (to decode user ID from cookie without verification).
- **What depends on it:** `main.py` (registers it as middleware). Route handlers can access `request.state.request_id` to correlate logs within a single request lifecycle.

## Code Breakdown

### _SKIP_PATHS

A set of paths that are excluded from logging:

- `/health` — health check endpoint (polled frequently by monitoring)
- `/` — root endpoint (often hit by bots/scanners)
- `/favicon.ico` — browser automatic requests

These paths generate high-volume, low-value log entries that would drown out meaningful request logs.

### _SENSITIVE_PATHS

Paths where the request body is never logged, even in development:

- Auth endpoints (login, signup, password reset) — contain credentials

This prevents passwords and tokens from appearing in log output.

### _extract_user_id(request)

Decodes the JWT from the access token cookie WITHOUT signature verification to extract the first 8 characters of the user's UUID. This is intentionally unverified because:

1. It's only used for log correlation, not authorization
2. Verification would require async Supabase calls in middleware (expensive)
3. A truncated UUID is enough to correlate logs for a user session

Returns `"anon"` if no valid token is found.

### _get_client_ip(request)

Extracts the real client IP by checking proxy headers in order: `CF-Connecting-IP` → `X-Forwarded-For` (first entry) → `X-Real-IP` → `request.client.host`. Same logic as `rate_limit.py` but duplicated here to avoid circular imports.

### RequestLoggerMiddleware (class)

A Starlette `BaseHTTPMiddleware` subclass with a single `dispatch` method:

1. **Pre-request:** Generates a UUID4 `request_id`, attaches it to `request.state`, records start time.
2. **Request execution:** Calls the next middleware/route handler, catches any unhandled exceptions (logs them as 500).
3. **Post-request:** Calculates duration, extracts user ID and IP, adds `X-Request-ID` response header.
4. **Logging:** Calls `_emit_log()` with all collected metadata.

The `X-Request-ID` header is returned to the client so frontend error reports can be correlated with backend logs.

### _emit_log()

Formats and emits the log record based on environment:

- **Production:** Outputs a JSON object with all fields (parseable by log aggregators).
- **Development:** Outputs a human-readable single line like `INFO | 200 | GET /api/v1/auth/me | 45ms | user:abc123de | 127.0.0.1`

Log levels are chosen by status code:
- `INFO` — 1xx, 2xx, 3xx responses
- `WARNING` — 4xx responses (client errors)
- `ERROR` — 5xx responses (server errors)

## Things To Know Before Editing

- The JWT is decoded WITHOUT verification — this is intentional and safe for logging purposes. Do not add authorization logic here.
- The `request_id` is attached to `request.state` so route handlers can include it in error responses or pass it to external services for distributed tracing.
- Adding paths to `_SKIP_PATHS` will make those endpoints completely invisible in logs — useful for noisy endpoints but dangerous if you need to debug them.
- The middleware catches exceptions to ensure every request gets logged, even if the route handler crashes. The exception is re-raised after logging.
- In production, log output must be valid JSON (one object per line). Adding `print()` statements or non-JSON log calls will break log aggregator parsing.
- The IP extraction logic is duplicated from `rate_limit.py` to avoid circular imports. If you change IP resolution logic, update both files.
