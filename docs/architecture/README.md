# System Architecture & Flowchart Hub

Welcome to the **Kareerist System Architecture Hub**. This directory provides visual flowcharts, technical schematics, and an interactive diagram canvas for every subsystem in the platform.

---

## 🎨 Interactive Architecture Canvas

For a dynamic, zoomable, and searchable visual map of the entire architecture, open the standalone HTML viewer in your browser:

```bash
# Open in your default browser (Linux)
xdg-open docs/architecture/architecture_viewer.html

# Or on macOS
open docs/architecture/architecture_viewer.html
```

> **Features:** Miro-style canvas navigation (Pan/Zoom/Drag), node search, live state inspection, scorecard audit, and categorized subsystem filtering.

---

## 📐 High-Level System Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             USER WEB BROWSER                                │
│                     (Chrome / Safari / Firefox / Edge)                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / WSS
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          VERCEL GLOBAL EDGE CDN                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     FRONTEND APPLICATION (SPA)                        │  │
│  │  React 18 · TypeScript · Vite · Tailwind CSS · Shadcn UI · Lucide     │  │
│  │  TanStack Query (server state) · Context (Auth, Credits, RoastMode)   │  │
│  │  Security: Strict-Transport-Security · nosniff · DENY · microphone    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ /api/v1 (REST JSON + HttpOnly Cookies)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RENDER CLOUD PLATFORM                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    FASTAPI 0.128 BACKEND (Python 3.13)                │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                       MIDDLEWARE PIPELINE                       │  │  │
│  │  │  1. RequestLogger  2. ProxyHeaders  3. CSRFMiddleware (Prod)    │  │  │
│  │  │  4. BodySizeLimit  5. SecurityHeaders (CSP, Permissions) 6.CORS │  │  │
│  │  └────────────────────────────────┬────────────────────────────────┘  │  │
│  │                                   │                                   │  │
│  │  ┌────────────────────────────────▼────────────────────────────────┐  │  │
│  │  │                         ROUTER DISPATCH                         │  │  │
│  │  │  /auth          /resumes       /analysis      /interview        │  │  │
│  │  │  /cover_letter  /credits       /admin         /health           │  │  │
│  │  └────────────────────────────────┬────────────────────────────────┘  │  │
│  │                                   │                                   │  │
│  │  ┌────────────────────────────────▼────────────────────────────────┐  │  │
│  │  │                         SERVICE LAYER                           │  │  │
│  │  │  • prompt_sanitizer (NFKC, HTML comment strip, 3-pass tag loop) │  │  │
│  │  │  • ats_general_engine & ats_jd_engine (Keyword/MPNet Embeddings)│  │  │
│  │  │  • credits (Atomic PostgreSQL RPCs, refunds on 502 failures)    │  │  │
│  │  │  • llm_client & ai_retry (Exponential backoff, JSON validation) │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────┬──────────────────┬───────────────────┬───────────────────────┘
               │                  │                   │
               ▼                  ▼                   ▼
┌──────────────────────┐ ┌──────────────────┐ ┌───────────────────────────────┐
│   SUPABASE CLOUD     │ │  UPSTASH REDIS   │ │         AI PROVIDERS          │
│                      │ │                  │ │                               │
│ • Supabase Auth      │ │ • Interview      │ │ • Groq Cloud (Qwen / LLaMA 3) │
│   (JWT, PKCE OAuth)  │ │   Session State  │ │   - Deep Critique             │
│ • PostgreSQL 15 DB   │ │   (45-min TTL)   │ │   - Hiring Intelligence       │
│   (9 tables + RLS)   │ │ • SlowAPI Rate   │ │   - Cover Letter Generation   │
│ • Atomic RPCs        │ │   Limit Counters │ │ • Groq Whisper v3 Turbo       │
│   (deduct, refund)   │ │   (Per-IP/User)  │ │   - Voice STT transcription   │
│ • Storage Bucket     │ │                  │ │ • HuggingFace Hub             │
│   (Encrypted PDFs)   │ │                  │ │   - all-mpnet-base-v2 Embed   │
└──────────────────────┘ └──────────────────┘ └───────────────────────────────┘
```

---

## 📚 Complete Flowchart Catalog

Each diagram below includes a **high-contrast ASCII schematic**, a **refined Mermaid flowchart**, an **in-depth step-by-step lifecycle walkthrough**, and an **architectural component reference**:

| # | Diagram Name | Description & Core Focus | Direct Link |
|---|---|---|---|
| **01** | **Master System Overview** | End-to-end multi-cloud topology, request lifecycle, middleware, and external AI bridges. | [View Diagram 1](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/architecture/flowcharts/diagram_01_system_overview.md) |
| **02** | **Authentication & Session** | Email/password sign-up, Google OAuth PKCE exchange, HttpOnly JWT cookies, and CSRF protection. | [View Diagram 2](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/architecture/flowcharts/diagram_02_auth_session.md) |
| **03** | **Complete API Route Map** | Full inventory of FastAPI endpoints, HTTP methods, rate limits, credit costs, and payload guards. | [View Diagram 3](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/architecture/flowcharts/diagram_03_route_map.md) |
| **04** | **Database Schema & ERD** | PostgreSQL relational schema, foreign keys, RLS security policies, and atomic RPC procedures. | [View Diagram 4](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/architecture/flowcharts/diagram_04_db_schema.md) |
| **05** | **Frontend Component Tree** | React 18 component hierarchy, lazy-loaded routes, state contexts, and modal overlays. | [View Diagram 5](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/architecture/flowcharts/diagram_05_frontend_components.md) |
| **06** | **Blog System Architecture** | Decoupled blog micro-frontend, Supabase CMS schema, and static markdown rendering. | [View Diagram 6](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/architecture/flowcharts/diagram_06_blog_system.md) |
| **07** | **Request Lifecycle & Middleware** | Execution order of 6 middleware layers, JWT extraction, CSRF validation, and error guards. | [View Diagram 7](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/architecture/flowcharts/diagram_07_request_lifecycle.md) |
| **08** | **Error Handling & Failure Recovery** | Automatic credit refunding on 502 LLM errors, Sentry telemetry, and retry loops. | [View Diagram 8](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/architecture/flowcharts/diagram_08_error_failures.md) |
| **09** | **Production Deployments** | Vercel CDN, Render Web Service, Supabase Database, Upstash Redis, and environment configs. | [View Diagram 9](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/architecture/flowcharts/diagram_09_deployments.md) |
| **10** | **QA Testing Matrix** | Automated pytest suite (37 unit tests), categories, assertions, and verification criteria. | [View Diagram 10](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/architecture/flowcharts/diagram_10_qa_tests.md) |
| **11** | **State Management & React Context** | Global Auth, Credit, and RoastMode Contexts, TanStack Query caching, and local UI state. | [View Diagram 11](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/architecture/flowcharts/diagram_11_state_management.md) |
| **12** | **Dependency Graphs** | Python backend dependencies, Node.js packages, and external cloud microservices. | [View Diagram 12](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/architecture/flowcharts/diagram_12_dependencies.md) |

---

[← Back to Central Documentation Hub](../README.md)
