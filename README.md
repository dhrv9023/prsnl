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
| **AI Mock Interview** | 6-question adaptive interview with per-answer evaluation and a final report | 25 |
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
              GET  /api/v1/interview/history
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

1. `SUPABASE_MIGRATION.sql` — credit system, profiles, transactions
2. `backend/SUPABASE_MIGRATION_interview_reports.sql` — interview reports table

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
| Cover Letter + Humanizer | ✅ Complete |
| Cover Letter PDF (client-side, jsPDF) | ✅ Complete |
| Hinglish Toggle (Deep Analysis + Interview) | ✅ Complete |
| Credit System | ✅ Complete |
| Admin Panel | ✅ Complete |
| Error Monitoring (Sentry) | ✅ Complete |
| Request Signing (Admin ops) | ✅ Complete |
| RLS on ai_analyses | ✅ Complete |
| Test Suite | ✅ Complete |
| Payment Integration | ⏳ Post-MVP |

---

## License

Private — all rights reserved.
