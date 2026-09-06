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

---

## 📊 Technical Flowchart (Mermaid)

```mermaid
flowchart TD
    classDef client fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc
    classDef edge fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc
    classDef backend fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc
    classDef supa fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#f8fafc
    classDef redis fill:#14532d,stroke:#4ade80,stroke-width:2px,color:#f8fafc
    classDef ai fill:#3b0764,stroke:#c084fc,stroke-width:2px,color:#f8fafc
    classDef mon fill:#4c0519,stroke:#fb7185,stroke-width:2px,color:#f8fafc

    subgraph TIER1["1. Client Tier"]
        BROWSER["<b>User Web Browser</b><br/>Chrome · Safari · Firefox · Mobile"]:::client
    end

    subgraph TIER2["2. Edge & Frontend Layer (Vercel CDN)"]
        SPA["<b>React 18 Single Page Application</b><br/>TypeScript · Vite · Tailwind · Shadcn UI<br/><i>State: AuthContext & CreditContext</i>"]:::edge
    end

    subgraph TIER3["3. API Gateway & Backend Tier (Render)"]
        direction TB
        MW["<b>FastAPI Middleware Pipeline</b><br/>RequestLogger ➔ ProxyHeaders ➔ CSRF ➔ BodySizeLimit ➔ SecurityHeaders"]:::backend
        API["<b>FastAPI 0.128 REST Backend (Python 3.13)</b><br/>SlowAPI Rate Limiter · Pydantic v2 Models<br/><i>Routers: /auth · /resumes · /analysis · /interview · /credits · /admin</i>"]:::backend
        MW --> API
    end

    subgraph TIER4["4. Persistence & External Services Tier"]
        direction TB
        
        subgraph SUPABASE["Supabase Cloud Platform"]
            AUTH["<b>Supabase Auth</b><br/>JWT HS256 Validation & Google PKCE OAuth"]:::supa
            DB[("<b>PostgreSQL 15 Database</b><br/>9 User-Scoped Tables · Row Level Security (RLS)<br/>Atomic Stored Procedures (deduct_credits, grant_credits)")]:::supa
            STORE["<b>Supabase Storage</b><br/>Bucket: Resumes (AES-256 Encrypted PDFs)"]:::supa
        end

        subgraph CACHE["In-Memory Cache"]
            REDIS[("<b>Upstash Redis Cache</b><br/>• Active Interview Sessions (45-min TTL)<br/>• SlowAPI Rate Limit Sliding Counters")]:::redis
        end

        subgraph AISERVICES["AI Inference Providers"]
            GROQ["<b>Groq Cloud LPU</b><br/>• llama-3.3-70b-versatile (Critique, Intel, Letters)<br/>• whisper-large-v3-turbo (Voice Audio STT)"]:::ai
            HF["<b>HuggingFace Hub</b><br/>sentence-transformers/all-mpnet-base-v2"]:::ai
        end

        subgraph OBS["Telemetry"]
            SENTRY["<b>Sentry Telemetry</b><br/>Error Tracking & Performance Tracing"]:::mon
        end
    end

    BROWSER -->|1. HTTPS / WSS Navigation| SPA
    SPA -->|2. REST API Calls (/api/v1)<br/>HttpOnly Session Cookies + CSRF Header| MW
    API -->|3. Verify JWT & OAuth Session| AUTH
    API -->|4. SQL Queries & Atomic RPCs| DB
    API -->|5. Store & Fetch Resume PDFs| STORE
    API -->|6. Session Cache & Rate Limits| REDIS
    API -->|7. LLM Chat & Audio Transcription| GROQ
    API -->|8. Sentence Embeddings Cosine Distance| HF
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
