# Kareerist — Complete Project Documentation
### For AI Handoff · August 2026

> This document describes everything built in this project so that another AI agent can pick up context immediately, understand decisions, and contribute meaningfully.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Database Schema](#4-database-schema)
5. [Backend — Service Layer](#5-backend--service-layer)
6. [Backend — API Endpoints](#6-backend--api-endpoints)
7. [Frontend — Pages](#7-frontend--pages)
8. [Frontend — Components](#8-frontend--components)
9. [Design System & UI/UX](#9-design-system--uiux)
10. [Auth System](#10-auth-system)
11. [Credit System](#11-credit-system)
12. [AI / LLM Pipeline](#12-ai--llm-pipeline)
13. [Security Implementation](#13-security-implementation)
14. [State Management](#14-state-management)
15. [Deployment](#15-deployment)
16. [Known Quirks & Decisions](#16-known-quirks--decisions)
17. [What's Planned / Coming Soon](#17-whats-planned--coming-soon)
18. [Master Prompt for Feature Ideation](#18-master-prompt-for-feature-ideation)

---

## 1. Project Overview

**Kareerist** is an AI-powered career intelligence platform targeting Indian job seekers (but written in English with a Hinglish toggle). It is a full-stack monorepo with:

- A **React/TypeScript/Vite** frontend (hosted on Vercel)
- A **Python 3.13 / FastAPI** backend (hosted on Render free tier)
- **Supabase** for auth, PostgreSQL, and file storage
- **Redis (Upstash)** for rate limiting and interview session state
- **Groq** (qwen3.6-27b) as the LLM provider
- **HuggingFace** for text embeddings (cosine similarity ATS scoring)

**Core value proposition:** Give job seekers an "unfair advantage" with: ATS resume scoring, deep AI resume critique, recruiter-realistic hiring intelligence, AI mock interviews with voice input support, and cover letter generation.

**New users get 100 free credits** on signup. No payment system exists yet (post-MVP).

---

## 2. Tech Stack

### Frontend
| Technology | Version / Notes |
|---|---|
| React | 18 |
| TypeScript | Full strict mode |
| Vite | Build + dev server, proxy /api → localhost:8000 |
| Tailwind CSS | v3 + custom design tokens |
| Shadcn/UI | Component primitives (Radix-based) |
| Framer Motion | Animations and page transitions |
| React Router | v6, lazy-loaded routes with `lazyWithRetry` wrapper |
| React Query | @tanstack/react-query for server state |
| jsPDF | Client-side PDF generation for cover letters |
| Lucide React | Icon library |
| Sonner + Toaster | Toast notifications |

### Backend
| Technology | Version / Notes |
|---|---|
| Python | 3.13 |
| FastAPI | Async, with Uvicorn |
| uv | Package manager (replaces pip/poetry) |
| pypdf | PDF text extraction |
| ReportLab | PDF generation on server |
| scikit-learn | TF-IDF vectorizer for keyword density |
| pyspellchecker | Spell checking in ATS general engine |
| SlowAPI | Rate limiting middleware |
| Sentry SDK | Error monitoring |
| Groq Python SDK | LLM API client |
| HuggingFace Hub | Embedding API client |
| redis (aioredis) | Async Redis client |

---

## 3. Architecture

```
Browser (React + Vite)
    |
    |  /api/... -> Vite proxy in dev
    |           -> VITE_API_BASE in prod (Render URL)
    v
FastAPI (Uvicorn on Render)
    |
    |-- Supabase Auth     -> JWT validation via HttpOnly cookies
    |-- Supabase DB       -> profiles, resumes, analyses, credits, interviews
    |-- Supabase Storage  -> PDF blobs (Resumes bucket)
    |-- Redis (Upstash)   -> Rate limit counters + interview sessions (45-min TTL)
    |-- Groq API          -> LLM inference (qwen/qwen3-27b)
    |-- HuggingFace API   -> Embeddings (sentence-transformers/all-mpnet-base-v2)
```

### Request flow for a typical feature call (e.g., Deep Analysis):
1. User clicks "Deep Analysis" in the React UI
2. `CreditContext.canUse("deep_analysis")` checks local credit balance
3. `CreditContext.deductLocal()` does an optimistic local deduction (updates UI immediately)
4. `apiGetDeepAnalysis(resumeId, jd?)` in `lib/api.ts` fires a fetch to `/api/v1/analysis/deep`
5. CSRF token is attached from the `__krs_xsrf` cookie
6. Backend `CurrentUser` dependency validates the HttpOnly session cookie
7. Credits are atomically deducted via PostgreSQL RPC `deduct_credits()`
8. `generate_deep_analysis()` calls the Groq LLM with structured prompt
9. If the LLM call fails → `refund_feature_credits()` is called atomically before raising HTTP 502
10. JSON response is validated and returned
11. Frontend `DeepAnalysisPanel` renders the result; `refreshCredits()` re-fetches balance

### Dev Bypass Mode
In local development, the frontend sends `X-Dev-Bypass: 1` header. The backend's `CurrentUser` dependency sees this and injects a fake user ID (`DEV_BYPASS_USER_ID` from `.env`) instead of validating the Supabase JWT. This allows local testing without setting up auth.

---

## 4. Database Schema

All tables live in Supabase (PostgreSQL). RLS (Row Level Security) is applied.

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid | = Supabase auth user id |
| credits | int | Current remaining credits |
| total_credits_granted | int | Lifetime credits received |
| is_admin | bool | Admin panel access |
| is_unlimited | bool | Bypasses credit deduction |
| created_at | timestamptz | |

### `resumes`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK -> profiles |
| file_url | text | Supabase Storage URL |
| original_filename | text | Original upload filename |
| parsed_content | text | Extracted text from PDF |
| created_at | timestamptz | |

### `ai_analyses`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK -> profiles (RLS enforced) |
| resume_id | uuid | FK -> resumes |
| analysis_type | text | 'deep_analysis', 'hiring_intel', 'job_match_score', etc. |
| result | jsonb | The full AI response |
| created_at | timestamptz | |

### `job_applications`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK -> profiles |
| resume_id | uuid | FK -> resumes |
| cover_letter | text | Generated letter text |
| pdf_url | text | Saved PDF (if applicable) |
| job_title | text | |
| company_name | text | |
| created_at | timestamptz | |

### `credit_transactions`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK -> profiles |
| feature | text | Feature key (e.g., 'deep_analysis') |
| credits_used | int | Debited amount (0 for grants) |
| credits_before | int | Balance before |
| credits_after | int | Balance after |
| label | text | Human-readable description |
| created_at | timestamptz | |

### `ip_credit_claims`
| Column | Type | Notes |
|---|---|---|
| ip | text | PK — hashed/raw client IP |
| user_id | uuid | First user from this IP |
| granted_amount | int | 100 |
| created_at | timestamptz | |

Anti-farming: one IP can only claim the initial 100 credits once. Checked on signup.

### `interview_reports`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK -> profiles |
| resume_id | uuid | FK -> resumes |
| role | text | Target role (may be prefixed with [ROAST]) |
| report | jsonb | Full interview report JSON |
| overall_score | float | Average score 0-10 |
| quality | text | Excellent / Very Good / Good / Decent / Needs Work |
| created_at | timestamptz | |

---

## 5. Backend — Service Layer

All business logic lives in `backend/app/services/`. The API endpoints in `app/api/v1/endpoints/` are thin wrappers that handle auth, credit deduction, and call into services.

### `math_engine.py` — ATS JD scoring
- Uses HuggingFace `sentence-transformers/all-mpnet-base-v2` embeddings
- Computes cosine similarity between resume text and job description
- Also contains `_general_resume_score()` — rule-based 6-dimension scoring when no JD is provided:
  1. Content density (word count)
  2. Quantification (numbers/metrics/percentages in text)
  3. Action verbs (built, led, designed, improved, etc.)
  4. Section coverage (does the resume have experience, skills, education, projects?)
  5. Contact info (email, phone, LinkedIn/GitHub)
  6. Formatting signals (bullet points, consistent structure)
- Raw cosine similarity is blended with a TF-IDF keyword match score (30/70 weighting)

### `ats_general_engine.py` — Phase 2 ATS scoring (no JD)
- Two-component blend: Section quality (60%) + Content quality (40%)
- Uses `SpellChecker` for spell checking
- Uses `TfidfVectorizer` for keyword density scoring
- Identifies sections from the resume text using regex patterns:
  - header, education, projects, experience, skills, achievements
- Scores each section on: grammar, clarity, brevity, structure, conciseness, spell-check, keyword density

### `deep_analysis.py` — Section-by-section LLM critique
- System prompt: elite resume consultant persona
- JD is optional — when provided, analysis is JD-aware
- Prompt injection protection: XML tags + security rules in system prompt
- Output schema (strict JSON):
  ```json
  {
    "summary": "string",
    "overall_feedback": "Excellent|Good|Fair|Poor",
    "sections": { "<section>": { "score", "feedback", "issues[]", "missing_keywords[]" } },
    "action_items": ["string x5"]
  }
  ```
- Validates and normalizes output before returning to ensure frontend does not crash

### `hiring_intel.py` — 9-section recruiter-realistic report
- Simulates: Senior Technical Recruiter + Hiring Manager + ATS Specialist + Career Strategist + Technical Interviewer + Workforce Intelligence Analyst
- JD is REQUIRED
- Target role and experience level (Fresher/Junior/Mid/Senior) are inputs
- Output schema covers:
  1. `overall_alignment` — text summary
  2. `recruiter_pov` — first_impression, strong_signals[], recruiter_concerns[], verdict{call, reasoning}
  3. `skill_gap` — critical[], optional[], production_gaps[]
  4. `deep_analysis` — maturity, execution, credibility, production_readiness (each with rating + explanation)
  5. `role_aware_reasoning` — why this specific role + level cares about specific gaps
  6. `why_it_matters` — dict of concern -> why recruiters care
  7. `highest_impact_improvements` — list of actionable items
  8. `resume_rewrites` — list of {original_bullet, rewritten_bullet, why_it_works}
  9. `hiring_readiness` — {verdict, confidence, summary, next_step}

### `ai_interview.py` — Mock interview engine
- Generates 6 questions: 2 Theory + 2 MCQ + 2 Code
- Questions are resume-aware (reads candidate's actual tech stack)
- Difficulty calibrated by experience level:
  - **Fresher**: Textbook definitions, basic syntax MCQ, array traversal code
  - **Junior**: How/why concepts, applied tool knowledge, easy-medium LeetCode
  - **Mid**: System design concepts, gotcha MCQ, medium-hard LeetCode
  - **Senior**: Architecture decisions, subtle gotchas, complex algorithms
- Progressive ramping: Q1 easiest -> Q6 hardest within each level
- Evaluation: Per-question scoring 0-10 with feedback + ideal_answer
- MCQ: 4 options provided, correct one embedded in question struct
- Voice input: Groq Whisper STT — audio uploaded, transcribed, then evaluated as text answer
- **Roast Mode** (deprecated/disabled in UI): Was a more brutally honest evaluation variant

### `cover_letter_gen.py` — Cover letter generation
- Inputs: resume_text, job_description, company_name, job_title
- Generates: 250-word professional cover letter
- No placeholders — uses actual names from resume and JD
- Starts directly with greeting (no header block)
- Plain text only, no Markdown

### `humanizer.py` — AI tone stripper
- Takes an AI-generated cover letter and rewrites it to sound human
- Removes: passive voice, buzzwords, "leverage", "synergy", AI clichés
- Preserves: factual claims, specific achievements, personal voice

### `credits.py` — Credit system service
- Feature costs: `ats_score: 5`, `deep_analysis: 15`, `hiring_intel: 25`, `interview: 25`, `cover_letter: 10`, `humanize: 15`
- Initial grant: 100 credits (IP-gated)
- Daily grant: 50 credits/day (once initial 100 are exhausted)
- `grant_initial_credits()` — checks IP table before granting
- `deduct_credits_safely()` — calls PostgreSQL RPC for atomic deduction
- `grant_daily_credits()` — checks if user already received a grant today

### `llm_client.py` — Centralized LLM caller
- Wraps Groq API calls
- Model: `qwen/qwen3-27b`
- `chat_complete()` takes messages, temperature, response_format, timeout

### `ai_retry.py` — Retry logic for LLM calls
- `with_ai_retry()` wraps any async LLM call with exponential backoff
- Max 3 retries, handles rate limits and transient errors

### `prompt_sanitizer.py` — Input sanitization
- `sanitize_user_text()` strips potential prompt injection from user-provided resume/JD text
- Removes instruction-like patterns before inserting into prompts

---

## 6. Backend — API Endpoints

Base URL: `https://<render-url>/api/v1/` (prod) or `http://localhost:8000/api/v1/` (dev)

### Auth `/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/auth/signup` | Email/password signup, grants 100 credits |
| POST | `/auth/login` | Email/password login, sets HttpOnly cookies |
| POST | `/auth/logout` | Clears auth cookies |
| GET | `/auth/me` | Returns current user info + daily credit grant info |
| POST | `/auth/oauth/session` | PKCE code exchange for Google OAuth |
| POST | `/auth/refresh` | Refreshes the Supabase session token |

### Resumes `/resumes`
| Method | Path | Description |
|---|---|---|
| POST | `/resumes/upload` | Upload PDF, extract text via pypdf, store in Supabase Storage |
| GET | `/resumes/list` | List user's resumes (id, filename, created_at) |
| GET | `/resumes/{id}` | Get specific resume details |

### AI Analysis `/analysis`
| Method | Path | Notes |
|---|---|---|
| POST | `/analysis/deep` | Deep section-by-section critique (15 cr) |
| POST | `/analysis/hiring-intel` | 9-section recruiter report (25 cr) |

### ATS Score
| Method | Path | Notes |
|---|---|---|
| POST | `/api/ats/score` | JD optional; without JD -> rule-based general quality score (5 cr) |

### Interview `/api/v1/interview`
| Method | Path | Notes |
|---|---|---|
| POST | `/interview/start` | Start new session; deducts 25 cr; returns 6 questions |
| GET | `/interview/session` | Get active session state from Redis |
| POST | `/interview/answer` | Submit text answer for one question |
| POST | `/interview/voice-answer` | Submit audio (Whisper STT) |
| POST | `/interview/end` | Finalize interview; generate report; save to DB |
| POST | `/interview/abandon` | Discard active session |
| GET | `/interview/history` | All past interview reports for user |

Session state is stored in Redis with 45-minute TTL. Key: `interview:session:{user_id}`.

### Cover Letter `/cover_letter`
| Method | Path | Notes |
|---|---|---|
| POST | `/cover_letter/generate` | Generate cover letter (10 cr) |
| POST | `/cover_letter/humanize` | Humanize AI-generated letter (15 cr) |

### Credits `/credits`
| Method | Path | Notes |
|---|---|---|
| GET | `/credits/balance` | Current balance, is_unlimited flag |
| GET | `/credits/history` | Full credit transaction log |
| GET | `/credits/feature-costs` | Feature key -> cost + label mapping |

### Dashboard `/dashboard`
| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard/summary` | Stats: total analyses, resumes, avg ATS score |

### Admin `/admin` — Requires `is_admin = true` in profile
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/stats` | Platform stats: total users, analyses, interviews |
| GET | `/admin/users` | List all users with credit balances |
| POST | `/admin/users/{id}/grant-credits` | Grant credits to specific user |
| POST | `/admin/users/{id}/set-unlimited` | Toggle unlimited credits |

Admin routes also use request signing for an extra layer of protection (HMAC-signed request body).

### System
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Checks Redis + Supabase connectivity |
| GET | `/ping` | Lightweight keep-alive (prevents Render cold starts) |

---

## 7. Frontend — Pages

All pages are lazy-loaded with a custom `lazyWithRetry()` wrapper that handles stale chunk failures after Vercel redeploys (auto-reloads the page once).

### `/` — Landing Page
Renders the full marketing page composed of:
- `Hero` — main CTA
- `FeatureMarquee` — horizontal scrolling features ticker
- `HowKareeristThinks` / `HowKareeristThinksSignal` — product philosophy
- `Features` — bento grid of 4 principles (Evaluate, Prioritize, Direct, Adapt)
- `ValueNarrative` — "why this matters"
- `Pricing` — credit pricing section
- `FinalCTA` — bottom conversion

### `/resume-analysis` — Resume Analysis
**The core tool. Three-panel layout:**
- **Left sidebar (240px)**: Saved resume selector + drag-drop upload + job description textarea + action buttons + Hiring Intel inputs (role, experience level)
- **Center canvas**: PDF preview via iframe OR extracted text editor (Edit Text mode)
- **Right panel**: Tabbed analysis results:
  - ATS Score tab — CircularGauge + breakdown bars (general mode) or match score (JD mode)
  - Deep Analysis tab — DeepAnalysisPanel
  - Hiring Intel tab — HiringIntelPanel

**Key behaviors:**
- Saved resumes load on mount from `/resumes/list`
- Duplicate filename detection on upload (blocks re-upload with same name)
- `isExpanded` state collapses/expands the right panel on desktop
- Mobile uses bottom tabs: Controls / Canvas / Analysis
- Credit checks happen before each action; insufficient credits shows warning

### `/interview` — AI Mock Interview
**Multi-step state machine:**
1. **Setup step**: Select resume, enter target role (with 12 popular role chips), choose experience level (grid of 4 options), Hinglish toggle, cost display
2. **Active interview**: One question at a time, sequential. Shows question type badge (Theory/MCQ/Code). Text area for answer + voice input toggle (Mic button). Per-question evaluation shown inline after submission. Progress bar.
3. **Final report**: Overall score (0-10), quality rating (Excellent/Very Good/Good/Decent/Needs Work), breakdown by question, per-question: score, feedback, ideal answer. Trophy icon for Excellent.

**Active session detection**: On mount, checks for existing Redis session — asks user to resume or abandon instead of charging again.

**Voice input flow:**
1. User clicks Mic — browser `MediaRecorder` captures audio (webm/ogg)
2. Audio blob sent to `/interview/voice-answer` as multipart form
3. Backend calls Groq Whisper to transcribe
4. Transcription returned + question evaluated
5. Frontend shows transcription in text area + evaluation

### `/dashboard` — Dashboard
- Header stats: Total resumes, total analyses, best ATS score (from history), total interviews
- Resume management section: Dropdown to select active resume, expandable analysis history per resume
- Quick action cards: Links to Resume Analysis, Interview, Cover Letter, Interview History
- Recent analysis history: Last 5 AI analyses (type, score/quality, date)
- Recent interview history: Last 3 interviews (role, score, quality, date)

### `/cover-letter` — Cover Letter Generator
- Resume selector (saved resumes list)
- Company name, job title, job description inputs
- Generate button (10 cr) — shows letter in editable textarea
- Humanize button (15 cr) — rewrites to remove AI tone
- Download as PDF button (uses jsPDF client-side — no server call)
- Role example chips: Frontend Developer, Backend Engineer, etc.
- Roast Mode: Disabled in current code (isRoastMode = false hardcoded)

### `/credits` — Credits Page
- Shows current balance prominently
- `is_unlimited` flag shows infinity badge
- Full transaction history list with emoji icons per feature type
- Each transaction shows: feature label, timestamp, delta (+ or -)
- "Low credits" warning when below threshold (20 credits)

### `/interview/history` — Interview History
- Lists all past interviews ordered by date
- Each card: role name, date, overall score (colored), quality rating
- Expandable accordion: shows all 6 questions with per-question evaluation
- Strips `[ROAST]` prefix from role name for display

### `/admin` — Admin Panel
- Stats section: Total users, total resumes, total analyses, total interviews, platform-level credit usage
- Users table: All users with email, credit balance, join date, last activity
- Actions per user: Grant credits (input + button), Toggle unlimited (toggle switch)
- Guards: only renders if auth.user?.is_admin === true
- Uses HMAC-signed requests for grant/set-unlimited operations

### `/pricing` — Pricing
- Currently a placeholder (renders empty or static content)

### `/auth/callback` — OAuth Callback
- Handles Google OAuth PKCE redirect
- Extracts `code` from URL params
- Calls `/auth/oauth/session` to exchange code for tokens
- Redirects to dashboard or stored `redirectAfterLogin` sessionStorage value

---

## 8. Frontend — Components

### Layout
- **`Navbar.tsx`** — Persistent navbar with:
  - Logo
  - Features dropdown menu (with "Coming Soon" items grayed out)
  - Dark/light theme toggle
  - `CreditBadge` (shows balance, links to /credits)
  - Auth modal trigger (Login/Signup)
  - User menu dropdown (Dashboard, Credits, Admin if applicable, Logout)
  - Mobile hamburger menu with full feature list
  - Framer Motion for dropdown animations
- **`Footer.tsx`** — Simple footer with product links

### Analysis Components
- **`DeepAnalysisPanel.tsx`** — Renders deep analysis output:
  - Overall quality badge
  - Summary text
  - Per-section accordion cards (score badge + feedback + issues list + missing keywords chips)
  - Action items numbered list
- **`HiringIntelPanel.tsx`** — Renders 9-section hiring intelligence report:
  - Overall alignment text
  - Recruiter POV card (first impression, strong signals, concerns, verdict)
  - Skill gap tables (critical vs optional vs production gaps)
  - Deep analysis dimension cards (maturity/execution/credibility/production readiness)
  - Resume rewrites (before/after diffs)
  - Hiring readiness verdict

### Sections (Landing page)
- **`Hero.tsx`** — Full-screen hero with floating geometric shapes, Framer Motion entrance animations
- **`Features.tsx`** — Bento grid of 4 principle cards, scroll-linked animations
- **`FeatureMarquee.tsx`** — Horizontal auto-scrolling feature ticker strip
- **`HowKareeristThinks.tsx`** / **`HowKareeristThinksSignal.tsx`** — Product philosophy sections
- **`ValueNarrative.tsx`** — Why hiring intelligence matters
- **`Pricing.tsx`** — Credit pricing tiers display
- **`FinalCTA.tsx`** — Bottom conversion section
- **`ParticleField3D.tsx`** — 3D particle animation (canvas-based)
- **`Dashboard.tsx`** — Preview dashboard card (landing page section)

### UI Primitives
- **`CreditDisplay.tsx`** — CreditCard, CreditBadge, FeatureCostTag, InsufficientCreditsWarning components
- **`CreditBadge.tsx`** — Compact credits display in navbar (zap icon + balance number)
- **`HinglishToggle.tsx`** — Toggle for Hinglish mode in interview and deep analysis
- **`AuthModal.tsx`** — Login/signup modal with email + Google OAuth tabs
- **`theme-toggle.tsx`** — Dark/light mode toggle
- Standard Shadcn components: Button, Input, Textarea, Skeleton, Tooltip, etc.

---

## 9. Design System & UI/UX

### Color Palette
The design system is defined in `index.css` using CSS custom properties (HSL values):

**Light Mode:**
- Background: `0 0% 100%` (pure white)
- Foreground: `240 12% 8%` (near-black with blue undertone)
- Card: `40 15% 97%` (warm off-white)
- Primary: `240 12% 8%` (same as foreground — dark)
- Accent: `45 80% 50%` (warm gold/amber)
- Accent Teal: `175 40% 38%`
- Accent Rose: `350 35% 52%`
- Secondary: `40 12% 93%`

**Dark Mode:**
- Background: `240 10% 6%` (very dark blue-gray)
- Foreground: `40 10% 92%` (warm off-white)
- Card: `240 10% 9%`
- Primary: `40 10% 92%` (light in dark mode)
- Accent: `45 70% 52%` (warm gold, slightly muted in dark)

### Typography
- **Body**: Inter (Google Fonts, 300-700 weights)
- **Display/Headings**: Instrument Serif (Google Fonts, italic variant)
- Custom utility classes: `heading-display`, `heading-sans`, `body-large`, `text-display-xl`, `text-display-lg`

### Animation Patterns
- **Entrance**: Framer Motion `initial={{ opacity: 0, y: 20-30 }} -> animate={{ opacity: 1, y: 0 }}`
- **Scroll-linked**: `useScroll` + `useTransform` for parallax and reveal
- **Hover**: `whileHover={{ y: -8 }}` on feature cards
- **Score gauge**: Custom SVG `CircularGauge` with `requestAnimationFrame` count-up animation (900ms, cubic easing)
- **Loading states**: `Skeleton` placeholders, `Loader2` spinning icons
- **Float**: CSS `animate-float` keyframe for decorative circles

### Layout Principles
- **Resume Analysis**: IDE-like three-panel layout (flex-1 overflow-hidden on body, no page scroll)
- **AI Interview**: Centered single-column, max-width container, step-based reveal
- **Dashboard**: Standard page with Navbar + max-7xl container + responsive grid
- **Landing**: Full-screen sections, max-7xl container, generous whitespace

### UX Decisions
- **Optimistic credit deduction**: Credits are deducted locally immediately for instant UX feedback. Backend always authoritative.
- **Duplicate resume detection**: Warns user before upload if same filename exists
- **Active session detection**: Prevents double-charging for interviews
- **Cold start banner**: Shown after 4 seconds of loading to explain Render free-tier delay
- **Redirect after login**: Stores intended destination in `sessionStorage` before forcing login
- **Chunk reload on deploy**: `lazyWithRetry` auto-reloads once if Vercel deploy invalidated chunk hashes

---

## 10. Auth System

### Flow
1. **Email signup**: POST to `/auth/signup` -> Supabase creates user -> backend grants 100 credits (IP-gated) -> sets HttpOnly cookies
2. **Email login**: POST to `/auth/login` -> Supabase validates -> sets cookies
3. **Google OAuth**: Supabase PKCE flow -> redirect to `/auth/callback` -> code exchanged for session -> `/auth/oauth/session` sets cookies
4. **Session validation**: Every protected endpoint uses `CurrentUser` FastAPI dependency -> reads `access_token` from HttpOnly cookie -> validates with Supabase JWT
5. **Token refresh**: `/auth/refresh` called when tokens expire (frontend `useAuth` hook handles this)

### Cookie Setup
- `access_token`: HttpOnly, Secure (prod), SameSite=None (prod) / Lax (dev)
- `refresh_token`: HttpOnly, Secure (prod), SameSite=None (prod) / Lax (dev)
- `__krs_xsrf`: JS-readable, used for CSRF double-submit pattern

### CSRF Protection
- Production only (SameSite=Lax is sufficient in dev)
- Backend `CSRFMiddleware` compares `X-CSRF-Token` header against `__krs_xsrf` cookie
- Frontend `getCsrfToken()` reads cookie and attaches to all non-GET requests
- Constant-time comparison (`hmac.compare_digest`) prevents timing attacks

---

## 11. Credit System

### Flow
```
User clicks feature button
        |
        v
Frontend: canUse(feature) check -> block if insufficient
        |
        v
API call -> Backend: deduct_credits() PostgreSQL RPC (atomic)
        |
        v
If AI fails -> refund_credits() called
        |
        v
Frontend: refresh() re-fetches balance
```

### Feature Costs
| Feature | Credits |
|---|---|
| ATS Score | 5 |
| Deep Analysis | 15 |
| Hiring Intel | 25 |
| Mock Interview | 25 |
| Cover Letter | 10 |
| Humanize | 15 |

### Anti-farming
- IP check on signup: only one IP can claim the initial 100 credits
- Per-feature rate limiting via SlowAPI
- Admin can grant unlimited flag to bypass credit checks entirely

### Daily Credits
- After initial 100 credits used, users get 50 credits/day
- Checked via `/auth/me` response which includes `daily_grant` object
- `already_granted_today`: bool, `not_eligible`: bool (still has initial credits)

---

## 12. AI / LLM Pipeline

### LLM: Groq (qwen3-27b)
- All AI features use the same Groq endpoint
- `chat_complete()` in `llm_client.py` centralizes the call
- Response format: `{"type": "json_object"}` for structured outputs
- Temperature: 0.25 for analysis (deterministic), 0.6+ for creative (cover letter)
- Timeout: 45 seconds

### Embeddings: HuggingFace
- Model: `sentence-transformers/all-mpnet-base-v2`
- Used ONLY for JD-mode ATS scoring (cosine similarity)
- `AsyncInferenceClient` for non-blocking embedding generation

### Prompt Security
- All user inputs (resume text, JD) are passed through `sanitize_user_text()` before inclusion in prompts
- Unicode NFKC normalization prevents fullwidth homoglyph tag bypasses
- HTML comments (`<!--...-->`) are stripped
- Multi-pass delimiter tag removal strips nested injection tags (e.g. `<RES<RESUME_TEXT>UME_TEXT>`)
- Common natural language overrides and system prompt extraction patterns are filtered
- XML-tagged blocks signal untrusted data
- System prompts explicitly forbid following instructions found in user data

### AI Retry Strategy
- `with_ai_retry()` wraps all LLM calls
- Exponential backoff, max 3 retries
- Handles: rate limits, connection errors, malformed JSON (retried)

---

## 13. Security Implementation

### Middleware Stack (outermost to innermost)
1. `RequestLoggerMiddleware` — logs all requests
2. `ProxyHeadersMiddleware` — trusts X-Forwarded-For (prod only)
3. `CSRFMiddleware` — double-submit CSRF protection (prod only)
4. `BodySizeLimitMiddleware` — rejects bodies >1MB (except /resumes/upload)
5. `SecurityHeadersMiddleware` — standard security headers
6. `CORSMiddleware` — allowlist of origins

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(self), geolocation=()`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy` (strict in prod)
- `Strict-Transport-Security` (HTTPS only, also applied via Vercel for frontend)

### Rate Limiting (SlowAPI)
- Per-user + per-IP limits on all expensive endpoints
- Interview has separate rate limit key
- 429 responses returned for violations

### Error Monitoring
- Sentry initialized before app creation
- 10% traces sample rate
- `send_default_pii=False` (GDPR)
- Both frontend and backend Sentry DSNs configured

---

## 14. State Management

### Global State (React Context)
- **`AuthContext`** — wraps `useAuth()` hook result; provides `isAuthenticated`, `user`, `login()`, `logout()`, `isLoading`. Also renders `ColdStartBanner` after 4s of loading.
- **`CreditContext`** — wraps credit balance, feature costs, `canUse()`, `shortfall()`, `refresh()`, `deductLocal()`. Fetches balance on auth + exposes globally.

### Server State (React Query)
- Used via `QueryClient` in `App.tsx`
- Some pages use React Query for specific data fetching (e.g., dashboard)
- Most pages use local `useState` + direct API calls

### Local Component State
- Resume analysis: all state is local to `ResumeAnalysis.tsx` (no global state for analysis results)
- Interview: all state is local to `AIInterview.tsx`

---

## 15. Deployment

| Service | Platform | Tier | URL pattern |
|---|---|---|---|
| Frontend | Vercel | Free | `kareerist.vercel.app` or custom domain |
| Backend | Render | Free | `<name>.onrender.com` |
| Database | Supabase | Free | `<project>.supabase.co` |
| Redis | Upstash | Free | `<region>.upstash.io` |
| Monitoring | Sentry | Free | |

### Environment Variables

**Backend (`backend/app/.env`)**:
```
GROQ_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE=
SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=
HUGGINGFACE_API_KEY=
REDIS_URL=
SENTRY_DSN=
ENVIRONMENT=production|development
CORS_ORIGINS=https://kareerist.vercel.app
DEV_BYPASS_USER_ID=<uuid>  # for local dev
```

**Frontend (`FRONTEND/.env.local`)**:
```
VITE_API_BASE=https://<render-url>  # empty in dev (uses Vite proxy)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Keep-Alive
- Render free tier spins down after 15 min idle -> 20-30s cold start
- Frontend shows `ColdStartBanner` after 4s
- UptimeRobot or cron-job.org pings `/ping` every 10 minutes to prevent cold starts

---

## 16. Known Quirks & Decisions

1. **`deductLocal()` is active** — `CreditContext.tsx` performs an optimistic local deduction immediately when a feature button is clicked, updating the displayed balance instantly. The backend is always authoritative; `refreshCredits()` re-fetches the real balance after each call.

2. **Roast Mode is dead** — Was an earlier feature where the LLM would be brutally harsh. The API functions (`apiGenerateRoastCoverLetter`) still exist in `api.ts` and some imports remain in `interview.py`, but the UI toggle is hardcoded to `false`. The `generate_roast_questions()` and `evaluate_roast_answer()` functions still exist in `ai_interview.py`.

3. **Hinglish toggle** — A `HinglishToggle` UI component exists and is used in the Interview setup. When enabled, interview questions and evaluations are generated in Hinglish (Hindi-English mix). Implementation in `ai_interview.py` via a language parameter passed to prompts. The feature is real and works.

4. **PDF edit mode is local-only** — The "Edit Text" mode in Resume Analysis shows extracted text in an editable textarea. Changes are NOT sent to the server or used in analysis. The original parsed text stored in the DB is always used for AI calls.

5. **Cover letter PDF is client-side** — jsPDF runs entirely in the browser. No server-side PDF generation for cover letters (contrast with ReportLab which exists in the backend but is not used for this).

6. **Vite proxy in dev** — `vite.config.ts` has proxy rules for `/api` -> `localhost:8000`. Production uses `VITE_API_BASE`.

7. **Daily credit grant UX gap** — Implemented in backend. Frontend reads it from the `/auth/me` response's `daily_grant` field but the UX for claiming it may not be prominently surfaced yet.

8. **`CreditContext.canUse()` uses hardcoded `FEATURE_COSTS`** — The context fetches feature costs from the API and stores them in `featureCosts` state, but `canUse()` uses a local `FEATURE_COSTS` constant (not the fetched data). If costs change server-side, the frontend will not reflect it without code changes.

9. **Admin routes are client-guarded only** — The backend does properly guard admin routes, but the frontend's `/admin` route is accessible to any authenticated user who knows the URL — it just will not work without `is_admin: true` in the backend response.

10. **Tests cover backend only** — 22 pytest tests in `backend/tests/`. No frontend tests.

---

## 17. What's Planned / Coming Soon

From the Navbar "Coming Soon" items:
- **Career Roadmaps** — Personalized career growth planning
- **Resume Template Generator** — Generate polished resume templates
- **AI Project Recommender** — Get project ideas to boost portfolio
- **Job Tracker** — Organize and track job applications
- **Payment Integration** — Post-MVP (Razorpay or Stripe)
- **LinkedIn Profile Optimizer** — Listed in navbar items

Current status flags from README:
- Auth (email + Google OAuth) — COMPLETE
- Resume Upload + Parsing — COMPLETE
- ATS Scoring (with/without JD) — COMPLETE
- Deep Analysis — COMPLETE
- Hiring Intelligence — COMPLETE
- AI Mock Interview — COMPLETE
- Cover Letter + Humanizer — COMPLETE
- Cover Letter PDF (client-side, jsPDF) — COMPLETE
- Hinglish Toggle (Deep Analysis + Interview) — COMPLETE
- Credit System — COMPLETE
- Admin Panel — COMPLETE
- Error Monitoring (Sentry) — COMPLETE
- Request Signing (Admin ops) — COMPLETE
- RLS on ai_analyses — COMPLETE
- Test Suite — COMPLETE
- Payment Integration — POST-MVP

---


```

---

*Document last updated: September 6, 2026. Reflects git main branch as of that date.*
