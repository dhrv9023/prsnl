# Changelog

All notable changes to Kareerist are documented here.

## [Unreleased]

---

## [1.0.5] - September 9, 2026 — Production Launch Readiness, SEO, Admin Telemetry & Security Hardening

### Added & Enhanced

- **Frontend Secret Exposure Protection**
  - Added [FRONTEND/.env.example](file:///home/dhruv/Nextcloud/kareerist/prsnl/FRONTEND/.env.example) documenting allowable public client variables with security warnings.
  - Implemented build-time Vite plugin guard in [FRONTEND/vite.config.ts](file:///home/dhruv/Nextcloud/kareerist/prsnl/FRONTEND/vite.config.ts) that halts the build if any server secret or service role pattern is prefixed with `VITE_`.

- **Reverse-Proxy HTTPS Enforcement & HSTS**
  - In [backend/app/main.py](file:///home/dhruv/Nextcloud/kareerist/prsnl/backend/app/main.py), updated `SecurityHeadersMiddleware` with `x-forwarded-proto` proxy detection, 301 HTTPS redirects for non-secure production traffic, and HSTS headers (`max-age=31536000; includeSubDomains; preload`).

- **GDPR/CCPA Cookie Consent Manager**
  - Implemented [CookieConsent.tsx](file:///home/dhruv/Nextcloud/kareerist/prsnl/FRONTEND/src/components/ui/CookieConsent.tsx) providing "Accept All", "Essential Only", and customizable privacy preferences.
  - Persisted consent state in `localStorage` and added a "Cookie Preferences" trigger in the footer.

- **Dynamic Per-Route SEO & Schema.org JSON-LD**
  - Created [SEO.tsx](file:///home/dhruv/Nextcloud/kareerist/prsnl/FRONTEND/src/components/SEO.tsx) (`RouteSEOManager`) that synchronizes document titles, meta descriptions, canonical URLs, and Open Graph tags across every client route.
  - Added SoftwareApplication Schema.org JSON-LD structured data to [index.html](file:///home/dhruv/Nextcloud/kareerist/prsnl/FRONTEND/index.html).

- **Social Preview Assets (OpenGraph / Twitter Cards)**
  - Generated branded 1200×630 social preview images: `og-image.png` (99KB), `og-image.webp` (44KB), and `twitter-card.png`.
  - Configured OpenGraph and Twitter card image meta tags.

- **Sitemap Index & robots.txt Protection**
  - Added [sitemap.xml](file:///home/dhruv/Nextcloud/kareerist/prsnl/FRONTEND/public/sitemap.xml) with route priorities.
  - Configured [robots.txt](file:///home/dhruv/Nextcloud/kareerist/prsnl/FRONTEND/public/robots.txt) to protect `/admin`, `/dashboard`, `/credits`, `/interview/history`, and `/auth/callback` from bot indexing.

- **Image Compression & Responsive Loading**
  - Losslessly compressed public images using Pillow zlib level 9 and verified `loading="lazy"` / `decoding="async"` across all image tags.

- **WCAG 2.1 AA Color Contrast Compliance**
  - Bumped dark mode `--muted-foreground` to `40 6% 65%` in [index.css](file:///home/dhruv/Nextcloud/kareerist/prsnl/FRONTEND/src/index.css) (6.5:1 contrast against dark background).
  - Fixed low-contrast opacity classes across Navbar, Features, Dashboard, and AuthModal.

- **Form Validation & Inline Alerts**
  - Added client-side field validation, regex checks, and real-time inline alerts in [Contact.tsx](file:///home/dhruv/Nextcloud/kareerist/prsnl/FRONTEND/src/pages/Contact.tsx) and [AuthModal.tsx](file:///home/dhruv/Nextcloud/kareerist/prsnl/FRONTEND/src/components/ui/AuthModal.tsx).

- **Multi-Layer Spam & Bot Defense**
  - Added honeypot trap inputs, submission velocity checks (< 1.5s), client-side hourly submission limits (max 3/hr) in Contact form, and brute-force attempt throttling (30s cooldown after 5 failed attempts) in AuthModal.

- **Admin Telemetry & Analytics Dashboard**
  - Created [AdminAnalyticsView.tsx](file:///home/dhruv/Nextcloud/kareerist/prsnl/FRONTEND/src/components/admin/AdminAnalyticsView.tsx) and embedded a new **Analytics** tab in [AdminPage.tsx](file:///home/dhruv/Nextcloud/kareerist/prsnl/FRONTEND/src/pages/AdminPage.tsx).
  - Tracks user conversion funnel, feature distribution, DAU/WAU/MAU retention cohorts, credit economy burn rates, and one-click JSON telemetry export.

- **Unified Primary Call to Action**
  - Standardized the Navbar, Hero, and FinalCTA around **"Start Free Analysis"** with supporting trust microcopy (*"100 Free Credits on Signup • No Credit Card Required"*).

---

## [1.0.4] - September 6, 2026 — Security Hardening & Audit Remediations

### Fixed & Hardened (Security Audit)

- **Stored XSS Prevention in User Full Name (SEC-008 / VULN-004)**
  - Added `@field_validator("full_name", mode="before")` on `UserAuth` schema to strip all HTML tags (`<[^>]+>`) and dangerous injection characters (`[<>"\'&;]`), enforcing a maximum length of 100 characters.

- **FastAPI Voice Interview Permissions Policy (SEC-019 / VULN-016)**
  - Updated `Permissions-Policy` header in `SecurityHeadersMiddleware` from `microphone=()` to `microphone=(self)`, allowing browser microphone capture for voice interviews while continuing to block camera and geolocation.

- **Production Security Headers on Vercel Frontend (VULN-010 / COMPAT-002)**
  - Added HTTP security headers in `FRONTEND/vercel.json`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(self), geolocation=()`, and `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.

- **Multi-Tenant Data Isolation in Analysis History (SEC-015 / VULN-014)**
  - Added explicit `.eq("user_id", str(user.id))` filter to `get_analysis_history` in `ai_analysis.py`, providing defense-in-depth tenant isolation at the application layer in addition to Supabase RLS.

- **Voice Interview Audio Upload Validation (VULN-009 / VULN-017)**
  - In `interview.py:submit_voice_answer_route`, added MIME type checking against allowed audio formats (`audio/webm`, `audio/wav`, `audio/mp4`, `audio/ogg`, `audio/x-m4a`), file extension allowlist, and a strict 10MB file size limit to reject arbitrary or oversized file uploads.

- **OAuth Exception Masking (SEC-026 / VULN-006)**
  - In `auth.py:oauth_exchange_session`, masked internal Supabase exception details from the HTTP 401 response while preserving detailed debug tracebacks in server logs.

- **Humanize Request Payload Bounds (P1-3 / VULN-020)**
  - Added `Field(..., min_length=50, max_length=5000)` on `HumanizeRequest.text` to prevent empty requests or unbounded payloads causing LLM denial of service.

- **Prompt Sanitizer Hardening (AI-001 / AI-002)**
  - Added Unicode NFKC normalization in `prompt_sanitizer.py` to prevent homoglyph and fullwidth tag bypasses (e.g. `＜RESUME_TEXT＞`).
  - Added HTML comment stripping (`<!--.*?-->`) and multi-pass loop (up to 3 passes) to eliminate nested delimiter tags (e.g. `<RES<RESUME_TEXT>UME_TEXT>`).
  - Added system prompt extraction pattern filters against prompt-leak exploits.

- **Automated Test Suite Expansion**
  - Added Category 8 tests in `backend/tests/test_critical_paths.py` covering all new security remediations. Test suite now passes with 37/37 tests.

---

## [1.0.3] - September 6, 2026 — Bug Fix Release

### Fixed

- **Credit Refund on Deep Analysis Failure (Sep 6, 2026)**
  - Previously, if the Groq LLM timed out or returned a bad response during Deep Analysis,
    the endpoint raised HTTP 502 but credits were permanently deducted with no refund.
  - `ai_analysis.py` now calls `refund_feature_credits()` atomically before raising 502.
  - Users see a clear message: "Deep analysis failed — your credits have been refunded."
  - The refund is recorded in `credit_transactions` with `feature = "ai_failure_refund"`.

- **Credit Refund on Hiring Intel Failure (Sep 6, 2026)**
  - Same root cause as Deep Analysis — Hiring Intel (25 cr) deducted credits even on
    Groq failure/timeout, with no refund path.
  - `ai_analysis.py` now calls `refund_feature_credits()` before raising 502 in the
    `hiring_intelligence` endpoint.
  - Secondary effect: false "not enough credits" popup on retry is eliminated because
    the backend now correctly restores balance before the frontend re-fetches it.

- **Mobile Sign-In Background Scroll (Sep 6, 2026)**
  - On mobile browsers, touching the AuthModal backdrop caused the page behind it to
    scroll upward (background "lifting" during sign-in).
  - `AuthModal.tsx` now sets `document.body.style.overflow = "hidden"` on mount and
    restores it on unmount via a `useEffect` cleanup, preventing touch-scroll bleed-through.

### Improved

- **Hiring Intel Slow-Load UX (Sep 6, 2026)**
  - Hiring Intel can take 30–60s on Render free-tier due to LLM complexity + cold starts.
    Previously the button just spun with no feedback, giving a dead-hang impression.
  - `ResumeAnalysis.tsx` now sets a 45-second timeout that reveals an amber message:
    "⏳ Still working — Hiring Intel is thorough (30–60s). Hang tight…"
  - The message is automatically cleared when the call completes (success or failure).

- **`deductLocal()` now active (Sep 6, 2026)**
  - The optimistic credit deduction in `CreditContext.tsx` was previously a no-op
    (`const deductLocal = useCallback((_feature) => {}, [])`).
  - It is now functional: clicking a feature button immediately subtracts credits
    from the local displayed balance for instant UI feedback.
  - `refreshCredits()` is always called in the `finally` block to reconcile with
    the authoritative backend balance.


### Added
- **Admin User Activity Modal (May 29, 2026)** - Comprehensive user activity view
  - New `GET /admin/users/{id}/activity` endpoint returns all user activity across features
  - 5-tab modal: Resumes, Analyses, Interviews, Cover Letters, Credit Transactions
  - Last 20 items per feature with key metadata displayed
  - Accessible from admin panel user list via "View Activity" button
  - Helps admins quickly understand user engagement patterns

- **User Search in Admin Panel (May 29, 2026)** - Filter user list by email
  - Search input filters users client-side (email matching)
  - Instant search with debouncing
  - Clear button to reset search

- **Last Login Tracking (May 27, 2026)** - Activity monitoring for admin
  - New `last_sign_in_at` column in `profiles` table (migration 20260524000001)
  - Updated on every successful login and OAuth session
  - Admin user list sorted by last login (most recent first), null values at bottom
  - Enables admin to identify inactive users and engagement patterns

- **Interview Resume Tracking (May 24, 2026)** - Link interviews to source resumes
  - New `resume_id` column in `interview_reports` table (migration 20260524000002)
  - Stored on interview start, persisted in final report
  - Enables analysis of which resumes lead to better interview performance
  - Nullable for backward compatibility with old reports

### Fixed
- **CSRF Token Handling (May 23, 2026)** - Fixed production 403 errors in cross-origin setup
  - Backend now returns `csrf_token` in login/OAuth response body
  - Frontend stores token in memory + sessionStorage instead of relying on cross-origin cookies
  - CSRFMiddleware adds CORS headers to 403 responses for proper browser handling
  - Implements fallback chain: memory cache → sessionStorage → cookie (for dev)
  - See `CSRF_IMPLEMENTATION.md` for detailed documentation

- **Experience Level Validation (May 23, 2026)** - Fixed interview setup validation error
  - Frontend display values ("Fresher (0–1 yr)") now properly mapped to backend enum values ("fresher")
  - Updated `EXPERIENCE_LEVELS` to use `{ display, value }` pairs
  - Prevents "Input should be 'fresher', 'junior', 'mid' or 'senior'" error

- **Credit Display Logic (May 23, 2026)** - Clarified credit denominator display
  - Shows "remaining/100" during initial phase (total_granted = 100)
  - Switches to "remaining/50" once daily grants begin (total_granted > 100)
  - Properly reflects daily credit cap after initial grant exhaustion

- **Database Migrations (May 23, 2026)** - Consolidated migration cleanup
  - Deleted conflicting test/debug migrations
  - Created comprehensive fix migration (20260523000000_comprehensive_fix.sql)
  - Ensures proper permissions and INSERT policies for all tables

### Changed
- **Middleware Order** - CSRFMiddleware now properly adds CORS headers to error responses
  - Ensures browser doesn't block 403 responses with CORS policy errors
  - Allows frontend to see actual error messages instead of generic CORS errors

- **API Response Format** - Login/OAuth endpoints now include `csrf_token` in response body
  - Enables cross-origin CSRF protection without relying on cookie reading
  - Backward compatible: token also set as cookie for same-origin dev setups

### Added
- **CSRF Implementation Documentation** - New `CSRF_IMPLEMENTATION.md` file
  - Detailed explanation of double-submit cookie pattern
  - Cross-origin compatibility approach
  - Backend and frontend implementation details
  - Flow diagrams and troubleshooting guide

- **Changelog** - This file, tracking all notable changes

---

## [1.1.0] - May 24, 2026 — Kareerist Blog Launch

### Added
- **Standalone Blog** (`kareerist_blog/`) — Separate Vite + React + TypeScript project
  - Deployed at [kareerisit-blog.vercel.app](https://kareerisit-blog.vercel.app)
  - Own GitHub repo: `github.com/dhrv9023/kareerisit_blog`
  - Excluded from `prsnl` repo via `.gitignore`
- **Blog Features:**
  - Featured post (large hero card) + standard post grid (3-column)
  - Click any card → opens full article reader page (not modal)
  - Full article content with **bold** and bullet point rendering
  - Sticky nav bar with back button on article page
  - Smooth card hover animations
- **Password-Protected Admin Panel** (Ctrl+Shift+A)
  - Login screen with shake animation on wrong password
  - Session persisted in `localStorage` — stays logged in
  - Tabbed interface: Create Post / Manage Posts
  - Cover image live preview while typing URL
  - Post list with thumbnails and delete confirmation
  - Logout button
- **Content:** 5 launch posts from `BLOG_TOPICS.md` quick-win list:
  1. Why Your Resume Scores 45/100 on ATS (Featured)
  2. The 6 Interview Question Types You'll Face
  3. The 3-Paragraph Cover Letter Formula
  4. The College Student's Resume Guide
  5. Tech Resume Guide: Engineers, Data Scientists & DevOps
- **Supabase Integration:**
  - `blog_posts` table with RLS allowing anon read + write (for admin panel)
  - `content` column added for full article body
  - All 10 categories from `BLOG_TOPICS.md` available in admin

---



## [1.0.0] - May 22, 2026

### Added
- ✅ Full-stack AI career toolkit with 6 core features
- ✅ Email + Google OAuth authentication
- ✅ Resume upload and PDF parsing
- ✅ ATS scoring with/without job description
- ✅ Deep analysis with LLM feedback
- ✅ Hiring intelligence report (9-section recruiter perspective)
- ✅ AI mock interview with 6 questions (theory, MCQ, code)
- ✅ Voice interview support (Whisper STT)
- ✅ Cover letter generation and humanizer
- ✅ Credit-based usage system (100 free credits + 50 daily)
- ✅ Admin panel for user management and credit grants
- ✅ Interview history and dashboard
- ✅ Hinglish toggle for feedback
- ✅ Light/dark theme toggle
- ✅ Comprehensive error monitoring (Sentry)
- ✅ Rate limiting on all endpoints
- ✅ Row-level security (RLS) on user data
- ✅ Anti-farming IP-based deduplication
- ✅ Complete audit trail for credit transactions

### Security
- ✅ HttpOnly cookie-based authentication
- ✅ PKCE OAuth flow for Google
- ✅ Double-submit CSRF protection
- ✅ Row-level security (RLS) on all user-scoped tables
- ✅ Atomic PostgreSQL operations for credit system
- ✅ IP-based anti-farming for initial credit grants
- ✅ Complete transaction audit log
- ✅ Security headers (CSP, HSTS, X-Frame-Options, etc.)

### Infrastructure
- ✅ Frontend: React 18 + TypeScript + Vite on Vercel
- ✅ Backend: Python 3.13 + FastAPI on Render
- ✅ Database: Supabase PostgreSQL with Auth
- ✅ Cache: Redis/Upstash for rate limiting and sessions
- ✅ AI: Groq LLM + Whisper STT + HuggingFace embeddings
- ✅ Monitoring: Sentry for error tracking

### Testing
- ✅ 22 unit tests covering core functionality
- ✅ ATS scorer tests
- ✅ Credit system tests
- ✅ Auth tests
- ✅ Resume upload tests
- ✅ Security header tests

---

## Version History

| Version | Date | Status |
|---------|------|--------|
| 1.0.0 | May 22, 2026 | Released |
| 1.0.1 | May 23, 2026 | Released (CSRF + validation fixes) |
| 1.0.2 | May 24-29, 2026 | Released (Admin enhancements + tracking) |
| 1.0.3 | Sep 6, 2026 | Released (Credit refund on AI failure, mobile scroll fix, slow-load UX) |

---

## Known Issues

All bugs from September 6, 2026 report have been resolved:
- ~~Credits deducted on Deep Analysis failure~~ — Fixed in 1.0.3
- ~~Credits deducted on Hiring Intel failure~~ — Fixed in 1.0.3
- ~~Mobile sign-in background scrolls~~ — Fixed in 1.0.3
- ~~Hiring Intel dead-hang (no UX feedback)~~ — Fixed in 1.0.3

---

## Future Roadmap

- [ ] Payment integration (Stripe)
- [ ] Resume templates
- [ ] Job board integration
- [ ] LinkedIn profile import
- [ ] Interview video recording
- [ ] Peer review system
- [ ] Mobile app (React Native)
- [ ] API for third-party integrations
