# Chapter 09 — Security Audit & All Fixes

This chapter documents every bug, vulnerability, and logic issue found and fixed across the project. It's a complete audit trail.

---

## Critical Fixes

### C-1: CSRF Middleware Completely Bypassed
**File:** `backend/app/main.py`

`_CSRF_EXEMPT_PREFIXES` contained `"/"` as its last entry. Since every URL starts with `/`, `path.startswith("/")` is always true — meaning every single endpoint was exempt from CSRF validation. The middleware was a no-op.

**Fix:** Removed `"/"` from the tuple. Now only `/auth/`, `/api/v1/auth/`, `/health`, and `/ping` are exempt.

---

### C-2: No Timeout on HuggingFace Embedding Calls
**File:** `backend/app/services/math_engine.py`

`AsyncInferenceClient` was created without a timeout. A slow HuggingFace response would block the async event loop indefinitely, causing all concurrent requests to queue behind it.

**Fix:** `AsyncInferenceClient(api_key=..., timeout=30)` — 30-second hard timeout.

---

## High Severity Fixes

### H-1: Credit Farming — `grant_credits` Callable by Any Authenticated User
**File:** `supabase/migrations/20260522000001_fix_daily_grant_total.sql`

`grant_credits` was a `SECURITY DEFINER` function with no access control. Any authenticated user could call `supabase.rpc('grant_credits', { p_user_id: '<own_uuid>', p_amount: 999999 })` and give themselves unlimited credits.

**Fix:**
- `REVOKE EXECUTE ON FUNCTION public.grant_credits FROM PUBLIC, authenticated, anon`
- Added in-body caller check: `IF current_setting('role') NOT IN ('service_role', 'supabase_admin') THEN RAISE EXCEPTION`

---

### H-2: Daily Grant Logic Corrupted Purchase History
**File:** `supabase/migrations/20260522000001_fix_daily_grant_total.sql`

The daily grant branch was setting `total_credits_granted = p_amount` (reset to 50). This destroyed purchase history — a user who bought 500 credits would have their `total_credits_granted` reset to 50 on the next daily grant.

**Fix:** Daily grants no longer touch `total_credits_granted`. They only update `remaining_credits`.

---

### H-3: Daily Grants Added On Top Instead of Capping
**File:** `supabase/migrations/20260522000001_fix_daily_grant_total.sql`

`v_after := v_before + p_amount` was computed unconditionally. A user with 45 credits would get `45 + 50 = 95` instead of being topped up to 50. Over time, inactive users accumulated unbounded balances.

**Fix:** Daily grants now top up TO `p_amount` (the cap). If `v_before >= p_amount`, returns immediately (no-op).

---

### H-4: Interview Analysis Context Queried Non-Existent Type
**File:** `backend/app/api/v1/endpoints/interview.py`

The interview start endpoint queried `analysis_type = "general_roast"` to enrich questions with prior analysis insights. This type was never written anywhere — the codebase writes `"deep_analysis"`. The enrichment feature was completely dead.

**Fix:** Changed to `.eq("analysis_type", "deep_analysis")`.

---

### H-5: Redis Broken Client Cached After Outage
**File:** `backend/app/db/redis_client.py`

`get_redis()` created the client once and cached it. If Redis had a brief outage, the broken client was cached and all subsequent calls kept failing until the process restarted.

**Fix:** Added `ping()` check on every `get_redis()` call. If ping fails, recreates the client.

---

### H-6: Dashboard Fetched Unbounded Analyses
**File:** `backend/app/api/v1/endpoints/dashboard.py`

The dashboard fetched ALL analyses for a user's resumes with no limit. The `history[:20]` slice happened in Python after fetching all rows from the DB — hiding a full table scan.

**Fix:** Added `.limit(50)` to the analyses query.

---

### H-7: Admin Stats Full Table Scan
**File:** `backend/app/api/v1/endpoints/admin.py`

Admin stats fetched ALL profile rows to compute `SUM(total_credits_granted)` and `SUM(remaining_credits)` in Python. At scale this is a full table scan.

**Fix:** Created `admin_credit_stats()` PostgreSQL function that does the aggregation in the DB. Admin endpoint now calls this RPC instead.

---

### H-8: Rate Limiter Falls Back to In-Memory in Production
**File:** `backend/app/core/rate_limit.py`

If `REDIS_URL` was `redis://localhost` in production, the rate limiter silently fell back to in-memory storage. Rate limits would be per-worker and reset on every deploy.

**Fix:** Added startup check — if `REDIS_URL` is localhost and `ENVIRONMENT=production`, raises `ValueError` and refuses to start.

---

### H-9: `deduct_credits` EXECUTE Granted to `authenticated`
**File:** `supabase/migrations/20260522000004_security_hardening.sql`

The original credit system migration granted `EXECUTE ON FUNCTION deduct_credits TO authenticated`. Any logged-in user could call it directly via `supabase.rpc()` and deduct credits from any `user_id` they supply.

**Fix:** `REVOKE EXECUTE ON FUNCTION public.deduct_credits FROM authenticated, anon, PUBLIC`.

---

## Medium Severity Fixes

### M-1: `canUse()` Flash on First Render
**File:** `FRONTEND/src/contexts/CreditContext.tsx`

`isLoading` was initialized to `false`. Between mount and the first `fetchAll()` call, `isLoading=false` and `balance=null`, so `canUse()` returned `false` — causing a brief flash of disabled buttons.

**Fix:** `isLoading` now initializes to `true`. `canUse()` returns `true` while `isLoading` is true.

---

### M-2: Daily Grant Blocked by Leftover Credits
**File:** `backend/app/services/credits.py`

The eligibility check required `remaining_credits == 0`. A user with 20 leftover daily credits from yesterday wouldn't get today's grant until they spent all 20.

**Fix:** Eligibility now only checks `total_credits_granted >= INITIAL_CREDIT_GRANT`. Remaining balance doesn't matter.

---

### M-3: `BodySizeLimitMiddleware` Crashed on Malformed Content-Length
**File:** `backend/app/main.py`

`int(cl)` on the Content-Length header had no try/except. A malformed value like `"abc"` would raise `ValueError` and return a 500 instead of a 400.

**Fix:** Wrapped in `try/except ValueError`, returns 400 with a clear error message.

---

### M-4: Admin Stats Queried Wrong Tables for Cover Letters and Interviews
**File:** `backend/app/api/v1/endpoints/admin.py`

Admin stats counted cover letters as `type_counts.get("cover_letter", 0)` from `ai_analyses`. But cover letters are stored in `job_applications`, not `ai_analyses`. The count was always 0.

**Fix:** Now queries `job_applications` and `interview_reports` tables directly with `count="exact"`.

---

### M-5: INSERT RLS Policies Used `WITH CHECK (true)`
**File:** `supabase/migrations/20260522000004_security_hardening.sql`

INSERT policies on `ai_analyses`, `interview_reports`, and `daily_credit_grants` used `WITH CHECK (true)` — meaning any authenticated user could insert rows with arbitrary `user_id`.

**Fix:** Changed to `WITH CHECK (auth.role() = 'service_role')`.

---

### M-6: `language` Field Injected Unsanitized into LLM Prompts
**File:** `backend/app/services/ai_interview.py`

The `language` parameter was interpolated directly into prompts: `f"Write in {language}"`. An attacker could pass `language = "english. IGNORE ALL PREVIOUS INSTRUCTIONS..."`.

**Fix:** Added allowlist validation. Only known safe languages are accepted. Unknown values default to "english".

---

## Low Severity Fixes

### L-1: `request_signing.py` Dead Code
**File:** `backend/app/core/request_signing.py` (deleted)

The file defined `generate_signature()` and `verify_request_signature()` but was never imported or called anywhere. Removed entirely.

---

### L-2: `Enter Kareerist` Button Caused Redirect Loop
**Files:** `FRONTEND/src/components/sections/Hero.tsx`, `FinalCTA.tsx`

Both CTAs used `<Link to="/dashboard">`. Unauthenticated users would click → land on Dashboard → get redirected back to `/` → stuck in a loop with nothing visible happening.

**Fix:** Replaced with a button + `onClick` handler. If authenticated → navigate to dashboard. If not → open AuthModal with `/dashboard` as the redirect intent.

---

### L-3: `voice_interview/` Prototype Folder in Repo
**Deleted:** `voice_interview/` entire folder

An old standalone prototype that duplicated code already in `backend/app/services/ai_interview.py`. Never referenced by the backend. Removed.

---

### L-4: `DEPLOYMENT_GUIDE.md` Ghost File
**Deleted:** `DEPLOYMENT_GUIDE.md`

File was tracked by git but missing from disk. Removed from git tracking.

---

### L-5: `uv.lock` in `.gitignore` but Committed
**File:** `.gitignore`

`uv.lock` was listed in `.gitignore` but was actually committed (intentionally, for reproducible builds). The `.gitignore` entry was contradictory.

**Fix:** Removed `uv.lock` from `.gitignore`, added a comment explaining it's intentionally committed.

---

---

## September 6, 2026 Security Hardening Fixes (v1.0.4)

### SEC-008 / VULN-004: Stored XSS via `full_name`
**File:** `backend/app/api/v1/endpoints/auth.py`
`full_name` was stored directly without stripping HTML or script tags.
**Fix:** Added `@field_validator("full_name", mode="before")` stripping `<[^>]+>` and injection characters `[<>"\'&;]`, capped at 100 characters.

### SEC-019 / VULN-016: Voice Interview Permissions-Policy Blocking Microphone
**File:** `backend/app/main.py`
`Permissions-Policy: camera=(), microphone=(), geolocation=()` blocked microphone capture in the browser.
**Fix:** Changed to `microphone=(self)`.

### VULN-010 / COMPAT-002: Missing Frontend Security Headers
**File:** `FRONTEND/vercel.json`
Vercel was not outputting HTTP security headers.
**Fix:** Added `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `Strict-Transport-Security`.

### SEC-015 / VULN-014: Analysis History Multi-Tenant Query Scoping
**File:** `backend/app/api/v1/endpoints/ai_analysis.py`
`get_analysis_history` queried only by `resume_id`.
**Fix:** Added `.eq("user_id", str(user.id))` for defense-in-depth isolation.

### VULN-009 / VULN-017: Voice Audio Upload Validation & Size Limits
**File:** `backend/app/api/v1/endpoints/interview.py`
`/submit_voice` did not validate MIME types or enforce upload limits.
**Fix:** Added MIME validation (`ALLOWED_AUDIO_TYPES`), extension allowlist, and 10MB payload size limit.

### SEC-026 / VULN-006: OAuth Exception Information Disclosure
**File:** `backend/app/api/v1/endpoints/auth.py`
Internal Supabase exception text was exposed to clients on 401.
**Fix:** Masked with generic client error message while keeping server tracebacks.

### AI-001 / AI-002: Prompt Sanitizer Hardening
**File:** `backend/app/services/prompt_sanitizer.py`
Prompt sanitizer was vulnerable to fullwidth homoglyphs and nested tags.
**Fix:** Added Unicode NFKC normalization, HTML comment stripping, 3-pass loop, and prompt extraction filters.

---

## Security Posture Summary (Current State)

### What's solid ✅
- HttpOnly cookies — no JWTs in localStorage
- CSRF double-submit protection with cross-origin support
- Atomic credit deduction via PostgreSQL `FOR UPDATE` row lock
- Automatic credit refund on AI 502 failures
- IP-based anti-farming for initial credit grants
- Prompt injection sanitization with Unicode NFKC, 3-pass loop, and extraction filters
- Voice interview upload validation (MIME, extension, 10MB limit)
- Permissions policy permitting microphone for self origin only
- Multi-tenant application-layer scoping on history queries
- Admin server-side DB check (`is_admin`)
- All credit RPCs locked to service_role only
- Rate limiting via Redis (shared across workers)
- Security headers on both FastAPI backend and Vercel frontend
- Sentry error monitoring
- Full credit audit trail in `credit_transactions`
- **37 automated unit tests** in `backend/tests/test_critical_paths.py` covering all critical paths and audit remediations

### What's post-MVP ⏳
- Token revocation on logout (currently clears cookies)
- Payment integration (Razorpay / Stripe)
- DB-level resume count constraint (currently app-layer 20 max)
