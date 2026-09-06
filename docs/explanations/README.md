# Code Explanations & Component Manuals

[← Back to Documentation Hub](../README.md)

---

## Overview

This directory provides in-depth, file-by-file technical manuals covering the internal mechanics, inputs, outputs, error handling, and design rationale of key source files across the entire platform.

---

## 📂 Subsystem Directories

```
docs/explanations/
├── backend/       # FastAPI routers, services, AI engines, and middleware
├── frontend/      # React pages, UI components, state contexts, and hooks
├── database/      # PostgreSQL migrations, schema definitions, and RPC functions
└── blog/          # Independent blog micro-frontend architecture and CMS schema
```

---

## 1. Backend Modules ([`backend/`](./backend/))

Key FastAPI routers, services, and security utilities:

- **[auth.md](./backend/auth.md)** — Email/password authentication, Google OAuth PKCE exchange, HttpOnly session cookies, and stored XSS sanitization via `@field_validator`.
- **[ai_analysis.md](./backend/ai_analysis.md)** — ATS match scoring, deep resume analysis, hiring intelligence, multi-tenant query scoping, and automated credit refunds on 502 failures.
- **[interview.md](./backend/interview.md)** — Mock interview lifecycle, question generation, Whisper speech-to-text, audio MIME type validation, and 10MB payload size limits.
- **[prompt_sanitizer.md](./backend/prompt_sanitizer.md)** — Multi-pass prompt injection defense, Unicode NFKC normalization, HTML comment stripping, and extraction pattern filters.
- **[credits.md](./backend/credits.md)** — Credit deduction, anti-farming IP checks, daily grants, and refund RPC integrations.
- **[main.py](./backend/main.md)** — Middleware pipeline execution order: RequestLogger, ProxyHeaders, CSRF, BodySizeLimit, and SecurityHeaders (`microphone=(self)`).
- **[ats_general_engine.md](./backend/ats_general_engine.md)** & **[ats_jd_engine.md](./backend/ats_jd_engine.md)** — Rule-based ATS scoring and HuggingFace embedding cosine similarity.
- **[llm_client.md](./backend/llm_client.md)** & **[ai_retry.md](./backend/ai_retry.md)** — Async Groq client wrapper, JSON object formatting, and exponential retry loops.

---

## 2. Frontend Modules ([`frontend/`](./frontend/))

Core React 18 pages, contexts, and interactive components:

- **[AuthModal.md](./frontend/AuthModal.md)** — Authentication dialog with Google sign-in and mobile touch-scroll background locking.
- **[ResumeAnalysis.md](./frontend/ResumeAnalysis.md)** — 3-panel IDE layout with resume PDF rendering, ATS gauge, and 45s slow-load status indicator.
- **[AIInterview.md](./frontend/AIInterview.md)** — Audio recording with `MediaRecorder`, Whisper transcription, and real-time question evaluation.
- **[CreditContext.md](./frontend/CreditContext.md)** — Global credit balance management, `canUse()`, `deductLocal()` for instant UI response, and server balance synchronization.
- **[DashboardPage.md](./frontend/DashboardPage.md)** — Improvement tracker, recent resumes, and analysis history.
- **[AdminPage.md](./frontend/AdminPage.md)** — User activity inspection modal, credit grant controls, and system statistics.

---

## 3. Database & Migrations ([`database/`](./database/))

PostgreSQL table definitions and atomic stored procedures:

- **[20260513000000_credit_system.md](./database/20260513000000_credit_system.md)** — `credit_transactions`, `deduct_credits()`, and `FOR UPDATE` concurrency locks.
- **[20260515000002_interview_reports.md](./database/20260515000002_interview_reports.md)** — Final interview evaluation storage and user-scoped policies.
- **[20260517000001_daily_credits.md](./database/20260517000001_daily_credits.md)** — 50-credit daily grant logic and unique UTC date constraints.
- **[20260523000000_comprehensive_fix.md](./database/20260523000000_comprehensive_fix.md)** — Comprehensive RLS and permission fixes.

---

## 4. Standalone Blog ([`blog/`](./blog/))

Decoupled blog micro-frontend and CMS integration:

- **[overview.md](./blog/overview.md)** — Architecture and cross-origin setup.
- **[App.md](./blog/App.md)** — Markdown reader grid and featured article hero.
- **[Admin.md](./blog/Admin.md)** — In-app content management and publishing portal.
- **[supabase_migration.md](./blog/supabase_migration.md)** — `blog_posts` table schema and default career articles.
