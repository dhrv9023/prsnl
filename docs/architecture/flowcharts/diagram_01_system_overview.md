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
    subgraph CLIENT["Client Layer (Vercel)"]
        Browser["User Browser<br/>Chrome / Safari / Firefox"]
        FE["React 18 SPA<br/>Vite · TypeScript · Tailwind"]
        Browser -->|HTTPS Navigation| FE
    end

    subgraph API_GATEWAY["API & Security Layer (Render)"]
        BE["FastAPI 0.128<br/>Python 3.13 · Uvicorn"]
        MW["Middleware Chain<br/>Logger · CSRF · Headers"]
        RL{"Rate Limit<br/>Check"}
        AC{"Auth & JWT<br/>Check"}
        CC{"Credit<br/>Balance Check"}
        
        FE -->|REST API /api/v1<br/>HttpOnly Cookies| BE
        BE --> MW --> RL
        RL -->|Exceeded -> 429| ERR429["429 Rate Limit"]
        RL -->|Pass| AC
        AC -->|Invalid -> 401| ERR401["401 Unauthorized"]
        AC -->|Pass| CC
        CC -->|Insufficient -> 402| ERR402["402 Payment Required"]
        CC -->|Sufficient| HANDLER["Endpoint Route Handler"]
    end

    subgraph PERSISTENCE["Persistence Layer (Supabase & Redis)"]
        SUPA_AUTH["Supabase Auth<br/>JWT HS256 Validation"]
        SUPA_DB["PostgreSQL 15<br/>9 Tables + RLS Policies"]
        SUPA_RPC["Atomic RPC Functions<br/>deduct_credits / refund"]
        SUPA_STORE["Storage Bucket<br/>Resume PDFs"]
        REDIS["Upstash Redis<br/>Interview State (45m TTL)"]
    end

    subgraph AI_SERVICES["External AI Services"]
        GROQ_LLM["Groq Cloud API<br/>Qwen 2.5 / LLaMA 3.3"]
        GROQ_WHISPER["Groq Whisper<br/>Voice Transcription"]
        HF_EMBED["HuggingFace Hub<br/>all-mpnet-base-v2"]
        SENTRY["Sentry Cloud<br/>Error Telemetry"]
    end

    AC -.->|Verify JWT| SUPA_AUTH
    CC -.->|Atomic Deduction| SUPA_RPC
    HANDLER -->|Query / Mutate| SUPA_DB
    HANDLER -->|Save / Fetch PDF| SUPA_STORE
    HANDLER -->|Session State| REDIS
    HANDLER -->|LLM Inference| GROQ_LLM
    HANDLER -->|Audio Audio STT| GROQ_WHISPER
    HANDLER -->|Cosine Embeddings| HF_EMBED
    BE -.->|Exception Logs| SENTRY
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
