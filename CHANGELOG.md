# Changelog

All notable changes to Kareerist are documented here.

## [Unreleased]

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
