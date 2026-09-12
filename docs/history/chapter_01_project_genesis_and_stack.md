# Chapter 01 — Project Genesis & Stack

## What is Kareerist?

Kareerist is an AI-powered career intelligence platform built for job seekers who want more than a generic resume checker. It combines rule-based ATS scoring, LLM-powered analysis, mock interviews with voice input, and cover letter generation — all inside a single platform with a credit-based usage system.

The core idea: most career tools are shallow. They give you a score and leave you guessing. Kareerist gives you a score, explains exactly why, tells you what a recruiter would think, and then lets you practice the interview.

---

## Features (what's live)

| Feature | What it does | Credits |
|---|---|---|
| **ATS Score** | Scores your resume against a job description using cosine similarity on sentence embeddings. Without a JD, uses a 6-dimension rule-based scorer. | 5 |
| **Deep Analysis** | LLM-powered critique — strengths, weaknesses, missing keywords, section-by-section breakdown, actionable fixes | 15 |
| **Hiring Intelligence** | 9-section recruiter-realistic report: profile strength, red flags, interview likelihood, salary range, hiring readiness | 25 |
| **AI Mock Interview** | 6-question adaptive interview generated from your resume. Theory, MCQ, and code questions. Per-answer evaluation with score, feedback, ideal answer. Voice input supported. | 25 |
| **Cover Letter Generator** | Role-targeted cover letter from your resume + JD. Roast mode available (savage, unfiltered). | 10 |
| **AI Humanizer** | Strips AI tone from cover letters, makes them sound like a real person wrote them | 15 |
| **Interview History** | All past interview reports saved and reviewable | Free |
| **Dashboard** | Resume history, analysis history, credit balance, interview history in one place | Free |

---

## Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite** — fast dev server, lazy-loaded pages
- **Tailwind CSS** + **Shadcn UI** — component library built on Radix primitives
- **Framer Motion** — animations throughout the landing page and UI
- **React Query** — server state management (caching, refetching)
- **React Router v6** — client-side routing with lazy loading

### Backend
- **Python 3.13** + **FastAPI** + **Uvicorn** — async web framework
- **Pydantic v2** + **pydantic-settings** — request validation and config management
- **SlowAPI** — rate limiting middleware (Redis-backed in production)
- **pypdf** — PDF text extraction from uploaded resumes
- **ReportLab** — PDF generation for cover letters
- **scikit-learn** — cosine similarity for ATS JD matching
- **numpy** — vector math for embedding comparison

### AI / ML
- **Groq** (`groq/compound-mini` + `groq/compound` fallback, both free on GroqCloud) — all LLM features: Deep Analysis, Hiring Intel, Cover Letter, Humanizer, Interview questions and evaluation
- **Groq Whisper** (`whisper-large-v3-turbo`) — voice interview transcription (STT)
- **HuggingFace API** (`sentence-transformers/all-mpnet-base-v2`) — sentence embeddings for ATS cosine similarity

### Infrastructure
- **Supabase** — PostgreSQL database, Auth (email + Google OAuth via PKCE), file storage (Resumes bucket)
- **Redis / Upstash** — rate limiting counters + interview session state (45-min TTL)
- **Render** — backend hosting (free tier, auto-deploy from GitHub)
- **Vercel** — frontend hosting (free tier, auto-deploy from GitHub)
- **Sentry** — error monitoring (backend + frontend)

---

## Why these choices?

**Groq over OpenRouter:** Groq uses custom LPU hardware. The same models run 5-10x faster than on shared OpenRouter infrastructure. For a product where users are waiting for AI responses, latency matters. Groq's free tier (6000 req/day) is also generous enough for an MVP.

**Supabase over raw Postgres:** Supabase gives you auth, storage, RLS, and a REST API out of the box. The PKCE OAuth flow for Google login is handled by Supabase's auth library. The service role key lets the backend bypass RLS for admin operations.

**Redis for interview sessions:** Interview sessions have state (questions, answers, evaluations) that needs to survive across multiple HTTP requests. Redis with a 45-minute TTL is the right tool — it's fast, it auto-expires abandoned sessions, and it works across multiple Uvicorn workers.

**HttpOnly cookies over localStorage:** JWTs in localStorage are vulnerable to XSS. HttpOnly cookies can't be read by JavaScript at all. The tradeoff is that you need CSRF protection — which we implement via double-submit cookie pattern.

**Render + Vercel over AWS:** Free tier, zero DevOps overhead, auto-deploy from GitHub. For an MVP this is the right call. The cold start problem on Render's free tier (first request after 15min idle takes ~20s) is mitigated by a `/ping` endpoint that UptimeRobot hits every 10 minutes.
