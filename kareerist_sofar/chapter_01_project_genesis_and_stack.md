# Chapter 1 — Project Genesis & Technology Stack

## What Is Kareerist?

Kareerist (internally called "Kareerist Studio") is a full-stack, AI-powered **Career Toolkit** web application. It was built from scratch to give job seekers a professional edge by combining resume intelligence, AI feedback, cover letter generation, and mock interview practice — all in one platform.

The name is a play on "career" — it's personal, it's professional, and it's built to be production-ready.

---

## Where It All Started

The project began as a personal productivity tool and evolved into a full platform over several development sessions. The work was done collaboratively, iterating feature by feature, with a strong emphasis on **security**, **clean architecture**, and **real-world production standards**.

### Development Timeline (Condensed)

| Phase | What Happened |
|---|---|
| Phase 1 | Project scaffolded — FastAPI backend + Vite/React frontend wired together |
| Phase 2 | Resume upload, PDF parsing, and Supabase storage integrated |
| Phase 3 | ATS scoring engine (HuggingFace embeddings + cosine similarity) built |
| Phase 4 | Deep Roast (LLM-powered resume critique) implemented |
| Phase 5 | HttpOnly cookie-based auth (no localStorage JWTs) — full PKCE OAuth flow |
| Phase 6 | AI Interview feature (Redis-backed session state, 6-question loop) |
| Phase 7 | Cover Letter Generator + Humanizer service deployed |
| Phase 8 | Hinglish translation feature for resume analysis |
| Phase 9 | Comprehensive QA Security Audit → all findings remediated |
| Phase 10 | Dev environment stabilized on WSL, run.sh launcher hardened |
| Phase 11 | Master documentation written, deployment guide created |

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
| React Router DOM | Client-side routing |
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
| fpdf2 / ReportLab | PDF generation for cover letters |
| pyspellchecker | Spell checking in the ATS general engine |
| scikit-learn | TF-IDF vectorizer for keyword density scoring |
| uv | Fast Python package manager (preferred over pip) |

### AI / ML
| Service | Usage |
|---|---|
| Groq (`llama-3.3-70b-versatile`) | Deep Roast analysis, Cover Letter generation, Humanizer, AI Interview questions & evaluation |
| HuggingFace API | Embeddings for ATS cosine similarity matching |
| Google GenAI SDK | Listed in requirements (future use) |
| gTTS | Listed in requirements (future use — text-to-speech) |

### Databases & Storage
| Service | Usage |
|---|---|
| Supabase (PostgreSQL) | Primary database — resumes, job_applications, ai_analyses, profiles tables |
| Supabase Auth | User identity management (email/password + Google OAuth) |
| Supabase Storage | PDF blob storage — `Resumes` bucket (resumes + cover letter PDFs) |
| Redis | Rate limiting counters + AI Interview session state (with TTL) |

### Infrastructure
| Tool | Role |
|---|---|
| WSL (Windows Subsystem for Linux) | Local development environment |
| `run.sh` | Unified bash launcher — starts Redis → Backend → Frontend in order |
| Git | Version control |

---

## Project Directory Structure

```
kareerist/
└── prsnl/                          ← Main project root
    ├── run.sh                      ← Unified service launcher
    ├── MASTER_DOC.md               ← Core architecture reference
    ├── DEPLOYMENT_GUIDE.md         ← Free deployment walkthrough
    ├── qa_security_report.md       ← Full security audit report
    ├── README.md
    ├── kareerist_sofar/            ← This deep-dive documentation
    │
    ├── backend/                    ← Python FastAPI backend
    │   ├── requirements.txt
    │   ├── pyproject.toml
    │   └── app/
    │       ├── main.py             ← App factory, middleware, routes
    │       ├── .env                ← Secrets (gitignored)
    │       ├── api/v1/endpoints/   ← Route handlers (auth, resumes, etc.)
    │       ├── services/           ← Business logic (AI, ATS, etc.)
    │       ├── core/               ← Config, auth cookies, rate limiter, CSRF
    │       ├── db/                 ← Supabase + Redis clients
    │       └── schemas/            ← Pydantic models
    │
    ├── FRONTEND/                   ← React/Vite frontend
    │   ├── vite.config.ts
    │   ├── .env                    ← Supabase public keys
    │   └── src/
    │       ├── App.tsx             ← Router, providers
    │       ├── pages/              ← Full page components
    │       ├── components/         ← Layout + section components
    │       ├── contexts/           ← AuthContext
    │       ├── hooks/
    │       └── lib/api.ts          ← Centralized API client
    │
    ├── supabase/migrations/        ← Database schema migrations
    └── docs/                       ← Architecture docs (EN + HI)
```

---

## Key Design Decisions Made Early

1. **No localStorage JWTs** — Tokens are stored exclusively in HttpOnly cookies to prevent XSS theft. This was a deliberate security-first decision made before any auth was written.

2. **Vite Proxy instead of direct CORS** — The frontend calls `/api/...` which Vite proxies to the backend. This means the browser never makes a cross-origin request during development, eliminating CORS friction. The proxy target dynamically resolves to the WSL IP.

3. **Groq for LLM** — Chosen for its speed (sub-second inference on `llama-3.3-70b-versatile`) and generous free tier, making it ideal for a dev-phase AI platform.

4. **Redis for interview sessions** — Instead of in-memory dicts (which die on server restart), interview sessions are persisted in Redis with a 45-minute TTL. This makes the app stateless and scalable.

5. **Supabase as the full backend-as-a-service** — Handles auth, database, and file storage in one platform, reducing infrastructure complexity significantly.
