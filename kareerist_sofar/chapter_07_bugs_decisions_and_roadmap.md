# Chapter 7 — Bugs Fixed, Decisions Made & What's Next

## Part A: Major Bugs & Fixes Log

---

### Bug 1: Backend ECONNREFUSED on OAuth Callback
**Symptom**: Google OAuth login failed. Frontend callback page got `ECONNREFUSED` when POSTing to `/api/v1/auth/oauth/session`.

**Root Cause**: The Vite proxy target was hardcoded to `http://localhost:8000`. In WSL2, `localhost` from a Windows Node process doesn't always resolve to the WSL network interface.

**Fix**: `run.sh` detects the WSL IP (`hostname -I`) and writes it to `FRONTEND/.env.local` as `VITE_WSL_IP`. `vite.config.ts` reads this and sets the proxy target dynamically.

---

### Bug 2: CSRF Middleware Breaking All Requests
**Symptom**: After adding a custom CSRF `Origin` header validator middleware, all API requests started failing with 403.

**Root Cause**: The Vite proxy, when `changeOrigin: true` is set, rewrites the `Origin` header. The CSRF middleware then rejected it as an unknown origin.

**Fix**: Removed `changeOrigin: true` from the Vite proxy config. Removed the custom CSRF middleware entirely — `SameSite=Lax` cookies provide equivalent CSRF protection. The `csrf.py` module is retained as dead code for reference.

---

### Bug 3: Backend Crashing on WSL Shell Transition
**Symptom**: Backend process died intermittently when the WSL terminal was closed.

**Root Cause**: Without `setsid`, the backend was a child of the shell. When the shell received SIGHUP, all children were killed.

**Fix**: Wrapped the uvicorn start command in `setsid` in `run.sh`.

---

### Bug 4: Health Check Timing Out on Cold Start
**Symptom**: `run.sh` reported the backend as not healthy even though it was still starting up.

**Fix**: Expanded to 10 retries × 2 seconds = 20 seconds max wait. Added dead-process check.

---

### Bug 5: Interview Sessions Lost on Server Restart
**Symptom**: If the backend restarted mid-interview, the session was lost.

**Root Cause**: Sessions were stored in a Python `dict` in-memory.

**Fix**: Migrated session storage to **Redis** with a 45-minute TTL.

---

### Bug 6: Interview Reports Lost on Redis TTL Expiry
**Symptom**: After 45 minutes, completed interview reports were gone forever. Users couldn't review past interviews.

**Root Cause**: The `/end` endpoint only deleted the Redis session and returned the report in the HTTP response. Nothing was persisted to the database.

**Fix**: Added Supabase persistence on `/end` — saves the full report to the `interview_reports` table before deleting from Redis. Non-fatal: if the DB insert fails, the user still gets their report in the response.

```python
# In /end route, before delete_session():
await supabase.table("interview_reports").insert({
    "user_id": user_id_str,
    "overall_score": overall,
    "qualitative_score": qual_score,
    "breakdown": breakdown,
    "role": session.role,
    "experience_level": session.experience_level,
    "questions_count": len(session.questions),
    "answers_count": count,
}).execute()
```

---

### Bug 7: Cover Letter PDF Had Rendering Artifacts
**Symptom**: Cover letters with `&`, `<`, or `>` characters caused ReportLab to render corrupted PDF paragraphs.

**Fix**: HTML-escape before passing to ReportLab:
```python
safe_line = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
```

---

### Bug 8: Markdown Asterisks in Cover Letters
**Symptom**: Generated cover letters sometimes contained `**bold**` asterisks.

**Fix**: Post-processing strip + `<think>...</think>` tag stripping for reasoning models.

---

### Bug 9: CORS Wildcard + Credentials
**Symptom**: Security audit flagged `CORS_ORIGINS = "*"` combined with `allow_credentials=True`.

**Fix**: Replaced with strict origin whitelist. Added production validator to refuse startup with `*`.

---

### Bug 10: Prompt Injection via XML Tag Escaping
**Symptom**: A malicious user could embed `</RESUME_TEXT>` inside their resume text, breaking out of the data sandbox.

**Fix**: Created `prompt_sanitizer.py` — strips all dangerous XML tags from user input before prompt injection. Applied across all AI services.

---

### Bug 11: Rate Limiter Reads Proxy IP in Production
**Symptom**: Behind Render's load balancer, all users share the proxy's IP — one rate-limited user blocks everyone.

**Root Cause**: `_get_real_client_ip()` read `request.client.host` directly, ignoring `X-Forwarded-For`.

**Fix**: 
1. `_get_real_client_ip()` now reads `CF-Connecting-IP` / `X-Forwarded-For` / `X-Real-IP` in production
2. Added `ProxyHeadersMiddleware` in `main.py` for production — sets `request.client.host` from the trusted proxy header

---

### Bug 12: CSP `default-src 'none'` White-Screens the App
**Symptom**: The nuclear CSP blocked all scripts, styles, and connections — React app would not load in production.

**Fix**: Replaced with environment-aware CSP. Production CSP allows `'self'`, Google Fonts, and Supabase CDN. Development CSP is relaxed to allow Vite HMR.

---

### Bug 13: API URL Hardcoded to Localhost
**Symptom**: `const BASE = "/api/v1"` works via Vite proxy locally but 404s on Vercel (no proxy in production).

**Fix**:
```typescript
const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const BASE = `${API_BASE}/api/v1`;
const INTERVIEW_BASE = `${API_BASE}/api/v1/interview`;
```
Set `VITE_API_BASE=https://your-backend.onrender.com` in Vercel environment variables.

---

### Bug 14: Wrong Credit Key for Humanize
**Symptom**: The humanize button called `deductLocal("cover_letter")` instead of `deductLocal("humanize")`. This deducted 10 credits locally instead of 15, causing the displayed balance to be wrong after humanizing.

**Fix**: Changed to `deductLocal("humanize")` and `canUse("humanize")`. Also added `"humanize"` to the `FeatureKey` union type in `CreditContext.tsx` (was previously cast with `as any`).

---

### Bug 15: Invalid Tailwind Placeholder Classes
**Symptom**: `placeholder-muted-foreground/30` is not a valid Tailwind class — Tailwind uses the `placeholder:` variant prefix syntax.

**Fix**: Replaced all instances with `placeholder:text-muted-foreground/50` in `AIInterview.tsx` (2 instances) and `AuthModal.tsx` (3 instances).

---

### Bug 16: `console.error` in NotFound.tsx
**Symptom**: Every 404 navigation logged an error to the browser console in production.

**Fix**: Removed the `useEffect` + `console.error`. Improved the 404 UI to use React Router `<Link>` instead of `<a href>`, and added the attempted path to the error message.

---

## Part B: Key Architectural Decisions & Why

| Decision | Why |
|---|---|
| HttpOnly cookies for JWTs | Prevents XSS token theft — no JavaScript can read HttpOnly cookies |
| Vite proxy (no direct CORS) | Avoids CORS complexity in dev; single origin to the browser |
| Redis for interview state | Stateless backend — survives restarts, scales horizontally |
| Supabase persistence for interview reports | Redis TTL = 45min; reports must survive indefinitely |
| PostgreSQL RPC for credit deduction | Atomic `SELECT ... FOR UPDATE` prevents race conditions and double-spending |
| `require_credits()` as FastAPI dependency | Runs before route handler — impossible to bypass at the application layer |
| Optimistic local credit deduction | Instant UI feedback without waiting for the API round-trip |
| Groq over OpenAI | 10x faster inference, generous free tier, same quality for this use case |
| HuggingFace for embeddings | Superior semantic matching vs keyword matching for ATS scoring |
| ReportLab for PDF generation | No external service dependency — PDFs generated in-process |
| Supabase over custom auth | Complete auth system (OAuth, PKCE, JWT) + DB + storage in one service |
| SlowAPI over custom rate limiting | Battle-tested, Redis-backed, minimal code overhead |
| `pydantic_settings` for config | Type-safe, validates at startup, reads from `.env` automatically |

---

## Part C: What's Next (Roadmap)

### Immediate (P0 — Before Any Public Launch)
- [ ] **Payment integration** — Razorpay or Stripe for credit top-ups (plans defined in CreditsPage)
- [ ] **Email verification enforcement** — Currently signup succeeds without verifying email
- [ ] **Render cold start UX** — Add "Waking up server..." indicator on first load
- [ ] **Cron ping for Render** — Keep backend alive on free tier (cron-job.org)

### High Priority (P1)
- [ ] **Interview history page** — List past interview reports from `interview_reports` table
- [ ] **Keyword gap analysis** — Show exactly which JD keywords are missing from the resume
- [ ] **Resume versioning** — Let users upload multiple versions and compare scores
- [ ] **Cover letter templates** — Multiple tone options (formal, creative, concise)

### Medium Priority (P2)
- [ ] **Job application tracker** — Kanban board: Applied → Interview → Offer → Rejected
- [ ] **JD Decoder** — Reverse-engineer a job description before uploading a resume
- [ ] **LinkedIn import** — Parse LinkedIn PDF export as an alternative to manual upload
- [ ] **Audio interview mode** — Use gTTS to read questions aloud
- [ ] **Roast leaderboard** — Gamified resume scoring with anonymous rankings

### Nice to Have (P3)
- [ ] **Mobile app** — React Native wrapper around the core features
- [ ] **Resume builder** — In-app resume editor that outputs a well-formatted PDF
- [ ] **Cold email generator** — LinkedIn DM and cold outreach templates
- [ ] **Salary insights** — Integrate a public salary API for role-based ranges

---

## Part D: File Reference Map

| What you're looking for | File |
|---|---|
| App startup & middleware | `backend/app/main.py` |
| All settings & config | `backend/app/core/config.py` |
| Cookie management | `backend/app/core/auth_cookies.py` |
| Rate limiting | `backend/app/core/rate_limit.py` |
| CSRF logic (dead code, retained for reference) | `backend/app/core/csrf.py` |
| Prompt input sanitizer | `backend/app/services/prompt_sanitizer.py` |
| **Credit system service** | **`backend/app/services/credits.py`** |
| Auth endpoints | `backend/app/api/v1/endpoints/auth.py` |
| Resume upload/delete | `backend/app/api/v1/endpoints/resumes.py` |
| ATS match + Deep Analysis + Hiring Intel | `backend/app/api/v1/endpoints/ai_analysis.py` |
| Cover letter + humanize | `backend/app/api/v1/endpoints/cover_letter.py` |
| Interview flow | `backend/app/api/v1/endpoints/interview.py` |
| Dashboard summary | `backend/app/api/v1/endpoints/dashboard.py` |
| **Admin panel endpoints** | **`backend/app/api/v1/endpoints/admin.py`** |
| **Credit balance/history/costs** | **`backend/app/api/v1/endpoints/credits.py`** |
| Hinglish translation | `backend/app/api/v1/endpoints/utils.py` |
| ATS math engine (embeddings) | `backend/app/services/math_engine.py` |
| Deep analysis LLM logic | `backend/app/services/deep_analysis.py` |
| Hiring intel LLM logic | `backend/app/services/hiring_intel.py` |
| General ATS scorer (rule-based) | `backend/app/services/ats_general_engine.py` |
| Cover letter generator | `backend/app/services/cover_letter_gen.py` |
| Humanizer | `backend/app/services/humanizer.py` |
| Interview AI | `backend/app/services/ai_interview.py` |
| Supabase client | `backend/app/db/supabase.py` |
| Redis client | `backend/app/db/redis_client.py` |
| Pydantic schemas | `backend/app/schemas/models.py` |
| ATS schemas | `backend/app/schemas/ats.py` |
| Frontend routing | `FRONTEND/src/App.tsx` |
| Auth context | `FRONTEND/src/contexts/AuthContext.tsx` |
| **Credit context** | **`FRONTEND/src/contexts/CreditContext.tsx`** |
| Roast mode context (no-op stub) | `FRONTEND/src/contexts/RoastModeContext.tsx` |
| Auth hook | `FRONTEND/src/hooks/useAuth.ts` |
| API client | `FRONTEND/src/lib/api.ts` |
| Supabase client (PKCE only) | `FRONTEND/src/lib/supabase.ts` |
| Vite proxy config | `FRONTEND/vite.config.ts` |
| Dashboard UI | `FRONTEND/src/pages/DashboardPage.tsx` |
| Resume analysis UI | `FRONTEND/src/pages/ResumeAnalysis.tsx` |
| Cover letter UI | `FRONTEND/src/pages/CoverLetter.tsx` |
| Interview UI | `FRONTEND/src/pages/AIInterview.tsx` |
| **Credits page** | **`FRONTEND/src/pages/CreditsPage.tsx`** |
| **Admin page** | **`FRONTEND/src/pages/AdminPage.tsx`** |
| OAuth callback UI | `FRONTEND/src/pages/AuthCallback.tsx` |
| **Credit badge (navbar)** | **`FRONTEND/src/components/ui/CreditBadge.tsx`** |
| **Credit display components** | **`FRONTEND/src/components/ui/CreditDisplay.tsx`** |
| Deep analysis panel | `FRONTEND/src/components/analysis/DeepAnalysisPanel.tsx` |
| Hiring intel panel | `FRONTEND/src/components/analysis/HiringIntelPanel.tsx` |
| Service launcher | `run.sh` |
| Credit system DB migration | `SUPABASE_MIGRATION.sql` |
| **Interview reports DB migration** | **`backend/SUPABASE_MIGRATION_interview_reports.sql`** |
