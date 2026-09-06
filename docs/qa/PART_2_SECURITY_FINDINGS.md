# 🔐 Part 2: Security Testing — Detailed Findings

> **Note (September 6, 2026):** For the latest re-test status, verified bugfixes, and updated findings against platform version 1.2.0, see [PART_2_SECURITY_FINDINGS_UPDATED_SEP_06.md](./PART_2_SECURITY_FINDINGS_UPDATED_SEP_06.md).

## 2A. Authentication & Session Security

### SEC-001 — ✅ PASS: Password Strength Validation
- **Tested:** Weak password `"weak"` → rejected with `String should have at least 8 characters`
- **Tested:** No uppercase → rejected with `Password must contain at least one uppercase letter`
- **Tested:** No digit → rejected with `Password must contain at least one digit`
- **Evidence:** Pydantic field_validator enforces uppercase, lowercase, and digit requirements
- **Rating:** ✅ Excellent — Server-side validation with clear error messages

### SEC-002 — ✅ PASS: HttpOnly Session Cookies
- **Tested:** Access token cookie (`__krs_sid`) uses `httponly=True`, `secure=True` (production)
- **Tested:** Refresh token cookie (`__krs_rid`) uses `httponly=True`, `secure=True`
- **Evidence:** `auth_cookies.py` lines 28-37 confirm correct cookie flags
- **Rating:** ✅ Excellent — Tokens never exposed to JavaScript

### SEC-003 — ✅ PASS: CSRF Protection (Double-Submit Cookie)
- **Tested:** CSRF middleware validates `X-CSRF-Token` header matches `__krs_xsrf` cookie
- **Tested:** Uses `hmac.compare_digest()` for constant-time comparison
- **Tested:** CORS headers added to 403 CSRF rejection responses
- **Tested:** Token rotation on login (new `secrets.token_hex(32)` each time)
- **Evidence:** `main.py` CSRFMiddleware, lines 142-207
- **Weakness Found:** CSRF disabled entirely when `ENVIRONMENT != "production"` — single env variable controls all CSRF
- **Rating:** ✅ Good — Solid implementation, minor concern with env-toggle

### SEC-004 — ✅ PASS: Rate Limiting on Auth Endpoints
- **Tested:** 8 rapid login attempts → requests 1-5 returned `401`, requests 6-8 returned `429`
- **Evidence:** `RATE_LIMIT_AUTH = "5/minute"` correctly enforced via SlowAPI + Redis
- **Rating:** ✅ Excellent — Brute force protection works

### SEC-005 — ✅ PASS: OpenAPI Docs Disabled in Production
- **Tested:** `GET /docs` → `404 Not Found` (not `200`)
- **Evidence:** `main.py` line 213-216: `openapi_url=None if _is_prod`
- **Rating:** ✅ Excellent — No API documentation leakage

### SEC-006 — ✅ PASS: Admin Access Control
- **Tested:** `GET /api/v1/admin/stats` without auth → `401 Not authenticated`
- **Tested:** `GET /api/v1/admin/users` without auth → `401 Not authenticated`
- **Evidence:** `admin.py` `_require_admin()` checks `is_admin` from database
- **Rating:** ✅ Excellent — Server-side admin verification, not frontend-only

### SEC-007 — ✅ PASS: Unauthenticated Endpoint Protection
- **Tested:** `GET /api/v1/auth/me` without cookies → `401 Not authenticated`
- **Evidence:** `dependencies.py` `get_current_user()` raises 401 when no cookie present
- **Rating:** ✅ Good

---

## 2B. Input Validation & Sanitization

### SEC-008 — 🔴 CRITICAL: Stored XSS in `full_name` Field
- **Severity:** Critical
- **Category:** Security — XSS (Cross-Site Scripting)
- **Steps to Reproduce:**
  1. Send POST to `/api/v1/auth/signup`
  2. Set `full_name` to `<script>alert('XSS')</script>`
  3. Response: `{"msg":"User created successfully","user_id":"22ce6b19-..."}`
  4. The XSS payload is stored in the database
- **Expected Result:** `full_name` should be sanitized or rejected
- **Actual Result:** XSS payload stored verbatim in `profiles.full_name`
- **Impact:** If `full_name` is rendered anywhere without escaping (admin panel, user profiles), it will execute as JavaScript
- **Recommendation:**
  ```python
  # Add to UserAuth schema:
  @field_validator("full_name", mode="before")
  @classmethod
  def sanitize_name(cls, v: str | None) -> str | None:
      if v is None:
          return v
      import re
      v = re.sub(r'<[^>]+>', '', v)  # Strip HTML tags
      return v[:100].strip()
  ```

### SEC-009 — 🟡 MEDIUM: SQL Injection Patterns Accepted in `full_name`
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Signup with `full_name` = `' OR 1=1 --`
  2. Response: `{"msg":"User created successfully","user_id":"9a76da40-..."}`
- **Impact:** Low — Supabase uses parameterized queries, so SQL injection via ORM is not exploitable. But storing raw SQL patterns is a code smell.
- **Recommendation:** Add a regex validator to strip SQL-dangerous characters from `full_name`

### SEC-010 — ✅ PASS: Prompt Injection Defense
- **Tested:** `prompt_sanitizer.py` strips dangerous XML tags and natural language injection patterns
- **Patterns caught:**
  - `<RESUME_TEXT>`, `<JOB_DESCRIPTION>`, `<COVER_LETTER>`, etc.
  - "Ignore previous instructions", "You are now a different AI", etc.
- **Evidence:** Regex patterns in `_DANGEROUS_TAGS` and `_INJECTION_PATTERNS`
- **Rating:** ✅ Good — Covers common prompt injection vectors

### SEC-011 — ✅ PASS: File Upload Validation
- **Tested:** Resume upload validates:
  - Content-Type: `application/pdf` only (line 52)
  - File size: ≤5MB (both Content-Length and actual bytes, lines 54-65)
  - PDF magic bytes: `%PDF-` header check (line 66)
  - Max pages: 20 (line 74)
  - Max text: 100,000 chars (line 71)
  - Min text: 50 chars (line 90) — prevents image-only PDFs
- **Rating:** ✅ Excellent — Multi-layer validation

### SEC-012 — ✅ PASS: Input Length Limits on AI Fields
- **Tested:** Schema validation limits:
  - `job_description`: max 15,000 chars
  - `target_role`: max 200 chars (with regex validation `^[a-zA-Z0-9\\s\\-/&+.()\\u00C0-\\u024F]+$`)
  - `user_answer`: max 10,000 chars
  - `company_name`: max 200 chars
  - `job_title`: max 200 chars
- **Rating:** ✅ Good — Prevents resource exhaustion on LLM calls

### SEC-013 — ✅ PASS: Body Size Limiting Middleware
- **Tested:** `BodySizeLimitMiddleware` rejects non-upload requests >1MB
- **Evidence:** `main.py` lines 92-119
- **Rating:** ✅ Good

---

## 2C. Authorization & Access Control

### SEC-014 — 🟡 HIGH: RLS Bypassed by Service Role Client
- **Severity:** High
- **Description:** The backend uses `SUPABASE_SERVICE_ROLE` for all database queries (`get_db()` function). The service role bypasses all Row-Level Security policies.
- **Impact:** RLS exists as defense-in-depth documentation, but is NOT actively protecting data. All access control relies on application-level `eq("user_id", ...)` checks.
- **Evidence:** `supabase.py` line 15: `settings.SUPABASE_SERVICE_ROLE`
- **Mitigating Factor:** All endpoints that access user-scoped data include explicit `user_id` filters
- **Recommendation:** Consider using the anon client + passing the user's JWT for data queries, keeping service_role only for admin/system operations. Or accept the current pattern but document it as a design decision.

### SEC-015 — 🟡 MEDIUM: Analysis History Query Missing `user_id` Filter
- **Severity:** Medium
- **Description:** `GET /analysis/history/{resume_id}` (line 208-209) queries `ai_analyses` by `resume_id` only, without `user_id` filter. While the resume ownership is checked first (defense-in-depth), this is inconsistent with other endpoints.
- **Steps to Reproduce:**
  1. Call `GET /analysis/history/{resume_id}` with a valid `resume_id` you own
  2. The query returns all analyses for that resume_id, regardless of `user_id` field in `ai_analyses`
- **Impact:** Low — resume ownership check prevents abuse, but if a resume_id is shared (unlikely), analyses from other users could leak
- **Recommendation:** Add `.eq("user_id", str(user.id))` to the `ai_analyses` query on line 208

### SEC-016 — ✅ PASS: Resume Ownership Checks
- **Tested:** All resume-related endpoints include `.eq("user_id", user.id)`:
  - `GET /resumes/{id}` — line 149
  - `DELETE /resumes/{id}` — line 163
  - `POST /analysis/match` — line 36
  - `POST /analysis/deep` — line 90
  - `POST /analysis/hiring-intel` — line 143
  - `POST /cover_letter/generate` — line 64
  - `POST /interview/start` — line 82
- **Rating:** ✅ Excellent — Consistent ownership checks

### SEC-017 — ✅ PASS: Admin Credit Grant Audit Logging
- **Tested:** Admin credit grants logged with `logger.warning("AUDIT: ...")` 
- **Evidence:** `admin.py` lines 262-270 and 304-310
- **Rating:** ✅ Good — Full audit trail

---

## 2D. Security Headers

### SEC-018 — ✅ PASS: Complete Security Headers
- **Tested via curl:**

| Header | Value | Status |
|--------|-------|--------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ...` | ✅ |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | ✅ |
| `X-Content-Type-Options` | `nosniff` | ✅ |
| `X-Frame-Options` | `DENY` | ✅ |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | ⚠️ See SEC-019 |
| `X-XSS-Protection` | `1; mode=block` | ✅ (legacy but harmless) |

### SEC-019 — 🔴 CRITICAL: Permissions-Policy Blocks Microphone for Voice Interview
- **Severity:** Critical (functional impact)
- **Description:** `Permissions-Policy: microphone=()` disables microphone access on all pages. The AI Mock Interview feature requires microphone access for voice answer submission.
- **Impact:** Voice interview feature is broken in production when served behind the backend's security headers (affects Render's header passthrough).
- **Recommendation:** Change to `microphone=(self)` to allow microphone access from the same origin:
  ```python
  response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
  ```
  Note: Since the frontend is on a different domain, you may need `microphone=*` or `microphone=(self "https://kareerist2026.vercel.app")`.

---

## 2E. Rate Limiting & DoS Protection

### SEC-020 — ✅ PASS: Rate Limiting Configuration

| Endpoint | Limit | Verified |
|----------|-------|----------|
| Auth (login/signup) | 5/minute | ✅ Confirmed (429 after 5 requests) |
| Resume Upload | 5/day | ✅ Code verified |
| ATS Score | 5/hour | ✅ Code verified |
| Deep Analysis | 5/hour | ✅ Code verified |
| Cover Letter | 5/hour | ✅ Code verified |
| Interview Start | 5/hour | ✅ Code verified |
| Interview Submit | 15/minute | ✅ Code verified |

### SEC-021 — ✅ PASS: Redis-Backed Rate Limiting
- **Tested:** Rate limits use Redis (Upstash) as storage backend
- **Evidence:** `rate_limit.py` lines 62-85 — hard fails in production if Redis is localhost
- **Rating:** ✅ Excellent — Survives restarts, shared across workers

### SEC-022 — ✅ PASS: Resume Count Cap
- **Tested:** `MAX_RESUMES_PER_USER = 20` enforced per user
- **Evidence:** `resumes.py` lines 25-36
- **Rating:** ✅ Good — Prevents storage abuse

---

## 2F. Data Privacy & Secret Management

### SEC-023 — 🔴 CRITICAL: Backend `.env` File With All Secrets
- **Severity:** Critical
- **Description:** The file `backend/app/.env` contains all production secrets:
  - `SUPABASE_SERVICE_ROLE` (full admin access to database)
  - `SUPABASE_JWT_SECRET`
  - `GROQ_API_KEY`
  - `OPENROUTER_API_KEY`
  - `HUGGINGFACE_API_KEY`
  - `REDIS_URL` with password
  - `SENTRY_DSN`
- **Impact:** Anyone with repo access has full control over the database, AI services, and infrastructure
- **Mitigating Factor:** File is in `.gitignore` and NOT tracked by git (verified with `git ls-files --cached`)
- **Recommendation:**
  1. ✅ Already not tracked in git (good)
  2. Rotate ALL keys immediately if this file was ever committed
  3. Add `backend/app/.env` to repo root `.gitignore` explicitly (currently relies on pattern matching)
  4. Use a secrets manager (Vault, Doppler, Vercel/Render env vars only)

### SEC-024 — ✅ PASS: Supabase Anon Key in Frontend (Expected)
- **Tested:** The Supabase anon key is present in the compiled frontend JS bundle
- **Impact:** None — anon keys are designed to be public. The service_role key is NOT exposed.
- **Rating:** ✅ Expected behavior

### SEC-025 — ✅ PASS: Error Messages Don't Leak System Info
- **Tested:** Failed login → `{"detail":"Invalid credentials"}` (no stack trace)
- **Tested:** No auth → `{"detail":"Not authenticated"}` (generic message)
- **Rating:** ✅ Good

### SEC-026 — 🟡 HIGH: OAuth Error Leaks Internal Details
- **Severity:** High
- **Description:** `auth.py` line 164: `detail=f"Invalid or expired OAuth code: {str(e)}"`
  The raw exception message `str(e)` is returned to the client, which could leak:
  - Internal URLs
  - API response details
  - Stack trace fragments
- **Recommendation:** Replace with a generic message:
  ```python
  raise HTTPException(status_code=401, detail="OAuth authentication failed. Please try again.")
  ```

---

## 2G. Third-Party Security

### SEC-027 — ✅ PASS: Sentry PII Configuration
- **Tested:** `send_default_pii=False` in Sentry init (`main.py` line 37)
- **Rating:** ✅ Good — No PII sent to error monitoring

### SEC-028 — ✅ PASS: Production Configuration Validator
- **Tested:** `Settings._check_production_security()` validates:
  - `COOKIE_SECURE` must be True in production
  - `CORS_ORIGINS` must not contain `*` in production
- **Rating:** ✅ Excellent — Fail-fast at startup for misconfiguration

---

## 2H. Blog Security

### SEC-029 — 🟡 HIGH: Blog RLS Allows Anonymous Write Access
- **Severity:** High
- **Description:** Per changelog: "RLS allowing anon read + write (for admin panel)". The blog admin panel is only password-protected client-side, but the Supabase `blog_posts` table allows anonymous INSERT/UPDATE.
- **Impact:** Anyone with the Supabase URL and anon key can create, modify, or delete blog posts directly via the Supabase REST API.
- **Recommendation:**
  1. Use a service_role key in a backend API for blog post management
  2. Or add RLS policies that check for an admin JWT
  3. Client-side password protection is NOT sufficient security

---
