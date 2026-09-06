# Diagram 1: Master System Overview

[← Back to Architecture Hub](../README.md) · [← Documentation Hub](../../README.md)

---

## 🖥️ Visual System Topology (At a Glance)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             1. USER BROWSER                                 │
│  • React 18 SPA (TypeScript + Vite)                                         │
│  • Manages AuthContext, CreditContext & RoastModeContext                    │
│  • Interacts via Fetch with HttpOnly Session Cookies + CSRF Header          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         2. EDGE CDN & PROXY LAYER                           │
│  • Vercel Edge CDN: Serves static assets, fonts, icons                     │
│  • Security: Strict-Transport-Security, nosniff, DENY, microphone=(self)   │
│  • API Proxy in Dev: Vite proxy /api -> http://localhost:8000               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST / JSON
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         3. FASTAPI BACKEND SERVICE                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Middlewares: Logger -> ProxyHeaders -> CSRF -> BodyLimit -> SecHeaders │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Route Pipeline: RateLimit (SlowAPI) -> Auth (JWT) -> Credit Guard     │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Service Logic: Prompt Sanitizer, ATS Scorer, Groq LLM, Whisper STT    │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
└──────────────┬───────────────────────┼───────────────────────┬──────────────┘
               │                       │                       │
               ▼                       ▼                       ▼
┌───────────────────────────┐ ┌───────────────────┐ ┌─────────────────────────┐
│     SUPABASE PLATFORM     │ │   UPSTASH REDIS   │ │       AI ENGINES        │
│ • Auth: PKCE & JWT Verify │ │ • Session State   │ │ • Groq Cloud (Qwen)     │
│ • PostgreSQL 15 DB + RLS  │ │   (45-min TTL)    │ │ • Groq Whisper STT      │
│ • Atomic Credit RPCs      │ │ • Rate Limit      │ │ • HuggingFace MPNet     │
│ • Resumes Storage Bucket  │ │   Counters        │ │   Embeddings            │
└───────────────────────────┘ └───────────────────┘ └─────────────────────────┘
```

> 💡 **Quick Visual Preview:** In Antigravity IDE / VS Code, press **Ctrl + Shift + V** (or click the **Open Preview to the Side** icon at the top right of this editor) to view this flowchart rendered visually.
> 🌐 **Interactive Canvas Viewer:** You can also open [architecture_viewer.html](../architecture_viewer.html) directly in any web browser to pan, zoom, and inspect components.

---

## 📊 Technical Flowchart (Mermaid)

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': {'fontSize': '15px', 'fontFamily': 'Inter, system-ui, sans-serif'}, 'flowchart': {'nodeSpacing': 85, 'rankSpacing': 100, 'padding': 24, 'curve': 'basis'}}}%%
flowchart TD
    classDef client fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc
    classDef edge fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc
    classDef backend fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc
    classDef supa fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#f8fafc
    classDef redis fill:#14532d,stroke:#4ade80,stroke-width:2px,color:#f8fafc
    classDef ai fill:#3b0764,stroke:#c084fc,stroke-width:2px,color:#f8fafc
    classDef mon fill:#4c0519,stroke:#fb7185,stroke-width:2px,color:#f8fafc

    subgraph TIER1["Tier 1: Client Application Layer"]
        BROWSER["<b>User Web Browser</b><br/>Desktop (Chrome · Firefox · Safari) & Mobile Browsers<br/><i>Renders Single Page Application</i>"]:::client
    end

    subgraph TIER2["Tier 2: Edge Delivery & Static Hosting (Vercel CDN)"]
        SPA["<b>React 18 Single Page Application</b><br/>TypeScript · Vite · TailwindCSS · Shadcn UI<br/><i>Client State: AuthContext · CreditContext · RoastMode</i>"]:::edge
    end

    subgraph TIER3["Tier 3: Core API Services & Security (Render PaaS)"]
        direction TB
        MW["<b>FastAPI Middleware Stack</b><br/>RequestLogger ➔ ProxyHeaders ➔ CSRF ➔ BodySizeLimit ➔ SecurityHeaders"]:::backend
        API["<b>FastAPI 0.128 Application Server</b><br/>Python 3.13 · SlowAPI Rate Limiting · Pydantic v2 Models<br/><i>Routers: /auth · /resumes · /analysis · /interview · /credits · /admin</i>"]:::backend
        MW --> API
    end

    subgraph TIER4["Tier 4: Cloud Data, Cache & External AI Inference Services"]
        direction LR

        subgraph COL_DATA["Database & Storage (Supabase)"]
            direction TB
            AUTH["<b>Supabase Auth Service</b><br/>JWT HS256 & Google PKCE OAuth"]:::supa
            DB[("<b>PostgreSQL 15 Database</b><br/>9 User Tables · RLS Policies<br/>Atomic Credit RPC Functions")]:::supa
            STORE["<b>Supabase Storage</b><br/>Encrypted Resume PDFs Bucket"]:::supa
        end

        subgraph COL_CACHE["Session & Rate Cache"]
            direction TB
            REDIS[("<b>Upstash Redis</b><br/>45-min Mock Interview State<br/>SlowAPI IP Rate Counters")]:::redis
        end

        subgraph COL_AI["AI Inference Cloud"]
            direction TB
            GROQ["<b>Groq Cloud LPU Engine</b><br/>• Llama 3.3 70B (Critique & Letters)<br/>• Whisper v3 Turbo (Speech STT)"]:::ai
            HF["<b>HuggingFace Hub API</b><br/>• sentence-transformers embeddings"]:::ai
        end

        subgraph COL_OBS["Telemetry"]
            direction TB
            SENTRY["<b>Sentry APM</b><br/>Error Tracking & Tracing"]:::mon
        end
    end

    BROWSER -->|1. HTTPS / WSS Requests| SPA
    SPA -->|2. REST API Calls to /api/v1<br/>HttpOnly Cookie + CSRF Header| MW
    API -->|3. Validate JWT & OAuth| AUTH
    API -->|4. SQL Queries & Atomic Deductions| DB
    API -->|5. Store / Fetch Encrypted PDFs| STORE
    API -->|6. Interview State & Sliding Window| REDIS
    API -->|7. LLM Prompts & Audio STT| GROQ
    API -->|8. Cosine Similarity Calculation| HF
    API -.->|9. Uncaught Exceptions| SENTRY
```

---

## 🔄 End-to-End Request Lifecycle

1. **Client Request:** The user interacts with the React frontend. State changes trigger an authenticated `fetch` with `credentials: "include"`, transmitting session cookies (`__krs_sid`, `__krs_rid`) and the `X-CSRF-Token` header.
2. **Middleware Execution:** FastAPI processes the request through:
   - `RequestLoggerMiddleware`: Generates a unique `X-Request-ID` and measures latency.
   - `CSRFMiddleware`: Validates the double-submit CSRF cookie against the incoming header.
   - `BodySizeLimitMiddleware`: Rejects request payloads exceeding 1MB (bypassed for `/resumes/upload` up to 5MB).
   - `SecurityHeadersMiddleware`: Sets strict CSP, HSTS, and `Permissions-Policy: camera=(), microphone=(self), geolocation=()`.
3. **Gateway Verification:**
   - **Rate Limiting:** SlowAPI increments Redis counters; returns HTTP 429 if the quota is exceeded.
   - **Authentication:** `get_current_user` extracts the JWT from the cookie, verifies signature against Supabase JWT secret, and loads the user model.
   - **Credit Verification:** For paid features, backend executes the atomic PostgreSQL RPC `deduct_credits()`. If balance is insufficient, returns HTTP 402.
4. **Service & AI Processing:**
   - Input is sanitized via `prompt_sanitizer.py` (stripping tags, unicode normalization, comment removal).
   - The appropriate engine executes (e.g. ATS math scorer, Groq LLM with exponential retry).
   - If an LLM call fails with 502, credits are atomically refunded via `refund_feature_credits()`.
5. **Response Delivery:** Result is persisted to PostgreSQL and returned to the client as JSON.
