# Changelog

All notable changes to Kareerist are documented here.

## [Unreleased]

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

---

## Known Issues

None currently tracked. Please report issues via GitHub.

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
