# Diagram 11: State Management Flow

[← Back to Master Index](../../ARCHITECTURE_FLOWCHARTS.md)

---

```mermaid
graph TD
    classDef context fill:#0891b2,color:#fff,stroke:#0e7490
    classDef local fill:#1d4ed8,color:#fff,stroke:#1e40af
    classDef persist fill:#ca8a04,color:#fff,stroke:#a16207

    subgraph GLOBAL_STATE["Global State (React Context)"]
        AUTH_STATE["AuthContext<br/>• user: {id, email} | null<br/>• isAdmin: bool<br/>• isLoading: bool<br/>• isSubmitting: bool<br/>• error: string<br/>Initialized: useAuth() on mount via GET /auth/me<br/>Persists: across navigation<br/>Resets: on logout or 401"]

        CREDIT_STATE["CreditContext<br/>• balance: {remaining, total_granted, used, is_unlimited, low_credits}<br/>• featureCosts: {feature: {cost, label}}<br/>• isLoading: bool<br/>Initialized: on auth.isAuthenticated -> fetchAll()<br/>Updated: refresh() after feature use<br/>Optimistic: deductLocal(feature) -> -cost immediately<br/>Persists: across navigation<br/>Resets: on logout"]
    end

    subgraph LOCAL_STATE["Local State (useState per page)"]
        LS1["ResumeAnalysis.tsx<br/>• resumeFile, uploadedResumes<br/>• atsResult, deepResult, intelResult<br/>• activeTab, isLoading flags"]
        LS2["AIInterview.tsx<br/>• phase: setup|active|complete<br/>• questions, currentQuestion<br/>• evaluations, report<br/>• isRecording, audioBlob"]
        LS3["CoverLetter.tsx<br/>• generatedContent, applicationId<br/>• isHumanized, editedContent<br/>• pdfUrl"]
        LS4["AdminPage.tsx<br/>• stats, users, selectedUser<br/>• searchQuery, activeTab"]
    end

    subgraph PERSIST["Persistence (survives page refresh)"]
        LS["localStorage<br/>• __krs_access_token<br/>• __krs_refresh_token"]
        SS["sessionStorage<br/>• __krs_csrf (CSRF token)<br/>• chunk-reload (chunk error flag)"]
        REDIS["Redis (server-side)<br/>• interview:session:{uid}<br/>TTL: 45 min"]
    end

    subgraph SERVER_STATE["Server State (TanStack Query)"]
        SQ["QueryClient (App.tsx)<br/>Used by: DashboardPage only<br/>GET /dashboard/summary<br/>default stale/cache config"]
    end

    AUTH_STATE -->|isAuthenticated change| CREDIT_STATE
    AUTH_STATE -->|tokens| LS
    AUTH_STATE -->|csrf token| SS
    CREDIT_STATE -->|deductLocal()| LS1
    CREDIT_STATE -->|deductLocal()| LS2
    CREDIT_STATE -->|deductLocal()| LS3
    class AUTH_STATE,SQ,CREDIT_STATE context;
    class LS4,LS1,LS3,LS2 local;
    class REDIS,SS,LS persist;
```
