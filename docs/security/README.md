# Kareerist Security Architecture & Defense Guide

[← Back to Documentation Hub](../README.md)

---

## Executive Summary

Kareerist adheres to a defense-in-depth security model across its client, edge, API gateway, service, and database layers. The platform maintains an audited security rating of **8.8 / 10** as of September 6, 2026.

---

## 🛡️ Multi-Layered Defense Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. EDGE & CLIENT SECURITY (Vercel CDN + Browser)                            │
│    • HSTS (max-age=31536000; includeSubDomains; preload)                    │
│    • X-Frame-Options: DENY (Clickjacking mitigation)                        │
│    • X-Content-Type-Options: nosniff (MIME sniffing prevention)             │
│    • Permissions-Policy: camera=(), microphone=(self), geolocation=()       │
│    • In-memory CSRF tokens (sessionStorage fallback, cross-origin safe)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / WSS
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. API GATEWAY & MIDDLEWARE PIPELINE (FastAPI on Render)                    │
│    • RequestLoggerMiddleware: Unique X-Request-ID & latency tracing         │
│    • ProxyHeadersMiddleware: Trusted X-Forwarded-For validation             │
│    • CSRFMiddleware: Constant-time double-submit HMAC comparison            │
│    • BodySizeLimitMiddleware: 1MB maximum payload guard (413 Payload)       │
│    • SecurityHeadersMiddleware: Content-Security-Policy & Permissions policy│
│    • CORSMiddleware: Strict origin allowlisting                             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. ACCESS CONTROL & RATE LIMITING                                           │
│    • Redis-Backed SlowAPI: Per-IP and per-user sliding rate limit buckets   │
│    • JWT Verification: Cryptographic verification of HttpOnly __krs_sid     │
│    • Exception Masking: Sanitizes internal database errors on 401/500       │
│    • Admin Guards: Server-side database verification of is_admin flag       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. APPLICATION & SERVICE DEFENSE                                            │
│    • Stored XSS Sanitization: UserAuth.full_name HTML stripping (regex)     │
│    • Input Bounds: Pydantic schemas enforce min/max lengths on all inputs   │
│    • Prompt Injection Defense: prompt_sanitizer.py                          │
│      - Unicode NFKC normalization (anti-homoglyph tag bypass)               │
│      - HTML comment stripping (<!--...-->)                                  │
│      - 3-pass loop against reconstructed nested tags                        │
│      - System prompt extraction pattern filters                             │
│    • Media Validation: Magic byte checking on PDFs (%PDF-), MIME allowlists │
│      and 10MB payload size limits on audio voice uploads                    │
│    • Automatic Failure Refunds: Atomic credit rollback on 502 LLM errors    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. DATABASE SECURITY (Supabase PostgreSQL 15)                               │
│    • Row Level Security (RLS): Enabled on all 9 user-scoped tables          │
│    • Query Scoping: Defense-in-depth .eq("user_id", user.id) filters        │
│    • Atomic RPCs: FOR UPDATE row locks prevent credit double-spending       │
│    • Anti-Farming: ip_credit_claims enforces 1 initial grant per IP address │
│    • Audit Trail: Immutable credit_transactions history log                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 Detailed Security Control Matrix

| Category | Vulnerability Mitigated | Implementation & File Reference |
|---|---|---|
| **Session Security** | Session hijacking / XSS token theft | HttpOnly, Secure session cookies (`__krs_sid`, `__krs_rid`) managed in `backend/app/core/auth_cookies.py`. No tokens stored in `localStorage`. |
| **CSRF Protection** | Cross-Site Request Forgery | Double-submit pattern with `__krs_xsrf` cookie and `X-CSRF-Token` header. See [CSRF Implementation Guide](./csrf_implementation.md). |
| **Input Sanitization** | Stored Cross-Site Scripting (SEC-008) | `@field_validator("full_name", mode="before")` in `auth.py` strips `<[^>]+>` and injection characters `[<>"\'&;]`, capped at 100 chars. |
| **Microphone Access** | Unauthorized audio recording / Voice blocks | `Permissions-Policy: camera=(), microphone=(self), geolocation=()` in `backend/app/main.py` and `FRONTEND/vercel.json`. |
| **Prompt Injection** | LLM jailbreaks & prompt extraction | `sanitize_user_text()` in `backend/app/services/prompt_sanitizer.py` applies NFKC normalization, comment stripping, 3-pass loop, and extraction filters. |
| **Multi-Tenancy** | Broken Object Level Authorization (SEC-015) | Explicit `.eq("user_id", str(user.id))` scoping on all queries in addition to Supabase PostgreSQL Row Level Security (RLS). |
| **File Uploads** | Malicious file execution / DoS (VULN-009) | Magic byte `%PDF-` validation on resumes. MIME type allowlist, extension checks, and 10MB limit on `/submit_voice` in `interview.py`. |
| **Input Flooding** | LLM denial of service (P1-3) | `HumanizeRequest.text` schema bounded between 50 and 5,000 characters. Body size middleware rejects >1MB. |
| **Error Disclosure** | Internal information leakage (SEC-026) | Supabase OAuth exception details sanitized to generic client messages in `auth.py` while logging full stack traces server-side. |
| **Anti-Farming** | Multi-account signup abuse | `ip_credit_claims` table enforces one 100-credit bonus per unique client IP address in `credits.py`. |
| **Financial Race** | Credit double-spend race conditions | Atomic PostgreSQL RPC `deduct_credits()` with `FOR UPDATE` row lock in `20260513000000_credit_system.sql`. |
| **Failure Refunds** | Credit loss on AI timeouts | `refund_feature_credits()` restores user balance automatically before raising HTTP 502 Bad Gateway. |
| **Secret Protection** | Accidental build-time API secret leaks | `FRONTEND/vite.config.ts` plugin halts compilation if `SERVICE_ROLE`, `SECRET_KEY`, `PRIVATE_KEY`, or `DATABASE_URL` are prefixed with `VITE_`. |
| **Transport Security** | Man-in-the-Middle & HTTP downgrade attacks | Reverse-proxy aware (`x-forwarded-proto`) 301 HTTPS redirect and HSTS `max-age=31536000; includeSubDomains; preload` in `backend/app/main.py`. |
| **Bot & Form Abuse** | Contact spam & brute force credential stuffing | Hidden honeypots, <1.5s velocity trap, 3/hr contact throttling in `Contact.tsx`, and 30s lockout after 5 failed attempts in `AuthModal.tsx`. |
