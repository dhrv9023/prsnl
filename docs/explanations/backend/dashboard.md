# dashboard.md

**Location:** `prsnl/backend/app/api/v1/endpoints/dashboard.py`  
**Type:** API Endpoint

## What This File Does

Provides a single GET endpoint that aggregates all dashboard data into one response. Instead of the frontend making multiple API calls to different endpoints, this single call returns everything needed to render the dashboard: resume count, analysis count, latest ATS score, latest hiring intelligence report, latest deep analysis, and a history of recent analyses. Optimized for a single round-trip to minimize page load time.

## How It Fits Into The System

- **Triggers:** Called by the frontend Dashboard page on mount. Single call populates the entire dashboard view.
- **Dependencies:** Supabase database (`resumes` table, `ai_analyses` table), authentication middleware. Reads from multiple tables but doesn't write to any.
- **Dependents:** The frontend Dashboard component consumes this response directly. No other backend endpoints depend on this file.

## Code Breakdown

### Summary Endpoint (`GET /summary`)

Performs multiple database queries and aggregates results:

1. **Resume count** — `SELECT COUNT(*) FROM resumes WHERE user_id = ?`
2. **Analysis count** — `SELECT COUNT(*) FROM ai_analyses WHERE user_id = ?`
3. **Latest ATS score** — Most recent `ai_analyses` record with type `match`, returns the score value.
4. **Latest hiring intel** — Most recent `ai_analyses` record with type `hiring-intel`, returns the full result JSON.
5. **Latest deep analysis** — Most recent `ai_analyses` record with type `deep`, returns the full result JSON.
6. **Analysis history** — Last 20 `ai_analyses` records ordered by `created_at DESC`, with type and summary info.

All queries are scoped to the authenticated user's ID.

### Filename Extraction Helper

Resumes are stored in Supabase Storage with paths like `{user_id}/{uuid}.pdf`. When displaying resume names in the dashboard, this helper extracts a human-readable filename from the storage URL. It strips the UUID prefix and path components to show something meaningful to the user (typically the original upload filename stored in the database).

### Response Structure

Returns a single JSON object:
```json
{
  "resume_count": 3,
  "analysis_count": 12,
  "latest_ats_score": { "score": 78, ... },
  "latest_hiring_intel": { ... },
  "latest_deep_analysis": { ... },
  "analysis_history": [ ... ]
}
```

Fields are `null` if no data exists yet (new user with no analyses).

## Things To Know Before Editing

- **This endpoint is called on every dashboard page load.** Keep it fast. Avoid adding expensive computations or additional LLM calls here.
- **Multiple database queries in one endpoint.** Consider whether these could be combined into fewer queries or a database view if performance becomes an issue. Currently they're separate for clarity.
- **The "last 20" history limit is hardcoded.** If you need pagination, you'll need to add query parameters and update the frontend.
- **Null handling is important.** New users will have null for all analysis fields. The frontend expects this and shows empty states. Don't change null to empty objects/arrays without coordinating with the frontend.
- **The filename extraction logic is fragile.** It depends on the storage URL format. If you change how resumes are stored (different path structure, different storage provider), this helper will break.
- **No write operations.** This is a pure read endpoint. It should never modify data. If you need to add write operations (like marking analyses as "seen"), create a separate endpoint.
