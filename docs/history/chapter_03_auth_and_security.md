# Chapter 03 — Auth & Security

## Auth Model Overview

Kareerist uses **HttpOnly cookie-based auth**. No JWTs in localStorage. No tokens in memory that JavaScript can read. The session is stored entirely in browser cookies that only the server can read.

Three cookies are set on every login:

| Cookie | HttpOnly | Purpose |
|--------|----------|---------|
| `__krs_sid` | ✅ Yes | Access JWT — 4 days |
| `__krs_rid` | ✅ Yes | Refresh token — 30 days |
| `__krs_xsrf` | ❌ No (JS-readable) | CSRF token — 4 days |

Cookie names are intentionally opaque (`__krs_*`) to avoid advertising what they contain.

---

## Email/Password Auth Flow

```
1. User submits email + password
2. POST /api/v1/auth/login
3. Backend calls supabase.auth.sign_in_with_password()
4. Supabase returns { access_token, refresh_token }
5. Backend calls set_session_cookies_and_cleanup(response, access_token, refresh_token)
   → Sets __krs_sid (HttpOnly, 4 days)
   → Sets __krs_rid (HttpOnly, 30 days)
   → Generates secrets.token_hex(32) → sets __krs_xsrf (JS-readable, 4 days)
   → Clears legacy cookie names (access_token, refresh_token, csrf_token)
6. Returns { user, csrf_token } to frontend
7. Frontend stores nothing — cookies are set automatically by the browser
```

---

## Google OAuth (PKCE Flow)

PKCE (Proof Key for Code Exchange) is the secure OAuth flow for SPAs. It prevents authorization code interception attacks.

```
1. User clicks "Sign in with Google"
2. Frontend calls supabase.auth.signInWithOAuth({ provider: "google" })
   → Supabase generates a code_verifier (random string)
   → Stores code_verifier in localStorage under "kareerist-auth-code-verifier"
   → Generates code_challenge = SHA256(code_verifier)
   → Redirects browser to Google with code_challenge
3. User authenticates with Google
4. Google redirects to /auth/callback?code=<authorization_code>
5. AuthCallback.tsx reads the code from URL params
6. Immediately cleans the URL (window.history.replaceState) — security
7. Reads code_verifier from localStorage
8. Calls POST /api/v1/auth/oauth/session with { code, code_verifier }
9. Backend calls supabase.auth.exchange_code_for_session(code, code_verifier)
   → Supabase verifies code_challenge matches code_verifier
   → Returns { access_token, refresh_token }
10. Backend sets session cookies (same as email login)
11. Frontend clears code_verifier from localStorage
12. Frontend clears any Supabase session from localStorage (we use cookies, not localStorage)
13. Redirects to /dashboard
```

Why PKCE? Without it, if an attacker intercepts the authorization code (e.g., via a malicious browser extension), they can't exchange it for tokens because they don't have the code_verifier.

---

## CSRF Protection

CSRF (Cross-Site Request Forgery) is when a malicious website tricks your browser into making requests to Kareerist using your cookies.

We use the **double-submit cookie pattern**:

1. On login, backend sets `__krs_xsrf` cookie (JS-readable, not HttpOnly)
2. Frontend reads `__krs_xsrf` from `document.cookie` on every state-changing request
3. Frontend sends it as `X-CSRF-Token` header
4. Backend's `CSRFMiddleware` checks that the header value matches the cookie value
5. An attacker's cross-site page can't read the cookie (same-origin policy), so they can't forge the header

```python
# CSRFMiddleware logic (simplified)
cookie_token = request.cookies.get("__krs_xsrf", "")
header_token = request.headers.get("X-CSRF-Token", "")
if not hmac.compare_digest(cookie_token, header_token):
    return 403
```

`hmac.compare_digest` is used instead of `==` to prevent timing attacks.

CSRF is only enforced in production (`ENVIRONMENT=production`). In development, `SameSite=Lax` is sufficient protection.

Exempt paths (no CSRF check needed):
- `GET`, `HEAD`, `OPTIONS` — safe methods, no state change
- `/auth/` and `/api/v1/auth/` — these create the session, they don't consume it
- `/health` and `/ping` — public read-only

---

## Rate Limiting

Rate limiting uses **SlowAPI** (a FastAPI wrapper around `limits`) with Redis as the storage backend.

In production, Redis is Upstash (`rediss://` URL with TLS). In development, falls back to in-memory. If `REDIS_URL` is localhost in production, the server refuses to start.

### Rate limit keys

The rate limit key is a composite of IP + authenticated user identity:

```python
def ats_rate_key(request: Request) -> str:
    ip = get_client_ip(request)
    tok = _cookie_access_token(request)
    sub = _verified_sub(tok) if tok else None
    if sub:
        return f"{ip}|u:{sub}"   # e.g. "1.2.3.4|u:uuid-here"
    return f"{ip}|anon"          # e.g. "1.2.3.4|anon"
```

This means:
- Anonymous users share a bucket per IP
- Authenticated users get their own bucket per (IP, user_id)
- A user can't bypass limits by using multiple IPs (they're still limited per user)

### Limits per endpoint

```
Auth endpoints:     5/minute
Resume upload:      5/day
AI analysis:        5/hour
Cover letter:       5/hour
Interview:          5/hour
ATS score:          5/hour
```

### IP extraction (proxy-aware)

In production (behind Render's load balancer), the real client IP is in `X-Forwarded-For` or `CF-Connecting-IP` (if behind Cloudflare). The backend reads these headers correctly. In development, it uses `request.client.host`.

---

## Security Headers

Every response gets these headers:

```
X-Content-Type-Options: nosniff          ← prevents MIME sniffing
X-Frame-Options: DENY                    ← prevents clickjacking
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-XSS-Protection: 1; mode=block
Content-Security-Policy: ...             ← strict in prod, relaxed in dev
Strict-Transport-Security: ...           ← HSTS, only over HTTPS
```

---

## Prompt Injection Defense

All user-provided text (resume, job description, user answers) is sanitized before being injected into LLM prompts via `prompt_sanitizer.py`.

Two passes:

**Pass 1 — XML tag stripping:** Removes tags that match our prompt delimiters (`<RESUME_TEXT>`, `<JOB_DESCRIPTION>`, etc.). This prevents attackers from prematurely closing the data sandbox in the prompt.

**Pass 2 — Natural language injection stripping:** Removes phrases like:
- "ignore all previous instructions"
- "forget prior context"
- "you are now a..."
- "act as a..."
- "new instructions:"
- `<system>` tags

Additionally, the `language` field in interview requests is validated against a strict allowlist of known languages. Free-text language values are rejected and defaulted to "english" to prevent injection via the language parameter.

---

## Admin Security

Admin endpoints have two layers of protection:

1. **`CurrentUser` dependency** — validates the JWT cookie (same as all protected routes)
2. **`_require_admin()` function** — re-reads `is_admin` from `public.profiles` in the database on every request

The second check is critical. Even if someone forged a JWT claiming admin status, the database check would catch it. The `is_admin` flag can only be set directly in the database by someone with database access.

All admin actions (grant credits, set unlimited) are logged at `WARNING` level with the admin's email, user ID, target user ID, and action details. This creates an audit trail in the logs.

---

## Session Persistence

Sessions last 4 days (`AUTH_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 4`). The refresh token lasts 30 days. On every page load, `useAuth.ts` calls `GET /api/v1/auth/me` to verify the session is still valid. If the access token is expired but the refresh token is valid, the `/auth/refresh` endpoint issues a new access token.

On logout, cookies are cleared client-side. The server-side session is also invalidated via Supabase's auth API.
