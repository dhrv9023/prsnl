# Chapter 1 — Project Genesis & Technology Stack

## What Is Kareerist?

Kareerist (internally called "Kareerist Studio") is a full-stack, AI-powered **Career Intelligence Platform**. It was built from scratch to give job seekers a professional edge by combining resume intelligence, AI feedback, cover letter generation, mock interview practice, and a credit-based usage system — all in one platform.

The name is a play on "career" — it's personal, it's professional, and it's built to production standards.

---

## Development Timeline

| Phase | What Happened |
|---|---|
| Phase 1 | Project scaffolded — FastAPI backend + Vite/React frontend wired together |
| Phase 2 | Resume upload, PDF parsing, and Supabase storage integrated |
| Phase 3 | ATS scoring engine (HuggingFace embeddings + cosine similarity) built |
| Phase 4 | Deep Analysis (LLM-powered resume critique) implemented |
| Phase 5 | HttpOnly cookie-based auth (no localStorage JWTs) — full PKCE OAuth flow |
| Phase 6 | AI Interview feature (Redis-backed session state, 6-question loop) |
| Phase 7 | Cover Letter Generator + Humanizer service deployed |
| Phase 8 | Hinglish translation feature for resume analysis |
| Phase 9 | Comprehensive QA Security Audit → all findings remediated |
| Phase 10 | Dev environment stabilized on WSL, run.sh launcher hardened |
| Phase 11 | **Credit system** — 100 free credits on signup, atomic deduction via PostgreSQL RPC, admin panel, credit history, balance badge in navbar |
| Phase 12 | **Hiring Intelligence** feature — 9-section recruiter-realistic report |
| Phase 13 | **Pre-launch audit** — 13 bugs fixed, interview report persistence added, production proxy/CSP/URL fixes applied |
| Phase 14 | Master documentation written, deployment guide created |

---

## Technology Stack (Full)

### Frontend
| Technology | Version / Notes |
|---|---|
| React | 18 — component-based UI |
| TypeScript | Strict typing throughout |
| Vite | Dev server on port 8080, with `/api` proxy to backend |
| Tailwind CSS | Utility-first styling |
| Shadcn UI | Prebuilt accessible component library |
| Framer Motion | Animations (landing page sections) |
| React Query (`@tanstack/react-query`) | Server state management |
| React Router DOM v6 | Client-side routing |
| Lucide React | Icon library |
| Supabase JS (`@supabase/supabase-js`) | Used only for the PKCE OAuth initiation flow |

### Backend
| Technology | Version / Notes |
|---|---|
| Python | 3.13+ |
| FastAPI | `>=0.128.0` — async REST API framework |
| Uvicorn | ASGI server |
| Pydantic / Pydantic Settings | Request validation and config management |
| SlowAPI | Rate limiting middleware (wraps `limits` library) |
| PyJWT | JWT decoding for rate-limit key generation |
| pypdf | PDF text extraction |
| ReportLab | PDF generation for cover letters |
| pyspellchecker | Spell checking in the ATS general engine |
| scikit-learn | TF-IDF vectorizer for keyword density scoring |
| uv | Fast Python package manager (preferred over pip) |

### AI / ML
| Service | Usage |
|---|---|
| Groq (`llama-3.3-70b-versatile`) | Deep Analysis, Hiring Intel, Cover Letter generation, Humanizer, AI Interview questions & evaluation, Hinglish translation |
| HuggingFace API | Embeddings for ATS cosine similarity matching |

### Databases & Storage
| Service | Usage |
|---|---|
| Supabase (PostgreSQL) | Primary database — profiles, resumes, job_applications, ai_analyses, credit_transactions, ip_credit_claims, interview_reports |
| Supabase Auth | User identity management (email/password + Google OAuth) |
| Supabase Storage | PDF blob storage — `Resumes` bucket (resumes + cover letter PDFs) |
| Redis | Rate limiting counters + AI Interview session state (45-min TTL) |

### Infrastructure
| Tool | Role |
|---|---|
| WSL (Windows Subsystem for Linux) | Local development environment |
| `run.sh` | Unified bash launcher — starts Redis → Backend → Frontend in order |
| Git | Version control |
| Vercel | Frontend hosting (production) |
| Render | Backend hosting (production) |
| Upstash | Managed Redis (production) |

---

## Project Directory Structure

```
kareerist/
└── prsnl/                          ← Main project root
    ├── run.sh                      ← Unified service launcher (WSL/Linux only)
    ├── README.md
    ├── SUPABASE_MIGRATION.sql      ← Credit system DB migration
    ├── FUTURE_DEPLOYMENT_BUGS.md   ← Deployment bugs (now fixed)
    ├── kareerist_sofar/            ← This deep-dive documentation
    │
    ├── backend/                    ← Python FastAPI backend
    │   ├── requirements.txt
    │   ├── pyproject.toml
    │   ├── SUPABASE_MIGRATION_interview_reports.sql  ← interview_reports table
    │   └── app/
    │       ├── main.py             ← App factory, middleware, routes
    │       ├── .env                ← Secrets (gitignored)
    │       ├── api/v1/endpoints/   ← Route handlers
    │       │   ├── auth.py
    │       │   ├── resumes.py
    │       │   ├── ai_analysis.py
    │       │   ├── cover_letter.py
    │       │   ├── interview.py
    │       │   ├── dashboard.py
    │       │   ├── admin.py
    │       │   ├── credits.py
    │       │   └── utils.py
    │       ├── services/           ← Business logic (AI, ATS, credits, etc.)
    │       ├── core/               ← Config, auth cookies, rate limiter, CSRF
    │       ├── db/                 ← Supabase + Redis clients
    │       └── schemas/            ← Pydantic models
    │
    ├── FRONTEND/                   ← React/Vite frontend
    │   ├── vite.config.ts
    │   ├── .env                    ← Supabase public keys (committed)
    │   ├── .env.local              ← WSL IP + VITE_API_BASE (gitignored)
    │   └── src/
    │       ├── App.tsx             ← Router, providers
    │       ├── pages/              ← Full page components
    │       ├── components/         ← Layout + section + UI components
    │       ├── contexts/           ← AuthContext, CreditContext, RoastModeContext
    │       ├── hooks/              ← useAuth
    │       └── lib/
    │           ├── api.ts          ← Centralized API client
    │           └── supabase.ts     ← Supabase client (PKCE only)
    │
    └── supabase/migrations/        ← Database schema migrations
```

---

## Key Design Decisions Made Early

1. **No localStorage JWTs** — Tokens are stored exclusively in HttpOnly cookies to prevent XSS theft. This was a deliberate security-first decision made before any auth was written.

2. **Vite Proxy instead of direct CORS** — The frontend calls `/api/...` which Vite proxies to the backend in development. In production, `VITE_API_BASE` env var points directly to the Render backend URL.

3. **Groq for LLM** — Chosen for its speed (sub-second inference on `llama-3.3-70b-versatile`) and generous free tier, making it ideal for a dev-phase AI platform.

4. **Redis for interview sessions** — Instead of in-memory dicts (which die on server restart), interview sessions are persisted in Redis with a 45-minute TTL. This makes the app stateless and scalable.

5. **Supabase as the full backend-as-a-service** — Handles auth, database, and file storage in one platform, reducing infrastructure complexity significantly.

6. **Credit system via PostgreSQL RPC** — Credit deduction is atomic at the database level using `deduct_credits()` and `grant_credits()` stored procedures. This prevents race conditions and double-spending even under concurrent requests.

7. **Server-side credit enforcement** — The `require_credits()` FastAPI dependency runs before every AI route handler. The frontend does optimistic local deduction for UX responsiveness, but the backend is the source of truth.
