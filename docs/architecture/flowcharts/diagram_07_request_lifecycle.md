# Diagram 7: Request Lifecycle (End-to-End: ATS Score Analysis)

[← Back to Master Index](../../ARCHITECTURE_FLOWCHARTS.md)

---

```mermaid
graph TD
    classDef frontend fill:#1d4ed8,color:#fff,stroke:#1e40af
    classDef backend fill:#15803d,color:#fff,stroke:#166534
    classDef db fill:#ca8a04,color:#fff,stroke:#a16207
    classDef auth fill:#dc2626,color:#fff,stroke:#b91c1c
    classDef error fill:#ea580c,color:#fff,stroke:#c2410c
    classDef external fill:#7c3aed,color:#fff,stroke:#6d28d9

    Click["User clicks 'Analyze ATS Score'<br/>ResumeAnalysis.tsx"]
    Click --> ClientVal{resume_id<br/>exists?}
    ClientVal -->|No| ShowError["Show: Please upload resume first"]
    ClientVal -->|Yes| DeductLocal["deductLocal('ats_score')<br/>optimistically -5 from UI"]
    DeductLocal --> APICall["apiGetAtsScore(resume_id, jd?)<br/>POST /api/v1/analysis/match<br/>Headers: Authorization: Bearer {token}<br/>X-CSRF-Token: {csrf_token}"]

    APICall --> MW1["RequestLoggerMiddleware<br/>log: method+path+status"]
    MW1 --> MW2["CORSMiddleware<br/>check Origin header"]
    MW2 --> MW3["CSRFMiddleware (prod only)<br/>cookie __krs_xsrf == header X-CSRF-Token?"]
    MW3 -->|Mismatch -> 403| Err403("403 CSRF Mismatch")
    MW3 -->|Pass| MW4["BodySizeLimitMiddleware<br/>Content-Length <= 1MB?"]
    MW4 -->|Too large -> 413| Err413("413 Body Too Large")
    MW4 -->|Pass| RateCheck["SlowAPI @limiter.limit<br/>5/hour per IP+userId<br/>Redis counter lookup"]
    RateCheck -->|Exceeded -> 429| Err429("429 Rate Limit")
    RateCheck -->|Pass| AuthDep["get_current_user()<br/>read __krs_sid cookie OR Authorization header<br/>supabase.auth.get_user(token)"]
    AuthDep -->|Invalid -> 401| Err401("401 Session expired")
    AuthDep -->|Valid user obj| CreditDep["require_credits('ats_score', 5)<br/>deduct_feature_credits()<br/>check is_unlimited flag<br/>call deduct_credits RPC"]
    CreditDep -->|Insufficient -> 402| Err402("402 Insufficient Credits")
    CreditDep -->|Deducted, remaining=N| RouteHandler["ats_score_calculator()<br/>ai_analysis.py:20"]

    RouteHandler -->|SELECT parsed_content FROM resumes<br/>WHERE id=? AND user_id=?| ResumeDB[(resumes table)]
    ResumeDB -->|Not found -> 404| Err404("404 Resume Not Found")
    ResumeDB -->|resume_text| ATSEngine["ats_score(resume_text, jd?)<br/>math_engine.py<br/>jd provided? -> HuggingFace embeddings<br/>no jd? -> rule-based scoring"]

    ATSEngine -->|with JD| HFApi["HuggingFace API<br/>feature-extraction<br/>cosine similarity"]
    ATSEngine -->|no JD| RuleBased["ats_general_engine.py<br/>keyword density, sections,<br/>action verbs, quantification"]
    HFApi --> ScoreResult["score: 0-100<br/>mode: jd_match|general"]
    RuleBased --> ScoreResult

    ScoreResult --> SaveAnalysis["INSERT INTO ai_analyses<br/>{resume_id, user_id, analysis_type,<br/>output_data:{score,mode,details}}"]
    SaveAnalysis -->|DB fail (non-fatal)<br/>logger.warning| ReturnResult
    SaveAnalysis --> ReturnResult["return match_result<br/>200 {score, mode, breakdown, ...}"]

    ReturnResult --> FrontendState["ResumeAnalysis.tsx<br/>setAtsResult(data)<br/>refresh() CreditContext balance"]
    FrontendState --> UIUpdate["Show score gauge<br/>Update credit display<br/>Remove loading spinner"]

    RouteHandler -->|AI call returns None or raises| AIFailure["generate_X() = None<br/>(Groq timeout / JSON error)"]
    AIFailure --> RefundCheck["refund_feature_credits()<br/>grant_credits RPC +15 or +25<br/>writes credit_transactions row<br/>feature='ai_failure_refund'"]
    RefundCheck --> Err502["502 'credits refunded, try again'<br/>Frontend shows error toast<br/>refresh() corrects local balance"]
    class UIUpdate,Click,FrontendState,APICall,DeductLocal frontend;
    class AuthDep,ClientVal,MW3 auth;
    class Err413,Err403,ShowError,Err404,Err401,Err402,Err429,Err502 error;
    class MW1,RouteHandler,RateCheck,MW2,ATSEngine,ReturnResult,ScoreResult,RuleBased,MW4,AIFailure backend;
    class RefundCheck,CreditDep,SaveAnalysis db;
    class HFApi external;
```

> **Sep 6, 2026:** The `AIFailure → RefundCheck` path was added to `/deep` and `/hiring-intel` endpoints. Previously `RefundCheck` was never called, causing users to lose credits on Groq failures.
