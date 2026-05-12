# Kareerist — Deep Dive Documentation Index

> **Updated**: May 12, 2026  
> **Project**: Kareerist Studio (AI-Powered Career Toolkit)  
> **Status**: MVP — 9.5/10 Ready for Deployment (all code fixes complete, awaiting deployment phases)

This folder contains the complete, chapter-by-chapter technical documentation of everything built on the Kareerist project from day one to present.

---

## 📚 Chapters

| Chapter | File | Contents |
|---|---|---|
| **1** | [chapter_01_project_genesis_and_stack.md](./chapter_01_project_genesis_and_stack.md) | What Kareerist is, development timeline, full tech stack, project structure, early design decisions |
| **2** | [chapter_02_backend_architecture.md](./chapter_02_backend_architecture.md) | FastAPI app factory, middleware stack, all API routes, config system, rate limiting, resume upload pipeline, database schema |
| **3** | [chapter_03_auth_and_security.md](./chapter_03_auth_and_security.md) | HttpOnly cookie auth, PKCE OAuth flow, all security defenses, full security audit findings + fixes |
| **4** | [chapter_04_ai_features_and_services.md](./chapter_04_ai_features_and_services.md) | ATS Match Score, Deep Analysis, Hiring Intel, Hinglish Translation, Cover Letter + Humanizer, AI Interview, General ATS Scorer |
| **5** | [chapter_05_frontend_architecture.md](./chapter_05_frontend_architecture.md) | React/Vite setup, routing, AuthContext, CreditContext, centralized API client, all pages documented, component architecture |
| **6** | [chapter_06_infrastructure_and_deployment.md](./chapter_06_infrastructure_and_deployment.md) | run.sh launcher, WSL2 fixes, environment files, step-by-step free deployment (Vercel + Render + Upstash), production checklist |
| **7** | [chapter_07_bugs_decisions_and_roadmap.md](./chapter_07_bugs_decisions_and_roadmap.md) | Every major bug and its fix, architectural decision log, full feature roadmap, file reference map |
| **8** | [chapter_08_deployment_and_custom_domain.md](./chapter_08_deployment_and_custom_domain.md) | Step-by-step free deployment (Vercel + Render + Upstash), keeping Render alive, full custom domain setup |
| **9** | [chapter_09_mvp_brutal_diagnosis.md](./chapter_09_mvp_brutal_diagnosis.md) | Honest MVP assessment, competitive landscape, what's missing, what's unique, P0 launch checklist |
| **10** | [chapter_10_deployment_runbook.md](./chapter_10_deployment_runbook.md) | **The deployment day checklist** — step-by-step runbook for Supabase → Upstash → Render → Vercel → smoke test → custom domain |

---

## 🚀 Quick Start (Development)

```bash
# From WSL, navigate to project root
cd /path/to/kareerist/prsnl

# One command starts everything
bash run.sh

# Services started:
# Redis     → redis://localhost:6379
# Backend   → http://localhost:8000
# Frontend  → http://localhost:8080
```

---

## 🔑 Key Secrets Needed (backend/app/.env)

```
GROQ_API_KEY          → groq.com → API Keys
SUPABASE_URL          → Supabase Dashboard → Settings → API
SUPABASE_SERVICE_ROLE → Supabase Dashboard → Settings → API (service_role key)
SUPABASE_ANON_KEY     → Supabase Dashboard → Settings → API (anon key)
SUPABASE_JWT_SECRET   → Supabase Dashboard → Settings → API → JWT Secret
HUGGINGFACE_API_KEY   → huggingface.co → Settings → Access Tokens
REDIS_URL             → redis://localhost:6379/0 (dev) | Upstash URL (prod)
```

---

## 📊 Feature Status

| Feature | Backend | Frontend | Credit Cost | Status |
|---|---|---|---|---|
| Email/Password Auth | ✅ | ✅ | Free | Complete |
| Google OAuth (PKCE) | ✅ | ✅ | Free | Complete |
| Resume Upload (PDF) | ✅ | ✅ | Free | Complete |
| ATS Match Score (with/without JD) | ✅ | ✅ | 5 credits | Complete |
| Deep Analysis (LLM) | ✅ | ✅ | 15 credits | Complete |
| Hiring Intelligence | ✅ | ✅ | 25 credits | Complete |
| Hinglish Translation | ✅ | ✅ | Free | Complete |
| Cover Letter Generator | ✅ | ✅ | 10 credits | Complete |
| AI Humanizer | ✅ | ✅ | 15 credits | Complete |
| Save Cover Letter as PDF | ✅ | ✅ | Free | Complete |
| AI Mock Interview | ✅ | ✅ | 25 credits | Complete |
| Interview Report Persistence | ✅ | ✅ | — | Complete |
| Interview History Page | ✅ | ✅ | Free | Complete |
| Dashboard with History | ✅ | ✅ | Free | Complete |
| Admin Panel | ✅ | ✅ | Free (admin) | Complete |
| Credit System | ✅ | ✅ | — | Complete |
| Error Monitoring (Sentry) | ✅ | ✅ | — | Complete |
| Structured Request Logging | ✅ | — | — | Complete |
| Test Suite (22 tests) | ✅ | — | — | Complete |
| Payment Integration | ⏳ | ⏳ | — | Post-MVP |

---

## 💳 Credit System Overview

New users receive **100 free credits** on signup (via Supabase trigger). Credits are deducted atomically via PostgreSQL RPC before each AI feature runs.

| Feature | Cost |
|---|---|
| ATS Match Score | 5 credits |
| Deep Analysis | 15 credits |
| Hiring Intelligence | 25 credits |
| AI Mock Interview | 25 credits |
| Cover Letter Generator | 10 credits |
| Humanize AI Tone | 15 credits |

Admin users with `is_unlimited = true` bypass all credit deductions. The credit system is enforced server-side — the frontend only does optimistic local deduction for UX responsiveness.

---

## 🗄️ Database Tables

| Table | Purpose |
|---|---|
| `profiles` | User profiles — credits, admin flag, unlimited flag |
| `resumes` | Uploaded resume metadata + extracted text |
| `ai_analyses` | All AI analysis results (ATS, deep, hiring intel) |
| `job_applications` | Cover letter drafts and final PDFs |
| `credit_transactions` | Full audit log of every credit deduction/grant |
| `ip_credit_claims` | Anti-farming: one IP = one initial credit grant |
| `interview_reports` | Persisted interview reports (survives Redis TTL) |

---

## 🏗️ Architecture at a Glance

```
Browser (React + Vite — port 8080)
    │
    │ /api/... (Vite proxy in dev | VITE_API_BASE in prod)
    ▼
FastAPI (Uvicorn — port 8000)
    │
    ├── Supabase Auth    → JWT validation
    ├── Supabase DB      → profiles, resumes, ai_analyses, job_applications,
    │                      credit_transactions, ip_credit_claims, interview_reports
    ├── Supabase Storage → PDF blobs (Resumes bucket)
    ├── Redis            → Rate limit counters + interview sessions (45min TTL)
    ├── Groq API         → LLM (llama-3.3-70b-versatile)
    └── HuggingFace API  → Embeddings (ATS cosine similarity)
```
