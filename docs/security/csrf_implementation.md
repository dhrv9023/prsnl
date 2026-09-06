# CSRF Protection Implementation Guide

## Overview

Kareerist implements **double-submit cookie CSRF protection** with special handling for cross-origin production deployments where the frontend and backend are on different domains.

## Problem Statement

In production:
- Frontend: `https://kareerist2026.vercel.app`
- Backend: `https://prsnl.onrender.com`

Traditional CSRF protection relies on reading cookies via `document.cookie`, but cookies with `SameSite=None` set by one domain **cannot be read by JavaScript from another domain** due to browser same-origin policy.

## Solution: In-Memory Token Storage

Instead of relying on cross-origin cookies, we:

1. **Backend returns token in response body** on login/OAuth
2. **Frontend stores token in memory + sessionStorage** (not cookies)
3. **Frontend sends token as HTTP header** on state-changing requests
4. **Backend validates header token matches cookie token**

## Implementation Details

### Backend (FastAPI)

#### 1. Token Generation & Cookie Setting (`app/core/auth_cookies.py`)

```python
def set_csrf_cookie(response: Response) -> str:
    """Generate random CSRF token and set as JS-readable cookie."""
    csrf_token = secrets.token_hex(32)  # 64-char hex string
    response.set_cookie(
        key=CSRF_COOKIE_NAME,  # "__krs_xsrf"
        value=csrf_token,
        max_age=settings.AUTH_ACCESS_MAX_AGE_SECONDS,
        httponly=False,  # JS-readable (intentional)
        secure=settings.COOKIE_SECURE,  # True in production
        samesite=settings.COOKIE_SAMESITE,  # "none" in production
    )
    return csrf_token
```

#### 2. Login Response Includes Token (`app/api/v1/endpoints/auth.py`)

```python
@router.post("/login")
async def login(request: Request, user_data: UserAuth, response: Response):
    # ... auth logic ...
    csrf_token = set_session_cookies_and_cleanup(response, sess.access_token, refresh_token)
    
    return {
        "msg": "Login successful",
        "csrf_token": csrf_token,  # ← Returned in response body
        "user": {"id": user.id, "email": user.email}
    }
```

#### 3. CSRF Validation Middleware (`app/main.py`)

```python
class CSRFMiddleware(BaseHTTPMiddleware):
    def _add_cors_headers(self, response: Response, request: StarletteRequest) -> Response:
        """Add CORS headers to error responses."""
        origin = request.headers.get("origin")
        if origin and origin in _cors_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, X-CSRF-Token"
        return response

    async def dispatch(self, request: StarletteRequest, call_next) -> Response:
        # Skip in development
        if settings.ENVIRONMENT != "production":
            return await call_next(request)

        # Safe methods don't need CSRF
        if request.method in {"GET", "HEAD", "OPTIONS"}:
            return await call_next(request)

        # Auth endpoints exempt (they create the session)
        if any(request.url.path.startswith(p) for p in _CSRF_EXEMPT_PREFIXES):
            return await call_next(request)

        # Validate token
        cookie_token = request.cookies.get(CSRF_COOKIE_NAME, "")
        header_token = request.headers.get("X-CSRF-Token", "")

        if not cookie_token or not header_token:
            response = Response(
                content='{"detail":"CSRF token missing"}',
                status_code=403,
                media_type="application/json",
            )
            return self._add_cors_headers(response, request)

        # Constant-time comparison
        import hmac
        if not hmac.compare_digest(cookie_token, header_token):
            response = Response(
                content='{"detail":"CSRF token mismatch"}',
                status_code=403,
                media_type="application/json",
            )
            return self._add_cors_headers(response, request)

        return await call_next(request)
```

**Key Points:**
- CSRF validation only runs in production (`ENVIRONMENT == "production"`)
- Safe methods (GET, HEAD, OPTIONS) bypass CSRF
- Auth endpoints exempt (they create the session)
- **CORS headers added to 403 responses** so browser doesn't block them
- Constant-time comparison prevents timing attacks

### Frontend (React)

#### 1. Token Management (`src/lib/api.ts`)

```typescript
let csrfTokenCache: string | null = null;

export function setCsrfToken(token: string): void {
    csrfTokenCache = token;
    try {
        sessionStorage.setItem("__krs_csrf", token);
    } catch {
        // ignore if sessionStorage disabled
    }
}

export function clearCsrfToken(): void {
    csrfTokenCache = null;
    try {
        sessionStorage.removeItem("__krs_csrf");
    } catch {
        // ignore
    }
}

function getCsrfToken(): string {
    // 1. Check memory cache first
    if (csrfTokenCache) return csrfTokenCache;

    // 2. Try sessionStorage (survives page refresh)
    try {
        const stored = sessionStorage.getItem("__krs_csrf");
        if (stored) {
            csrfTokenCache = stored;
            return stored;
        }
    } catch {
        // ignore
    }

    // 3. Fall back to reading cookie (works in same-origin dev setups)
    const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith("__krs_xsrf="));
    const token = match ? match.split("=")[1] : "";
    if (token) csrfTokenCache = token;
    return token;
}
```

**Fallback Chain:**
1. Memory cache (fastest, lost on page refresh)
2. SessionStorage (survives page refresh, lost on tab close)
3. Cookie (works in same-origin dev, fails in cross-origin prod)

#### 2. Store Token on Login (`src/lib/api.ts`)

```typescript
export async function apiLogin(
    email: string,
    password: string
): Promise<{ msg: string; user: AuthUser }> {
    const result = await request<{ msg: string; user: AuthUser; csrf_token?: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    // Store CSRF token if returned (production cross-origin setup)
    if (result.csrf_token) {
        setCsrfToken(result.csrf_token);
    }
    return result;
}
```

#### 3. Send Token on State-Changing Requests

```typescript
async function request<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();

    // Attach CSRF token on all state-changing requests
    const csrfHeaders: Record<string, string> = {};
    if (!SAFE_METHODS.has(method)) {
        const token = getCsrfToken();
        if (token) csrfHeaders["X-CSRF-Token"] = token;
    }

    const res = await fetch(`${BASE}${path}`, {
        ...options,
        credentials: "include",  // send cookies
        headers: {
            "Content-Type": "application/json",
            ...csrfHeaders,  // ← CSRF token sent here
            ...options.headers,
        },
    });

    // ... error handling ...
}
```

#### 4. Clear Token on Logout

```typescript
export async function apiLogout(): Promise<{ msg: string }> {
    const result = await request<{ msg: string }>("/auth/logout", { method: "POST" });
    clearCsrfToken();  // ← Clear token
    return result;
}
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ User Login                                                      │
└─────────────────────────────────────────────────────────────────┘

Frontend                          Backend
   │                                 │
   ├─ POST /auth/login ─────────────>│
   │                                 │
   │                    Generate CSRF token
   │                    Set __krs_xsrf cookie
   │                                 │
   │<─ 200 OK + csrf_token ──────────┤
   │                                 │
   ├─ Store in memory + sessionStorage
   │
   │
┌─────────────────────────────────────────────────────────────────┐
│ User Makes State-Changing Request (e.g., Start Interview)      │
└─────────────────────────────────────────────────────────────────┘

Frontend                          Backend
   │                                 │
   ├─ POST /api/v1/interview/start ─>│
   │   Headers:                       │
   │   - X-CSRF-Token: <token>       │
   │   - Cookie: __krs_xsrf=<token>  │
   │                                 │
   │                    CSRFMiddleware:
   │                    1. Read cookie token
   │                    2. Read header token
   │                    3. Compare (constant-time)
   │                    4. If mismatch: 403 + CORS headers
   │                    5. If match: proceed
   │                                 │
   │<─ 200 OK ──────────────────────┤
   │
```

## Security Properties

✅ **CSRF Protection:** Attacker cannot forge the header without reading the cookie (same-origin policy)

✅ **Cross-Origin Compatible:** Works when frontend and backend are on different domains

✅ **Timing Attack Resistant:** Uses `hmac.compare_digest()` for constant-time comparison

✅ **Session Binding:** Token tied to user's session via HttpOnly cookies

✅ **Automatic Cleanup:** Token cleared on logout

✅ **Graceful Degradation:** Falls back to cookie reading in same-origin dev setups

## Testing

### Manual Testing

1. **Login and check token:**
   ```javascript
   // In browser console after login
   sessionStorage.getItem("__krs_csrf")  // Should return token
   ```

2. **Make a request with token:**
   ```javascript
   // Should succeed
   fetch("https://prsnl.onrender.com/api/v1/interview/start", {
       method: "POST",
       credentials: "include",
       headers: {
           "X-CSRF-Token": sessionStorage.getItem("__krs_csrf"),
           "Content-Type": "application/json"
       },
       body: JSON.stringify({...})
   })
   ```

3. **Make a request without token:**
   ```javascript
   // Should return 403 with CORS headers
   fetch("https://prsnl.onrender.com/api/v1/interview/start", {
       method: "POST",
       credentials: "include",
       headers: {"Content-Type": "application/json"},
       body: JSON.stringify({...})
   })
   ```

### Automated Testing

```python
# backend/tests/test_csrf.py
def test_csrf_token_required():
    response = client.post("/api/v1/interview/start", json={...})
    assert response.status_code == 403
    assert "CSRF token missing" in response.json()["detail"]

def test_csrf_token_mismatch():
    response = client.post(
        "/api/v1/interview/start",
        json={...},
        headers={"X-CSRF-Token": "wrong_token"}
    )
    assert response.status_code == 403
    assert "CSRF token mismatch" in response.json()["detail"]
```

## Troubleshooting

### "CSRF token missing" Error

**Cause:** Frontend didn't store token from login response

**Fix:**
1. Check browser console: `sessionStorage.getItem("__krs_csrf")`
2. If empty, check login response includes `csrf_token`
3. Verify `setCsrfToken()` is called in `apiLogin()`

### "CSRF token mismatch" Error

**Cause:** Token in header doesn't match token in cookie

**Fix:**
1. Check both tokens are the same:
   ```javascript
   console.log("Header token:", sessionStorage.getItem("__krs_csrf"))
   console.log("Cookie token:", document.cookie.split("; ").find(r => r.startsWith("__krs_xsrf="))?.split("=")[1])
   ```
2. If different, token may have expired or been cleared
3. Try logging out and back in

### CORS Error on 403 Response

**Cause:** CSRFMiddleware not adding CORS headers

**Fix:**
1. Verify `_add_cors_headers()` is called on error responses
2. Check `CORS_ORIGINS` environment variable includes frontend URL
3. Verify middleware order: CORS should be innermost, CSRF should add headers

## Environment Variables

```bash
# Backend (.env)
ENVIRONMENT=production  # CSRF only enforced in production
COOKIE_SECURE=true      # HTTPS only
COOKIE_SAMESITE=none    # Allow cross-origin
CORS_ORIGINS=https://kareerist2026.vercel.app

# Frontend (.env.local)
VITE_API_BASE=https://prsnl.onrender.com
```

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN: SameSite Cookie Attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
