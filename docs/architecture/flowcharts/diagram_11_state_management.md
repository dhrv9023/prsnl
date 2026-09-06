# Diagram 11: State Management & React Context Architecture

[← Back to Architecture Hub](../README.md) · [← Documentation Hub](../../README.md)

---

## 🧠 State Flow Architecture (At a Glance)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GLOBAL REACT CONTEXTS                             │
│                                                                             │
│  ┌─────────────────────────────┐           ┌─────────────────────────────┐  │
│  │         AuthContext         │           │        CreditContext        │  │
│  │ • user: {id, email} | null  │──────────►│ • balance: remaining, used  │  │
│  │ • isAdmin: boolean          │  Triggers │ • canUse(feature): boolean  │  │
│  │ • isLoading: boolean        │  balance  │ • deductLocal(feature)      │  │
│  │ • ColdStartBanner (>4s)     │  fetch    │ • refreshCredits(): backend │  │
│  └─────────────────────────────┘           └─────────────────────────────┘  │
│                                                           │                 │
│                                                           │ Real-Time Sync  │
│                                                           ▼                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                           PAGE LOCAL STATE                            │  │
│  │ • ResumeAnalysis: ATS result, deep analysis, 45s slow intel timer     │  │
│  │ • AIInterview: MediaRecorder audio blobs, question array, report      │  │
│  │ • CoverLetter: Draft editor, humanizer text buffer, PDF preview       │  │
│  │ • AdminPage: Search query, activity modal tab selection               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Persistence
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PERSISTENCE LAYERS                               │
│  • HttpOnly Cookies: __krs_sid (Session JWT), __krs_rid (Refresh Token)     │
│  • Browser sessionStorage: __krs_xsrf (CSRF token for double-submit)        │
│  • Redis Cache (Server): interview:session:{uid} (45-min TTL)               │
│  • PostgreSQL DB: Profiles, Resumes, Analyses, Credit Transactions          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Technical Flowchart (Mermaid)

```mermaid
flowchart TD
    subgraph GLOBAL["Global Contexts (App.tsx)"]
        AUTH["AuthContext<br/>user, login, logout, cold-start"]
        CRED["CreditContext<br/>balance, canUse(), deductLocal(), refresh()"]
        ROAST["RoastModeContext<br/>roast toggles across tools"]
        
        AUTH -->|When authenticated| CRED
    end

    subgraph LOCAL["Page-Level State (useState)"]
        P_RESUME["ResumeAnalysis.tsx<br/>• atsResult, deepResult<br/>• intelSlowWarning timer"]
        P_INTERVIEW["AIInterview.tsx<br/>• questions, currentStep<br/>• MediaRecorder audio stream"]
        P_LETTER["CoverLetter.tsx<br/>• letterText, isHumanized"]
        
        CRED -.->|deductLocal() optimistic| P_RESUME
        CRED -.->|deductLocal() optimistic| P_INTERVIEW
        CRED -.->|deductLocal() optimistic| P_LETTER
    end

    subgraph SYNC["Backend Reconciliation"]
        BE_RPC["FastAPI / PostgreSQL<br/>Authoritative Balance"]
        P_RESUME -->|refreshCredits()| BE_RPC
        P_INTERVIEW -->|refreshCredits()| BE_RPC
        P_LETTER -->|refreshCredits()| BE_RPC
        BE_RPC -->|Update balance| CRED
    end
```

---

## 🔄 State Lifecycle Reference

| Context / State | Lifetime | Scope | Primary Triggers |
|---|---|---|---|
| **`AuthContext`** | Mount until Logout | Global | `GET /auth/me`, Google OAuth PKCE callback, explicit logout. |
| **`CreditContext`** | Mount until Logout | Global | `AuthContext` sign-in event, `deductLocal()` optimistic subtraction, `refreshCredits()` API sync. |
| **`RoastModeContext`** | Session | Global | Header toggle switch enabling spicy cover letter roast mode. |
| **`ResumeAnalysis`** | Route Navigation | Local Page | Resume upload, analyze button click, 45-second slow warning timer. |
| **`AIInterview`** | Route / Session | Local + Redis | Question submission, voice audio transcription, interview finish. |
