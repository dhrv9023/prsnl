# September 2026 Updates Summary (v1.0.3 & v1.0.4)

[← Back to Documentation Hub](../README.md) · [← History Index](./INDEX.md)

---

## Overview

In September 2026, Kareerist underwent two major upgrade cycles:
1. **v1.0.3 Bug Fix Release:** Implemented automated credit refunds on AI failure, fixed mobile background scroll bleed-through on auth modals, and added slow-loading status indicators.
2. **v1.0.4 Security Hardening & Repository Restructuring:** Completed comprehensive QA pentest audit remediations, expanded the automated test suite to 37 passing unit tests, and restructured the monorepo into a unified documentation hub under `docs/`.

---

## 1. Bug Fixes & UX Enhancements (v1.0.3)

### A. Credit Refund on Deep Analysis & Hiring Intel Failure
- **Problem:** If Groq LLM timed out (>45s) or returned invalid JSON during Deep Analysis (15 credits) or Hiring Intel (25 credits), the backend raised HTTP 502, but credits were permanently deducted from the user's balance.
- **Fix:** In `ai_analysis.py`, added atomic `refund_feature_credits()` calls before raising HTTP 502. If an AI call returns `None`, credits are immediately restored to the user's balance, and a transaction is recorded with `feature = "ai_failure_refund"`.
- **Secondary Effect:** Eliminated false "Not enough credits" popups on subsequent retry attempts because the balance is properly restored before the frontend queries it.

### B. Mobile Sign-In Background Scroll Lock
- **Problem:** On iOS Safari and mobile Chrome, touching the AuthModal backdrop caused the background webpage behind the modal to scroll upward.
- **Fix:** In `AuthModal.tsx`, added a `useEffect` hook that sets `document.body.style.overflow = "hidden"` on mount and restores the original value on unmount, preventing touch-scroll bleed-through.

### C. Hiring Intel Slow-Loading UX Warning
- **Problem:** Hiring intelligence generation takes 30–60s on Render free-tier due to prompt complexity and cold starts, leading users to believe the app had frozen.
- **Fix:** In `ResumeAnalysis.tsx`, added a 45-second timer that displays an amber warning message beneath the button: *"⏳ Still working — Hiring Intel is thorough (30–60s). Hang tight..."* Cleared automatically upon request completion.

---

## 2. Security Hardening & Audit Remediations (v1.0.4)

### A. Stored XSS Prevention in Profile Full Name (SEC-008 / VULN-004)
- Added `@field_validator("full_name", mode="before")` on `UserAuth` schema to strip all HTML tags (`<[^>]+>`) and dangerous injection characters (`[<>"\'&;]`), capping the length at 100 characters.

### B. Voice Interview Permissions Policy (SEC-019 / VULN-016)
- Updated `Permissions-Policy` header in FastAPI `SecurityHeadersMiddleware` from `microphone=()` to `microphone=(self)`, allowing browser microphone capture during AI mock interviews while blocking camera and geolocation.

### C. Edge Security Headers on Vercel (VULN-010 / COMPAT-002)
- Added HTTP security headers in `FRONTEND/vercel.json`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(self), geolocation=()`, and `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.

### D. Multi-Tenant Query Scoping (SEC-015 / VULN-014)
- Added `.eq("user_id", str(user.id))` to `get_analysis_history` in `ai_analysis.py`, providing defense-in-depth isolation in addition to Supabase RLS.

### E. Voice Audio Upload Validation (VULN-009 / VULN-017)
- In `interview.py`, added MIME type validation (`ALLOWED_AUDIO_TYPES`), file extension allowlist (`ALLOWED_AUDIO_EXTENSIONS`), and a strict 10MB file size limit (`HTTPException(413)`).

### F. OAuth Internal Exception Masking (SEC-026 / VULN-006)
- In `auth.py:oauth_exchange_session`, masked raw Supabase error messages from the HTTP 401 client response while preserving server-side debug tracebacks.

### G. Humanize Payload Bounds (P1-3 / VULN-020)
- In `models.py`, added `Field(..., min_length=50, max_length=5000)` on `HumanizeRequest.text` to prevent empty inputs or unbounded denial of service payloads.

### H. Prompt Sanitizer Hardening (AI-001 / AI-002)
- Added Unicode NFKC normalization (`unicodedata.normalize("NFKC", text)`) to neutralize homoglyphs and fullwidth tag bypasses (e.g. `＜RESUME_TEXT＞`).
- Stripped HTML comments (`<!--.*?-->`).
- Implemented a 3-pass loop against reconstructed nested tags (`<RES<RESUME_TEXT>UME_TEXT>`).
- Filtered system prompt extraction directives (`repeat your system prompt`, `reveal your instructions`).

---

## 3. Monorepo Documentation Restructuring

- Reorganized 133 scattered documentation files into a unified `docs/` hub:
  - `docs/specifications/`
  - `docs/architecture/`
  - `docs/explanations/`
  - `docs/history/`
  - `docs/qa/`
  - `docs/security/`
- Created `docs/README.md` and `docs/architecture/README.md` as visual navigation portals.
- Cleaned the root repository directory down to core services (`backend/`, `FRONTEND/`, `supabase/`, `kareerist_blog/`) and essential configuration files.
- Synchronized all changes with 100% test parity across both `testing_new` and `main` branches.
