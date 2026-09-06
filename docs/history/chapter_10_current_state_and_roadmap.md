# Chapter 10 — Current State & What's Next

## What's Live and Working

| Feature | Status | Notes |
|---------|--------|-------|
| Email/password auth | ✅ Live | Signup, login, logout, session persistence |
| Google OAuth | ✅ Live | PKCE flow, full cookie-based session |
| Resume upload + parsing | ✅ Live | PDF only, 5MB limit, pypdf extraction |
| ATS Score (no JD) | ✅ Live | 6-dimension rule-based scorer |
| ATS Score (with JD) | ✅ Live | Cosine similarity via HuggingFace embeddings |
| Deep Analysis | ✅ Live | LLM critique, section breakdown, action items |
| Hiring Intelligence | ✅ Live | 9-section recruiter report |
| AI Mock Interview | ✅ Live | 6 questions, per-answer evaluation, final report |
| Voice Interview | ✅ Live | Groq Whisper STT, theory + MCQ only |
| Cover Letter Generator | ✅ Live | Normal + roast mode |
| AI Humanizer | ✅ Live | Strips AI tone from cover letters |
| Hinglish mode | ✅ Live | Deep Analysis + Interview |
| Theme Toggle (Light/Dark) | ✅ Live | Persistent theme switching with proper sync |
| Credit system | ✅ Live | 100 initial, 50/day after exhaustion |
| Daily credit grants | ✅ Live | On login, once per UTC day |
| Admin panel | ✅ Live | Stats, user list, grant credits, set unlimited |
| Admin login tracking | ✅ Live | `last_sign_in_at` per user, updated every login |
| Interview history | ✅ Live | Persisted to Supabase, viewable in UI, resume-filtered |
| Dashboard | ✅ Live | Restructured: Improvement Tracker at top, resume-scoped history |
| Sentry monitoring | ✅ Live | Backend + frontend error tracking |
| Rate limiting | ✅ Live | Redis-backed, per (IP, user) composite key |

---

## Architecture Decisions That Worked Well

**HttpOnly cookies + CSRF double-submit:** More complex to implement than localStorage JWTs, but significantly more secure. The CSRF implementation is now correct and battle-tested.

**PostgreSQL `FOR UPDATE` for credit deduction:** Prevents race conditions completely. Two concurrent requests can't both pass the balance check and double-spend. The database handles the locking.

**Redis for interview sessions:** The 45-minute TTL auto-cleans abandoned sessions. Sessions survive server restarts. Multiple Uvicorn workers share the same session state.

**Groq over OpenRouter:** The speed difference is noticeable. LLM responses come back in 2-5 seconds on Groq vs 10-20 seconds on shared OpenRouter infrastructure.

**Prompt sanitization as a shared service:** `prompt_sanitizer.py` is imported by every AI service. Adding a new injection pattern in one place protects all features.

---

## Decisions That Caused Problems (and How They Were Fixed)

**`"/"` in CSRF exempt prefixes:** A single character that made the entire CSRF middleware a no-op. Lesson: test security middleware explicitly, don't assume it works.

**Daily grant logic:** The original implementation reset `total_credits_granted` to 50 on every daily grant, destroying purchase history. And it added credits on top instead of capping. Both bugs were in the same function. Lesson: credit system logic needs careful review — the consequences of bugs are financial.

**`general_roast` analysis type:** The interview enrichment feature queried a type that was never written. The feature was silently broken for months. Lesson: test that features actually work end-to-end, not just that they don't crash.

**`Enter Kareerist` redirect loop:** A `<Link>` component that caused a silent redirect loop for unauthenticated users. Lesson: test the unauthenticated user flow explicitly.

**Theme toggle sync issue:** `theme-init.js` defaulted to light mode while `theme-toggle.tsx` defaulted to dark mode. This caused the theme toggle button to not work properly — clicking it wouldn't switch themes because the initial states were mismatched. Fixed by making both files consistently default to dark mode. Lesson: when you have multiple files handling the same state, they must have identical default behavior.

**Credits lost on AI failure (Sep 6, 2026):** Both Deep Analysis (15 cr) and Hiring Intel (25 cr) endpoints deducted credits before calling the LLM, but if `generate_deep_analysis()` or `generate_hiring_intel()` returned `None` (Groq timeout, rate limit, JSON parse failure), the endpoint raised HTTP 502 without calling `refund_feature_credits()`. Users lost credits they paid for, with no indication they'd be refunded. The fix: call `refund_feature_credits(supabase, user_id, feature, cost)` in the `if not result:` branch before raising 502. The error message now explicitly says "your credits have been refunded." Lesson: when credits are deducted before a fallible operation, every failure path must include a refund.

**Mobile sign-in background scroll (Sep 6, 2026):** `AuthModal.tsx` renders via `createPortal` with a `fixed inset-0` backdrop, but didn't lock `document.body.overflow`. On iOS/Android, touching the backdrop caused the landing page to scroll upward behind the modal. Fixed by adding a `useEffect` that sets `document.body.style.overflow = 'hidden'` on mount and restores it on unmount. Lesson: `position: fixed` alone does not prevent touch-scroll bleed-through on mobile browsers.

**`deductLocal` was a silent no-op (Sep 6, 2026):** `CreditContext.tsx` had `const deductLocal = useCallback((_feature) => {}, [])` — the function accepted a feature but did nothing. This meant the optimistic credit deduction described in code comments and documentation never actually happened. The balance appeared to not update until `refreshCredits()` completed. Fixed by implementing the actual subtraction logic. Lesson: document the intended behaviour of no-op stubs so they don't get shipped as permanent features.

---

## Current Limitations

**Render free tier cold starts:** The backend spins down after 15 minutes of inactivity. First request takes 20-30 seconds. UptimeRobot / cron-job.org pinging every 10 minutes mitigates this but doesn't eliminate it. Hiring Intel (the longest-running endpoint at 30–60s) now shows a "⏳ Still working…" amber message after 45 seconds so users don't think it has crashed.

**No payment integration:** Credits are free (100 initial + 50/day). There's no way to purchase more credits yet. The credit system is fully built and ready for payment integration — it just needs a payment provider (Razorpay, Stripe) wired up.

**Resume count limit is app-layer only:** The 20-resume limit per user is enforced in the FastAPI code, not at the database level. A direct database insert could bypass it.

---

## What's Post-MVP

| Feature | Priority | Notes |
|---------|----------|-------|
| Payment integration | High | Razorpay or Stripe, credit top-up packages |
| Automated test suite | Done ✅ | 37 tests in `backend/tests/test_critical_paths.py` (100% passing) |
| Token revocation on logout | Medium | Use Supabase Admin API to invalidate specific session |
| Career Roadmaps | Medium | Personalized career growth planning |
| Resume Template Generator | Medium | Generate polished resume templates |
| Job Tracker | Low | Track job applications |
| AI Project Recommender | Low | Portfolio project ideas |
| 24x7 AI Chatbot | Low | Always-on career assistant |
| DB-level resume count constraint | Low | Trigger or check constraint |
| Pagination on admin users list | Low | Currently fetches all users |

---

## Repository Structure (Clean Monorepo)

```
prsnl/
├── backend/                    ← FastAPI application, routers, services & 37 unit tests
├── FRONTEND/                   ← React 18 + TypeScript + Vite frontend application
├── supabase/                   ← PostgreSQL migrations & schemas
├── kareerist_blog/             ← Standalone blog micro-frontend subproject
├── docs/                       ← Centralized Documentation Hub
│   ├── README.md               ← Navigation portal
│   ├── specifications/         ← Master project spec & AI handoff
│   ├── architecture/           ← 12 flowcharts & interactive HTML viewer
│   ├── explanations/           ← Deep-dive code walkthroughs
│   ├── history/                ← Development evolution (Chapters 1–12)
│   ├── qa/                     ← 10-part QA audit & pentest reports
│   └── security/               ← CSRF & security guides
├── CHANGELOG.md                ← Release version notes
├── README.md                   ← Public-facing project README
├── run.sh                      ← Local dev launcher (Linux/WSL)
└── .gitignore                  ← Clean ignore rules
```

---

## Key Numbers

- **10 SQL migrations** applied to production
- **20+ security/logic issues** found and fixed in the audits
- **6 AI features** live
- **100 free credits** on signup
- **50 credits/day** after initial exhaustion
- **4-day session** persistence
- **45-minute** interview session TTL in Redis
- **5MB** max resume upload size
- **6 questions** per interview (2 theory, 2 MCQ, 2 code)
- **37 automated tests** (100% passing in ~2s)

---

## Recent Changes (September 6, 2026 — Session 3)

### Bug Fixes (v1.0.3)
- Deep Analysis & Hiring Intel: credit refund on 502 LLM failure
- AuthModal: mobile touch-scroll background lock
- ResumeAnalysis: 45s slow-load status indicator for Hiring Intel

### Security Hardening (v1.0.4)
- Stored XSS prevention on `UserAuth.full_name`
- Voice interview Permissions-Policy allows `microphone=(self)`
- Frontend production security headers in `vercel.json`
- Multi-tenant query scoping on `get_analysis_history`
- Audio upload MIME validation and 10MB file size limit
- Masked internal OAuth exceptions on 401
- Pydantic payload bounds on `HumanizeRequest` (50–5000 chars)
- Hardened prompt sanitizer with NFKC normalization, comment stripping, and 3-pass loop
- Added Category 8 tests in `test_critical_paths.py` (total 37 passing)
- Monorepo documentation consolidation under `docs/` hub

---

## Older Changes (May 24, 2026 — Session 2)

### Admin
- Added `last_sign_in_at` tracking — updates on every email + OAuth login
- Admin panel shows "Joined X ago" + "Last login: X ago" per user

### Dashboard UX
- **Improvement Tracker** promoted to top of dashboard (was at bottom)
- **Career Intelligence tip** now shows recruiter's first impression (not a duplicate of the tracker)
- **Analysis History** now filtered by selected resume + collapsible (5 items, with "View past" link)
- **Interview History** now filtered by selected resume
- **timeAgo** function fixed for UTC normalization and readable labels

### UI
- Green rewrite boxes in Improvement Tracker now legible in light mode
- Contact page: phone number removed

### Backend
- Interview `resume_id` now saved to `interview_reports` table
- `GET /interview/history` returns `resume_id`

### Pending Migrations
```sql
-- Run both in Supabase SQL Editor:
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS profiles_last_sign_in_at_idx
    ON public.profiles (last_sign_in_at DESC NULLS LAST);

ALTER TABLE public.interview_reports
    ADD COLUMN IF NOT EXISTS resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL;
```
