# ats_score.md

**Location:** `prsnl/backend/app/api/v1/endpoints/ats_score.py`  
**Type:** API Endpoint

## What This File Does

Provides a single POST endpoint (`/api/ats/score`) that calculates an ATS (Applicant Tracking System) compatibility score for a resume. The endpoint supports two scoring modes: a general rule-based analysis (no job description needed) and a JD-specific mode that uses embedding similarity to compare the resume against a target job description. Uses Pydantic models for strict request/response validation.

## How It Fits Into The System

- **Triggers:** Called by the frontend ATS scoring component when a user submits a resume for scoring.
- **Dependencies:** Authentication middleware (requires logged-in user), credit service (costs 5 credits), `resumes` table (for resume text), embedding service (for JD similarity mode), rule-based scoring logic (for general mode).
- **Dependents:** The dashboard endpoint may reference ATS scores. The frontend displays the score with a visual gauge/meter component.

## Code Breakdown

### Request Model (`ATSScoreRequest`)

A Pydantic model that validates incoming requests:
- `resume_id` — UUID of the resume to score (required)
- `mode` — Either `"general"` or `"jd"` (required, determines scoring path)
- `job_description` — The target job description text (required when mode is `"jd"`, ignored for `"general"`)

### Response Model (`ATSScoreResponse`)

A Pydantic model that structures the response:
- `score` — Numerical ATS compatibility score (0-100)
- `breakdown` — Category-by-category scoring details
- `suggestions` — Actionable improvement recommendations
- `mode` — Which scoring mode was used (echoed back)

### Score Endpoint (`POST /api/ats/score`)

The single endpoint that routes to the appropriate scoring logic:

1. Authenticate user and validate request body.
2. Verify user owns the specified resume.
3. Deduct 5 credits.
4. Fetch resume text from database.
5. **Route based on `mode` field:**
   - `"general"` → Rule-based scoring (keyword density, formatting, section presence, length)
   - `"jd"` → Embedding similarity scoring (vectorizes both resume and JD, computes cosine similarity, identifies keyword gaps)
6. Return structured `ATSScoreResponse`.

### General Mode (Rule-Based)

Analyzes the resume without any job description context. Checks for:
- Presence of standard sections (experience, education, skills, summary)
- Keyword density and variety
- Formatting indicators (bullet points, action verbs)
- Length appropriateness
- Contact information completeness

Produces a score based on weighted rules. Fast and deterministic — no LLM call needed.

### JD Mode (Embedding Similarity)

Compares the resume against a specific job description using vector embeddings:
1. Generate embeddings for both the resume text and job description.
2. Compute cosine similarity between the vectors.
3. Extract key terms from the JD and check which appear in the resume.
4. Score based on semantic similarity + keyword overlap.
5. Generate specific suggestions for missing keywords/skills.

This mode is more accurate for targeted applications but requires the embedding service to be available.

## Things To Know Before Editing

- **The `mode` field determines the entire code path.** If you add a new mode, make sure the Pydantic model's validator accepts it and the routing logic handles it.
- **General mode is deterministic; JD mode is not.** General mode will always return the same score for the same resume. JD mode depends on the embedding model, which may produce slightly different results across versions.
- **Credits are deducted regardless of mode.** Both modes cost 5 credits. If you want different pricing per mode, you'll need to modify the credit deduction logic.
- **The embedding service is an external dependency.** If it's down, JD mode will fail. Consider adding a fallback or clear error message rather than letting it timeout silently.
- **Pydantic models enforce the API contract.** Changing field names or types in `ATSScoreRequest`/`ATSScoreResponse` is a breaking change for the frontend. Coordinate with frontend changes.
- **This endpoint overlaps with `/ai-analysis/match`.** They serve similar purposes but use different approaches. The ATS score endpoint is more focused and structured; the match analysis is more LLM-driven and conversational. Don't accidentally merge them without understanding the UX difference.
