# ats.md

**Location:** `prsnl/backend/app/schemas/ats.py`  
**Type:** Pydantic Models

## What This File Does

Defines the request and response models specifically for the ATS scoring endpoint. The request model (`ATSScoreRequest`) handles input validation including mode-dependent field requirements — it ensures that a job description is provided when JD-mode scoring is requested. The response model (`ATSScoreResponse`) provides a clean, typed output with the scoring mode and computed score.

## How It Fits Into The System

- **Triggered by:** The `/ats-score` API endpoint uses `ATSScoreRequest` for input validation and `ATSScoreResponse` for output serialization
- **Dependencies:** Pydantic v2 (BaseModel, Field, field_validator, Literal)
- **Dependents:** `ats_scoring.py` (service router), route handler, frontend ATS score display

## Code Breakdown

### ATSScoreRequest

Fields:
- `resume_text` (str) — the full text of the resume to score
- `mode` (Literal["general", "jd"]) — which scoring engine to use
- `job_description` (str, optional) — the job description for JD-mode comparison

#### Validators

**Whitespace stripping:**
- Both `resume_text` and `job_description` are stripped of leading/trailing whitespace before validation
- Prevents edge cases where a field appears non-empty but contains only spaces/newlines

**Non-empty resume_text:**
- After stripping, validates that `resume_text` is not empty
- Raises a validation error if the user submits a blank resume
- This catches cases where the frontend sends an empty string (e.g., PDF parsing failed silently)

**Conditional job_description requirement:**
- When `mode` is `"jd"`, the validator ensures `job_description` is present and non-empty
- When `mode` is `"general"`, `job_description` can be None or empty (it's ignored)
- This is a cross-field validator — it checks the relationship between `mode` and `job_description`

### ATSScoreResponse

Fields:
- `mode` (str) — echoes back which mode was used ("general" or "jd")
- `score` (int) — the computed ATS score, constrained to 0-100

The response is intentionally minimal — just the mode and score. Detailed breakdowns come from other endpoints (deep_analysis, hiring_intel).

## Things To Know Before Editing

- The `Literal["general", "jd"]` type on `mode` means Pydantic will reject any other value at the API boundary — if you add a new mode, update this Literal type first
- The cross-field validator (mode + job_description) runs after individual field validators — so `job_description` is already stripped by the time the cross-field check runs
- The score field has no Pydantic constraint (like `ge=0, le=100`) — the 0-100 range is enforced by the scoring engines, not the model; consider adding `Field(ge=0, le=100)` if you want belt-and-suspenders validation
- Whitespace stripping means `"   "` (all spaces) is treated as empty — this is intentional; a resume of only whitespace is not valid
- This file is separate from `models.py` because ATS scoring was added later and has its own validation logic — consider consolidating if the separation causes confusion
