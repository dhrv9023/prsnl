# Kareerist — Deep Dive Documentation Index

> **Generated**: May 2026  
> **Project**: Kareerist Studio (AI-Powered Career Toolkit)  
> **Status**: Active Development  

This folder contains the complete, chapter-by-chapter technical documentation of everything built on the Kareerist project from day one to present.

---

## 📚 Chapters

| Chapter | File | Contents |
|---|---|---|
| **1** | [chapter_01_project_genesis_and_stack.md](./chapter_01_project_genesis_and_stack.md) | What Kareerist is, development timeline, full tech stack, project structure, early design decisions |
| **2** | [chapter_02_backend_architecture.md](./chapter_02_backend_architecture.md) | FastAPI app factory, middleware stack, all API routes, config system, rate limiting, resume upload pipeline, database schema |
| **3** | [chapter_03_auth_and_security.md](./chapter_03_auth_and_security.md) | HttpOnly cookie auth, PKCE OAuth flow, all 12 security defenses implemented, full security audit findings + fixes |
| **4** | [chapter_04_ai_features_and_services.md](./chapter_04_ai_features_and_services.md) | ATS Match Score, Deep Roast, Hinglish Translation, Cover Letter + Humanizer, AI Interview, General ATS Scorer |
| **5** | [chapter_05_frontend_architecture.md](./chapter_05_frontend_architecture.md) | React/Vite setup, routing, AuthContext, centralized API client, Vite proxy, all pages documented, component architecture |
| **6** | [chapter_06_infrastructure_and_deployment.md](./chapter_06_infrastructure_and_deployment.md) | run.sh launcher, WSL2 fixes, environment files, step-by-step free deployment (Vercel + Render + Upstash), production checklist |
| **7** | [chapter_07_bugs_decisions_and_roadmap.md](./chapter_07_bugs_decisions_and_roadmap.md) | Every major bug and its fix, architectural decision log, full feature roadmap, file reference map |
| **8** | [chapter_08_deployment_and_custom_domain.md](./chapter_08_deployment_and_custom_domain.md) | Step-by-step free deployment (Vercel + Render + Upstash), keeping Render alive, full custom domain setup (DNS records, CORS, Supabase, Google OAuth, cookies, HSTS) |

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

| Feature | Backend | Frontend | Status |
|---|---|---|---|
| Email/Password Auth | ✅ | ✅ | Complete |
| Google OAuth (PKCE) | ✅ | ✅ | Complete |
| Resume Upload (PDF) | ✅ | ✅ | Complete |
| ATS Match Score | ✅ | ✅ | Complete |
| Deep Roast (LLM) | ✅ | ✅ | Complete |
| Hinglish Translation | ✅ | ✅ | Complete |
| Cover Letter Generator | ✅ | ✅ | Complete |
| AI Humanizer | ✅ | ✅ | Complete |
| Save Cover Letter as PDF | ✅ | ✅ | Complete |
| AI Mock Interview | ✅ | ✅ | Complete |
| Dashboard with History | ✅ | ✅ | Complete |
| Admin Panel | ✅ | ✅ | Complete |
| General ATS Scorer (no JD) | ✅ | ✅ | Complete |
| Security Hardening | ✅ | ✅ | Complete |
| Free Deployment Guide | — | — | Documented |

---

## 🏗️ Architecture at a Glance

```
Browser (React + Vite — port 8080)
    │
    │ /api/... (Vite proxy in dev | Direct call in prod)
    ▼
FastAPI (Uvicorn — port 8000)
    │
    ├── Supabase Auth    → JWT validation
    ├── Supabase DB      → resumes, ai_analyses, job_applications, profiles
    ├── Supabase Storage → PDF blobs (Resumes bucket)
    ├── Redis            → Rate limit counters + interview sessions
    ├── Groq API         → LLM (llama-3.3-70b-versatile)
    └── HuggingFace API  → Embeddings (ATS cosine similarity)
```
