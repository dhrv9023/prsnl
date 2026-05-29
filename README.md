# Kareerist — AI Career Intelligence Platform

> Give your job search an unfair advantage. Resume scoring, AI feedback, mock interviews, cover letters — all in one place.

---

## What It Does

Kareerist is a full-stack AI-powered career toolkit built for job seekers who want more than a generic resume checker. It combines rule-based ATS scoring, LLM-powered analysis, and a mock interview engine into a single platform with a credit-based usage system.

### Features

| Feature | Description | Credits |
|---|---|---|
| **ATS Match Score** | Score your resume against a job description using cosine similarity + rule-based signals | 5 |
| **Deep Analysis** | LLM-powered critique — strengths, weaknesses, missing keywords, actionable fixes | 15 |
| **Hiring Intelligence** | 9-section recruiter-realistic report on how your profile reads to a hiring manager | 25 |
| **AI Mock Interview** | 6-question adaptive interview with per-answer evaluation, voice input, and a final report | 25 |
| **Cover Letter Generator** | Role-targeted cover letter from your resume + JD | 10 |
| **AI Humanizer** | Strips AI tone from cover letters, makes them sound like you | 15 |
| **Interview History** | All past interview reports saved and reviewable | Free |
| **Dashboard** | Resume history, analysis history, credit balance, interview history | Free |

New users get **100 free credits** on signup. No payment required to try everything.

---

## Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **Shadcn UI** + **Framer Motion**
- **React Query** for server state, **React Router v6** for routing

### Backend
- **Python 3.13** + **FastAPI** + **Uvicorn**
- **SlowAPI** rate limiting, **pypdf** for PDF parsing, **ReportLab** for PDF generation
- **scikit-learn** TF-IDF for keyword density scoring

### AI / ML
- **Groq** (`llama-3.3-70b-versatile`) — Deep Analysis, Hiring Intel, Cover Letter, Humanizer, Interview
- **Groq Whisper** (`whisper-large-v3-turbo`) — Voice interview transcription
- **HuggingFace API** — Embeddings for ATS cosine similarity

### Infrastructure
- **Supabase** — PostgreSQL database, Auth (email + Google OAuth), file storage
- **Redis / Upstash** — Rate limiting + interview session state (45-min TTL)
- **Render** — Backend hosting
- **Vercel** — Frontend hosting
- **Sentry** — Error monitoring (backend + frontend)

---

## Architecture

```
Browser (React + Vite)
    │
    │  /api/... (Vite proxy in dev | VITE_API_BASE in prod)
    ▼
FastAPI (Uvicorn)
    │
    ├── Supabase Auth      → JWT validation via HttpOnly cookies
    ├── Supabase DB        → profiles, resumes, analyses, credits, interviews
    ├── Supabase Storage   → PDF blobs (Resumes bucket)
    ├── Redis              → Rate limit counters + interview sessions
    ├── Groq API           → LLM inference
    └── HuggingFace API    → Embeddings
```

**Auth:** HttpOnly cookie-based — no JWTs in localStorage. Full PKCE OAuth flow for Google.

**CSRF Protection:** Double-submit cookie pattern with cross-origin support:
1. Backend sets `__krs_xsrf` cookie (JS-readable, not HttpOnly) on login
2. Frontend reads token from login response and stores in memory + sessionStorage
3. Frontend sends token as `X-CSRF-Token` header on POST/PUT/DELETE requests
4. Backend validates header token matches cookie token
5. CSRFMiddleware adds CORS headers to error responses for proper browser handling

This approach works in cross-origin production setups where cookies with `SameSite=None` cannot be read by JavaScript from different domains.

**Credits:** Enforced server-side via atomic PostgreSQL RPC (`deduct_credits()`). Frontend does optimistic deduction for UX only.

---

## API Endpoints

```
Auth          POST /api/v1/auth/signup | /login | /logout | GET /me
              POST /api/v1/auth/oauth/session (PKCE code exchange)
              POST /api/v1/auth/refresh
Resumes       POST /api/v1/resumes/upload | GET /list | /{id}
ATS Score     POST /api/ats/score
AI Analysis   POST /api/v1/analysis/deep | /hiring-intel
Interview     POST /api/v1/interview/start | GET /session | POST /end
              POST /api/v1/interview/submit | /submit_voice
              GET  /api/v1/interview/history | POST /abandon
Cover Letter  POST /api/v1/cover_letter/generate | /humanize
Credits       GET  /api/v1/credits/balance | /history
Admin         GET  /api/v1/admin/stats | /users
              POST /api/v1/admin/users/{id}/grant-credits | /set-unlimited
System        GET  /health | /ping
```

---

## Local Development

### Prerequisites
- Python 3.13+, Node.js 18+, Redis running locally
- `uv` for Python package management

### Setup

```bash
# Clone the repo
git clone https://github.com/dhrv9023/prsnl.git
cd prsnl

# Backend
cd backend
uv sync
cp app/.env.example app/.env   # fill in your keys

# Frontend
cd ../FRONTEND
npm install
cp .env.example .env.local     # set VITE_API_BASE

# Start everything (WSL/Linux)
bash run.sh
```

Services:
- Frontend → `http://localhost:8080`
- Backend  → `http://localhost:8000`
- Redis    → `redis://localhost:6379`

### Environment Variables (Backend)

```
GROQ_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE
SUPABASE_ANON_KEY
SUPABASE_JWT_SECRET
HUGGINGFACE_API_KEY
REDIS_URL
SENTRY_DSN
```

### Environment Variables (Frontend)

```
VITE_API_BASE
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

## Database

Run these SQL migrations in your Supabase SQL editor before deploying:

1. `supabase/migrations/20260202140000_profiles_auth_sync.sql` — profiles + auth trigger
2. `supabase/migrations/20260513000000_credit_system.sql` — credit system, transactions, RPC functions
3. `supabase/migrations/20260515000001_audit_fixes.sql` — RLS, IP farming fix
4. `supabase/migrations/20260517000001_daily_credits.sql` — daily credit grants
5. `supabase/migrations/20260522000001_fix_daily_grant_total.sql` — fix total_credits_granted for daily grants
6. `supabase/migrations/20260515000002_interview_reports.sql` — interview reports table
7. `supabase/migrations/20260522000003_admin_credit_stats_rpc.sql` — admin credit stats RPC
8. `supabase/migrations/20260523000000_comprehensive_fix.sql` — comprehensive permissions fix, INSERT policies, and RLS enforcement

### Tables

| Table | Purpose |
|---|---|
| `profiles` | User credits, admin flag, unlimited flag |
| `resumes` | Uploaded resume metadata + extracted text |
| `ai_analyses` | All AI analysis results — with `user_id` column + RLS |
| `job_applications` | Cover letter drafts and PDFs |
| `credit_transactions` | Full audit log of every credit change |
| `ip_credit_claims` | Anti-farming: one IP = one initial credit grant |
| `interview_reports` | Persisted interview reports |
| `daily_credit_grants` | Tracks daily 50-credit grants per user per day |

---

## Security

The platform implements comprehensive security measures:

- ✅ **Authorization:** RPC functions restricted to backend (service_role only)
- ✅ **Data Integrity:** Row-level security (RLS) on all user-scoped tables
- ✅ **Credit System:** Atomic PostgreSQL operations prevent race conditions
- ✅ **Anti-Farming:** IP-based deduplication prevents multi-account credit abuse
- ✅ **Audit Trail:** Complete transaction history for forensic analysis
- ✅ **Error Handling:** No information disclosure, proper HTTP status codes
- ✅ **CSRF Protection:** Double-submit cookie validation with cross-origin support
  - Backend sets JS-readable `__krs_xsrf` cookie on login
  - Frontend stores token in memory + sessionStorage (cross-origin compatible)
  - Token sent as `X-CSRF-Token` header on all state-changing requests
  - CSRFMiddleware validates token matches cookie value
  - CORS headers added to error responses for proper browser handling

---

## Tests

```bash
cd backend
pytest tests/ -v
```

22 tests covering ATS scorer, credit system, auth, resume upload, and security headers.

---

## Deployment

| Service | Platform | Tier |
|---|---|---|
| Frontend | Vercel | Free |
| Backend | Render | Free |
| Database | Supabase | Free |
| Redis | Upstash | Free |
| Monitoring | Sentry | Free |

---

## Project Status

| Component | Status |
|---|---|
| Auth (email + Google OAuth) | ✅ Complete |
| Resume Upload + Parsing | ✅ Complete |
| ATS Scoring (with/without JD) | ✅ Complete |
| Deep Analysis | ✅ Complete |
| Hiring Intelligence | ✅ Complete |
| AI Mock Interview | ✅ Complete |
| Voice Interview (Whisper STT) | ✅ Complete |
| Cover Letter + Humanizer | ✅ Complete |
| Cover Letter PDF (client-side, jsPDF) | ✅ Complete |
| Hinglish Toggle (Deep Analysis + Interview) | ✅ Complete |
| Credit System | ✅ Complete |
| Admin Panel | ✅ Complete |
| Error Monitoring (Sentry) | ✅ Complete |
| Theme Toggle (Light/Dark Mode) | ✅ Complete |
| RLS on ai_analyses | ✅ Complete |
| Test Suite | ✅ Complete |
| Payment Integration | ⏳ Post-MVP |

---

## Recent Updates

### May 29, 2026
- ✅ Admin panel improvements
- ✅ User activity tracking
- ✅ Bug fixes and optimizations

### May 22, 2026
- ✅ **Theme Toggle Fix:** Fixed light/dark mode switching issue where theme-init.js and theme-toggle.tsx had conflicting defaults
- ✅ **Security Hardening:** Applied database security migration (20260522000004_security_hardening.sql)
- ✅ **Documentation:** Updated project documentation and code structure

---

## License

Private — all rights reserved.
