# KAREERIST — AI-Powered Career Intelligence Platform

A full-stack career toolkit built with **FastAPI** (backend) + **React / Vite** (frontend), powered by **Groq LLM**, **Supabase**, **Redis**, and **HuggingFace**.

---

## 🗂️ Project Structure

```
kareerist/
├── backend/                # FastAPI application
│   ├── app/
│   │   ├── api/v1/         # Route endpoints (resume, interview, auth…)
│   │   ├── core/           # Settings, security, middleware
│   │   ├── services/       # AI logic (roast, ATS, cover letter, interview)
│   │   └── main.py         # App factory + middleware stack
│   ├── requirements.txt
│   └── .env                # ← you create this (see below)
├── FRONTEND/               # React + Vite application
│   ├── src/
│   │   ├── components/     # Navbar, Footer, UI primitives
│   │   ├── pages/          # All route pages
│   │   ├── contexts/       # AuthContext
│   │   ├── lib/api.ts      # Centralised API client
│   │   └── App.tsx         # Router + lazy loading
│   └── .env.local          # ← auto-created by run.sh (WSL2 IP)
├── supabase/               # DB migration files
├── kareerist_sofar/        # 📖 Full project documentation (8 chapters)
├── run.sh                  # One-command launcher (WSL / Linux)
└── .gitignore
```

---

## ⚙️ Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **WSL 2** (Ubuntu 22.04+) | Any | Windows users run everything inside WSL |
| **Python** | 3.12 + | Backend runtime |
| **Node.js** | 18 + | Frontend build |
| **Redis** | Any | Session store — `run.sh` installs it automatically |

---

## 🔑 Environment Setup

### Backend — `backend/.env`

Create this file before running for the first time:

```bash
cp backend/.env.example backend/.env   # if .env.example exists
# OR create manually:
touch backend/.env
```

Fill in the following variables:

```env
# ── Supabase ──────────────────────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# ── AI Services ───────────────────────────────────────────────────
GROQ_API_KEY=your-groq-api-key
HUGGINGFACE_API_KEY=your-hf-api-key

# ── Redis (local dev) ─────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Auth / Cookies ────────────────────────────────────────────────
COOKIE_SECRET=any-long-random-string
COOKIE_SECURE=false          # set to true in production (HTTPS only)
ENVIRONMENT=development      # or "production"

# ── CORS ──────────────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:8080
```

> **Where to get keys:**
> - Supabase: [supabase.com](https://supabase.com) → Project → Settings → API
> - Groq: [console.groq.com](https://console.groq.com)
> - HuggingFace: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

---

## 🚀 Running Locally (Recommended — One Command)

From **inside WSL**, run:

```bash
bash run.sh
```

The script automatically:
1. Checks for Redis — installs it if missing, starts it if not running
2. Creates a Python virtual environment (`backend/.venv`) if absent
3. Installs backend dependencies from `requirements.txt`
4. Starts **FastAPI** on `http://localhost:8000` and waits for `/health`
5. Installs npm packages if missing
6. Detects the WSL2 IP and writes `FRONTEND/.env.local`
7. Starts **Vite** dev server on `http://localhost:8080`

Press **Ctrl+C** to shut down all services cleanly.

**Access the app:**

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:8000 |
| API Docs (dev) | http://localhost:8000/docs |

---

## 🛠️ Manual Setup (Step-by-Step)

If you prefer running each service yourself:

### 1. Backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start Redis (separate terminal)
redis-server --port 6379

# Start FastAPI
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend

```bash
cd FRONTEND

# Install Node packages
npm install

# For WSL2 users — set the backend proxy IP
WSL_IP=$(hostname -I | awk '{print $1}')
echo "VITE_WSL_IP=$WSL_IP" > .env.local

# Start Vite dev server
npm run dev
```

---

## 📦 Useful Commands

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 8080) |
| `npm run build` | Production bundle |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

### Backend

| Command | Description |
|---------|-------------|
| `uvicorn app.main:app --reload` | Dev server with hot reload |
| `pip install -r requirements.txt` | Install / update dependencies |
| `redis-cli ping` | Check if Redis is running |

---

## 🗄️ Database (Supabase)

All SQL migrations are in `supabase/`. Run them in order via the Supabase Dashboard SQL Editor or the Supabase CLI:

```bash
supabase db push   # if using Supabase CLI
```

---

## 📖 Documentation

All technical documentation is in [`kareerist_sofar/`](./kareerist_sofar/README.md) — 8 detailed chapters covering architecture, security, AI features, and deployment.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| Backend | FastAPI, Python 3.12+, Uvicorn |
| Auth | Supabase Auth (Google OAuth + Email) — HttpOnly cookies |
| Database | Supabase (PostgreSQL) |
| Session Store | Redis (interview state, rate limiting) |
| AI | Groq (LLaMA 3), HuggingFace (sentence-transformers) |
| Deployment | Vercel (frontend) + Render (backend) + Upstash (Redis) |

