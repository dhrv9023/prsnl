# ats_scoring.md

**Location:** `prsnl/backend/app/services/ats_scoring.py`  
**Type:** Service Router

## What This File Does

A simple routing function that dispatches resume scoring requests to the appropriate scoring engine based on the requested mode. It acts as the single entry point for all ATS scoring, abstracting away the choice between rule-based general scoring and embedding-based JD-specific scoring. The function itself contains no scoring logic — it's purely a dispatcher.

## How It Fits Into The System

- **Triggered by:** The `/ats-score` API endpoint
- **Dependencies:** `ats_general_engine.compute_general_score` (rule-based), `ats_jd_engine.compute_jd_score` (embedding-based)
- **Dependents:** The Resume Analysis page in the frontend, which displays the ATS score gauge and breakdown

## Code Breakdown

### score_resume Function

The sole function in this file:
1. Receives an `ATSScoreRequest` (contains `resume_text`, `mode`, and optionally `job_description`)
2. Checks the `mode` field:
   - `"general"` → calls `compute_general_score(resume_text)` — rule-based scoring across 6 dimensions
   - `"jd"` → calls `compute_jd_score(resume_text, job_description)` — semantic similarity via embeddings
3. Returns an `ATSScoreResponse` with the mode and computed score (0-100)

That's it. No transformation, no aggregation, no caching — just routing.

## Things To Know Before Editing

- This file is intentionally thin — resist the urge to add scoring logic here; keep it in the respective engine files
- If you add a new scoring mode (e.g., "hybrid"), you need to update: this router, the `ATSScoreRequest` model's mode literal, and create the new engine file
- The `ATSScoreRequest` Pydantic model validates that `job_description` is present when mode is `"jd"` — so by the time this function runs, you can trust that the JD exists for JD mode
- Both engine functions return an integer 0-100 — this router doesn't do any score normalization
