# ai_analysis.md

**Location:** `prsnl/backend/app/api/v1/endpoints/ai_analysis.py`  
**Type:** API Endpoint

## What This File Does

Provides three distinct AI-powered resume analysis endpoints, each offering a different depth and type of feedback. The `/match` endpoint gives a quick ATS compatibility score, `/deep` provides section-by-section LLM critique of the resume, and `/hiring-intel` generates a comprehensive hiring intelligence report. All analyses are persisted to the database, deduct credits before the AI call, and **refund credits automatically** if the AI call fails — users never lose credits due to Groq timeouts or errors.

## How It Fits Into The System

- **Triggers:** Called by the frontend Resume Analysis page when the user selects an analysis type and clicks analyze.
- **Dependencies:** LLM service (Groq/OpenAI for AI generation), credit service (deduction and refund), `resumes` table (for resume text), `ai_analyses` table (for persisting results), authentication middleware.
- **Dependents:** The dashboard endpoint reads from `ai_analyses` to show latest results. The history endpoint in this same file serves past analyses. The frontend analysis panels render the structured JSON responses.

## Code Breakdown

### Match Analysis (`POST /match`)

**Cost: 5 credits**

Performs an ATS (Applicant Tracking System) compatibility analysis. Takes a resume ID and optionally a job description. Returns a numerical score and keyword match data. This is the lightest analysis — fast and cheap, suitable for quick checks.

The flow:
1. Validate user owns the resume.
2. Deduct 5 credits.
3. Fetch resume text from database.
4. Call LLM with ATS scoring prompt.
5. Parse structured response.
6. Save result to `ai_analyses` table with type `match`.
7. Return result to client.

### Deep Analysis (`POST /deep`)

**Cost: 15 credits**

Performs a detailed, section-by-section critique of the resume. The LLM evaluates each section (summary, experience, education, skills, etc.) individually, providing specific feedback, strengths, weaknesses, and improvement suggestions.

Returns a structured JSON object with per-section scores and commentary. This is the most detailed textual feedback the system provides.

### Hiring Intelligence (`POST /hiring-intel`)

**Cost: 25 credits**

The premium analysis tier. Generates a comprehensive hiring intelligence report that includes market positioning, salary insights, competitive analysis, skill gap identification, and strategic recommendations. Takes longer to generate due to the complexity of the prompt and response.

### History Endpoint (`GET /history/{resume_id}`)

Returns all past analyses for a given resume, ordered by creation date (newest first). Allows users to track how their resume has improved over time. No credit cost — it's just a database read. Enforces defense-in-depth tenant isolation by explicitly filtering with `.eq("resume_id", resume_id).eq("user_id", str(user.id))` in addition to Supabase Row Level Security (SEC-015 / VULN-014).

### Credit Refund on Failure

Both `/deep` and `/hiring-intel` endpoints call `refund_feature_credits()` from `app.services.credits` before raising HTTP 502 when `generate_deep_analysis()` or `generate_hiring_intel()` returns `None`. This ensures users never lose credits due to Groq timeouts, rate limits, or JSON parse failures.

The pattern:
```python
result = await generate_deep_analysis(...)
if not result:
    await refund_feature_credits(supabase, str(user.id), "deep_analysis", 15, "ai_failure_refund")
    raise HTTPException(502, "Deep analysis failed — your credits have been refunded.")
```

The refund is recorded in `credit_transactions` with `feature = "ai_failure_refund"` for auditability.

Note: The `/match` (ATS score) endpoint does not have this refund path because `ats_score()` uses local Python computation (no external LLM call) and is unlikely to fail in a way that credits should be returned for.

### Result Persistence

Every successful analysis is saved to the `ai_analyses` table with:
- `user_id` — who ran it
- `resume_id` — which resume was analyzed
- `analysis_type` — match, deep, or hiring-intel
- `result` — the full JSON response from the LLM
- `created_at` — timestamp

## Things To Know Before Editing

- **Credit deduction happens BEFORE the AI call.** This is intentional — it prevents race conditions where a user could spam requests before credits are deducted. The refund-on-failure pattern handles the error case.
- **`refund_feature_credits` is imported from `app.services.credits`.** It is called in the `if not result:` branch of both `/deep` and `/hiring-intel`. If you add new failure modes (validation errors, parsing errors after deduction), ensure they also trigger refunds.
- **The LLM response must be parsed as structured JSON.** If the model returns malformed JSON, the service returns `None`, the endpoint refunds and raises 502 — not save garbage to the database.
- **Analysis types are stored as strings in the database.** If you rename them, you'll break the history endpoint and dashboard queries. Treat them as stable identifiers.
- **The `/hiring-intel` endpoint is expensive (25 credits).** Be careful about retry logic — you don't want to accidentally charge users multiple times for the same analysis.
- **Job description is optional for `/match` but changes the analysis significantly.** Without a JD, it does a general ATS check. With a JD, it does targeted keyword matching. The frontend makes this clear to users.

*Last updated: Sep 6, 2026 — wired `refund_feature_credits` into `/deep` and `/hiring-intel` failure paths*
