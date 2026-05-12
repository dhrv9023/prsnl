# KAREERIST — AI-Powered Career Intelligence Platform

A full-stack career toolkit built with **FastAPI** (backend) + **React / Vite** (frontend), powered by **Groq LLM**, **Supabase**, **Redis**, and **HuggingFace**.

---

## 🗂️ Project Structure

```
kareerist/
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── api/v1/endpoints/   # Route handlers (auth, resumes, interview, credits, admin…)
│   │   ├── core/               # Settings, security, middleware, rate limiting
│   │   ├── services/           # AI logic (deep analysis, hiring intel, cover letter, interview)
│   │   ├── db/                 # Supabase + Redis clients
│   │   ├── schemas/            # Pydantic models
│   │   └── main.py             # App factory + middleware stack
│   ├── SUPABASE_MIGRATION_interview_reports.sql
│   ├── requirements.txt
│   └── app/.env                # ← you create this (see below)
├── FRONTEND/                   # React + Vite application
│   ├── src/
│   │   ├── components/         # Navbar, Footer, CreditBadge, analysis panels
│   │   ├── pages/              # All route pages
│   │   ├── contexts/           # AuthContext, CreditContext
│   │   ├── hooks/              # useAuth
│   │   ├── lib/api.ts          # Centralised API client
│   │   └── App.tsx             # Router + lazy loading
│   ├── .env                    # Supabase public keys (committed)
│   └── .env.local              # WSL IP + VITE_API_BASE (gitignored)
├── supabase/                   # DB migration files
├── kareerist_sofar/            # 📖 Full project documentation (9 chapters)
├── SUPABASE_MIGRATION.sql      # Credit system DB migration
├── FUTURE_DEPLOYMENT_BUGS.md   # Deployment bug tracker (all fixed)
├── run.sh                      # One-command launcher (WSL / Linux only)
└── .gitignore
```

---

## ⚙️ Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **WSL 2** (Ubuntu 22.04+) | Any | Windows users run everything inside WSL |
| **Python** | 3.12+ | Backend runtime |
| **Node.js** | 18+ | Frontend build |
| **Redis** | Any | Session store — `run.sh` installs it automatically |

---

## 🔑 Environment Setup

### Backend — `backend/app/.env`

```env
# ── Supabase ──────────────────────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

# ── AI Services ───────────────────────────────────────────────────
GROQ_API_KEY=your-groq-api-key
HUGGINGFACE_API_KEY=your-hf-api-key

# ── Redis ─────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── Auth / Cookies ────────────────────────────────────────────────
COOKIE_SECURE=false          # set to true in production (HTTPS only)
ENVIRONMENT=development      # or "production"

# ── CORS ──────────────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:8080,http://localhost:5173
```

### Frontend — `FRONTEND/.env` (already committed with public keys)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Frontend — `FRONTEND/.env.local` (gitignored, auto-created by run.sh)

```env
VITE_WSL_IP=172.xx.xx.xx   # Auto-set by run.sh

# For production (set in Vercel):
# VITE_API_BASE=https://your-backend.onrender.com
```

---

## 🗄️ Database Setup (Supabase)

Run these SQL files in the Supabase SQL Editor **before** starting the app:

1. **`SUPABASE_MIGRATION.sql`** — Credit system: adds credit columns to `profiles`, creates `credit_transactions`, `ip_credit_claims`, `grant_credits` RPC, `deduct_credits` RPC, and signup trigger
2. **`backend/SUPABASE_MIGRATION_interview_reports.sql`** — Creates `interview_reports` table for persisting interview reports

---

## 🚀 Running Locally (One Command)

From **inside WSL**, run:

```bash
bash run.sh
```

The script automatically:
1. Checks for Redis — installs it if missing, starts it if not running
2. Creates a Python virtual environment (`backend/.venv`) if absent
3. Installs backend dependencies
4. Starts **FastAPI** on `http://localhost:8000` and waits for `/health`
5. Installs npm packages if missing
6. Detects the WSL2 IP and writes `FRONTEND/.env.local`
7. Starts **Vite** dev server on `http://localhost:8080`

Press **Ctrl+C** to shut down all services cleanly.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:8000 |
| API Docs (dev only) | http://localhost:8000/docs |

---

## 💳 Credit System

New users receive **100 free credits** on signup. Credits are deducted atomically via PostgreSQL RPC before each AI feature runs.

| Feature | Cost |
|---------|------|
| ATS Match Score | 5 credits |
| Deep Analysis | 15 credits |
| Hiring Intelligence | 25 credits |
| AI Mock Interview | 25 credits |
| Cover Letter Generator | 10 credits |
| Humanize AI Tone | 15 credits |

Admin users with `is_unlimited = true` bypass all credit deductions.

---

## 📦 Useful Commands

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 8080) |
| `npm run build` | Production bundle |
| `npm run lint` | Run ESLint |

### Backend

| Command | Description |
|---------|-------------|
| `uvicorn app.main:app --reload` | Dev server with hot reload |
| `pip install -r requirements.txt` | Install / update dependencies |
| `redis-cli ping` | Check if Redis is running |

---

## 📖 Documentation

All technical documentation is in [`kareerist_sofar/`](./kareerist_sofar/README.md) — 9 detailed chapters covering architecture, security, AI features, credit system, and deployment.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, shadcn/ui |
| Backend | FastAPI, Python 3.12+, Uvicorn |
| Auth | Supabase Auth (Google OAuth PKCE + Email) — HttpOnly cookies |
| Database | Supabase (PostgreSQL) |
| Session Store | Redis (interview state, rate limiting) |
| AI | Groq (LLaMA 3.3 70B), HuggingFace (sentence-transformers) |
| Deployment | Vercel (frontend) + Render (backend) + Upstash (Redis) |
