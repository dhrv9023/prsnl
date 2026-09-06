# Diagram 2: Authentication & Session Flow

[← Back to Architecture Hub](../README.md) · [← Documentation Hub](../../README.md)

---

> 💡 **Quick Visual Preview:** In Antigravity IDE / VS Code, press **Ctrl + Shift + V** (or click the **Open Preview to the Side** icon at top-right) to view this flowchart rendered visually.
> 🌐 **Interactive Canvas Viewer:** You can also open [architecture_viewer.html](../architecture_viewer.html) directly in any web browser to pan, zoom, and inspect components.

---


## 🔐 Auth & Session Lifecycle (At a Glance)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              1. SIGNUP FLOW                                 │
│  User Input (Email, Password, Name)                                         │
│       │                                                                     │
│       ▼                                                                     │
│  POST /api/v1/auth/signup                                                   │
│       ├─► Pydantic Validation & Stored XSS Sanitization (HTML tags stripped)│
│       ├─► Supabase Auth: creates auth.users record                          │
│       ├─► DB Trigger: handle_new_user() creates profiles record             │
│       └─► Anti-Farming: Check IP in ip_credit_claims -> Grant 100 credits   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            2. LOGIN / OAUTH FLOW                            │
│  Option A: Email/Password           Option B: Google OAuth (PKCE)           │
│       │                                  │                                  │
│       ▼                                  ▼                                  │
│  POST /api/v1/auth/login            POST /api/v1/auth/oauth/session         │
│  Supabase password verify           Exchange code + code_verifier           │
│       │                                  │                                  │
│       └──────────────────┬───────────────┘                                  │
│                          ▼                                                  │
│              Session Cookie Dispatch                                        │
│              • Set HttpOnly __krs_sid (Access Token, 1h)                    │
│              • Set HttpOnly __krs_rid (Refresh Token, 30d)                  │
│              • Set JS-readable __krs_xsrf (CSRF double-submit token)        │
│              • Return user profile + credit balance                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         3. AUTHENTICATED REQUESTS                           │
│  Client sends credentials: "include" + X-CSRF-Token header                  │
│       │                                                                     │
│       ▼                                                                     │
│  FastAPI Security Pipeline:                                                 │
│  1. CSRFMiddleware checks header matches __krs_xsrf cookie                  │
│  2. get_current_user reads __krs_sid cookie and verifies JWT                │
│  3. If token expired, client calls POST /api/v1/auth/refresh                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Technical Flowchart (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant FE as React Frontend
    participant BE as FastAPI Backend
    participant SupaAuth as Supabase Auth
    participant SupaDB as PostgreSQL DB

    Note over User,SupaDB: Phase 1: Sign Up with Anti-Farming
    User->>FE: Fill email, password, full name
    FE->>BE: POST /api/v1/auth/signup
    Note over BE: Sanitize full_name (Strip XSS & HTML)<br/>Validate password strength
    BE->>SupaAuth: auth.sign_up(email, password)
    SupaAuth-->>BE: User UUID created
    SupaAuth->>SupaDB: DB Trigger: Insert profiles (0 credits)
    BE->>SupaDB: Check ip_credit_claims for client IP
    alt IP has not claimed credits
        BE->>SupaDB: RPC grant_credits(user_id, 100)
        BE->>SupaDB: Insert ip_credit_claims(ip, user_id)
    else IP already claimed
        Note over BE: Anti-Farming triggered: 0 credits granted
    end
    BE-->>FE: HTTP 200 {msg: "Registration successful"}

    Note over User,SupaDB: Phase 2: Google OAuth Session Exchange
    User->>FE: Click "Continue with Google"
    FE->>SupaAuth: signInWithOAuth({provider: 'google'})
    SupaAuth-->>User: Redirect to Google Consent -> /auth/callback?code=XYZ
    FE->>BE: POST /api/v1/auth/oauth/session {code, code_verifier}
    BE->>SupaAuth: exchange_code_for_session(code, code_verifier)
    alt Code Valid
        SupaAuth-->>BE: Access Token + Refresh Token
        Note over BE: Set-Cookie: __krs_sid (HttpOnly, Secure)<br/>Set-Cookie: __krs_rid (HttpOnly, Secure)<br/>Set-Cookie: __krs_xsrf (JS readable)
        BE-->>FE: HTTP 200 {user, profile, csrf_token}
    else Code Invalid / Expired
        Note over BE: Log detailed traceback server-side<br/>Mask client error
        BE-->>FE: HTTP 401 "OAuth authentication failed."
    end

    Note over User,SupaDB: Phase 3: Daily Credit Check on Visit
    FE->>BE: GET /api/v1/auth/me
    BE->>SupaDB: Check last_daily_grant_date
    alt Eligible for 50 Daily Credits
        BE->>SupaDB: RPC grant_daily_credits(user_id, 50)
        BE->>SupaDB: Record credit_transactions ('daily_grant')
    end
    BE-->>FE: HTTP 200 {user, credits, daily_grant_status}
```

---

## 🛡️ Security Mechanisms

| Mechanism | Implementation Details |
|---|---|
| **Stored XSS Prevention** | `UserAuth.full_name` stripped of HTML tags (`<[^>]+>`) and special characters (`[<>"\'&;]`), capped at 100 chars. |
| **HttpOnly Cookie Tokens** | JWT access (`__krs_sid`) and refresh (`__krs_rid`) tokens are stored in HttpOnly cookies, immune to JavaScript theft. |
| **CSRF Protection** | Double-submit pattern: backend sets JS-readable `__krs_xsrf` cookie. Frontend sends matching `X-CSRF-Token` header. |
| **Exception Masking** | Supabase internal errors in OAuth exchange are sanitized to generic client messages while logged server-side. |
| **Anti-Farming Protection** | `ip_credit_claims` enforces one initial 100-credit bonus per unique IP address. |
