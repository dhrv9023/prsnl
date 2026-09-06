# hiring_intel.md

**Location:** `prsnl/backend/app/services/hiring_intel.py`  
**Type:** AI Service

## What This File Does

Generates a comprehensive 9-section hiring intelligence report by simulating the perspectives of senior recruiters, hiring managers, and ATS specialists. This goes beyond basic resume feedback — it evaluates a candidate's resume through the lens of actual hiring decision-makers, providing recruiter-style verdicts, skill gap analysis, and concrete before/after rewrite suggestions. The report helps users understand not just what's wrong, but how hiring professionals would perceive their resume.

## How It Fits Into The System

- **Triggered by:** The `/hiring-intel` API endpoint when a user requests hiring intelligence analysis
- **Dependencies:** Groq API client (llama-3.3-70b-versatile), `sanitize_user_text`, `with_ai_retry`
- **Dependents:** The Hiring Intel panel in the frontend (`HiringIntelPanel.tsx`), which renders the multi-section report with recruiter verdicts and improvement suggestions

## Code Breakdown

### LLM Configuration

- Model: Groq `llama-3.3-70b-versatile` with JSON response format
- Temperature: `0.3` (lower than default for more consistent, analytical output)
- Timeout: `60s` (longer than other services because the 9-section output is substantial)
- The system prompt instructs the model to simulate a panel of hiring professionals evaluating the resume

### The 9 Report Sections

1. **overall_alignment** — How well the resume aligns with the target role (high-level fit assessment)
2. **recruiter_pov** — First-impression analysis containing:
   - `first_impression` — what a recruiter notices in the first 6 seconds
   - `strong_signals` — elements that would make a recruiter continue reading
   - `concerns` — red flags or weak spots
   - `verdict` with `shortlist_probability` (percentage likelihood of advancing)
3. **skill_gap** — Categorized missing skills:
   - `critical` — must-have skills absent from the resume
   - `optional` — nice-to-have skills that would strengthen the application
   - `production` — production/deployment skills that signal real-world experience
4. **deep_hiring_analysis** — Four sub-dimensions:
   - `maturity` — professional maturity signals
   - `execution` — evidence of shipping/completing work
   - `credibility` — trust signals (metrics, specifics, verifiable claims)
   - `production_readiness` — indicators of production environment experience
5. **role_aware_reasoning** — How the resume maps to specific role requirements
6. **why_this_matters** — Context on why each gap or strength matters in hiring decisions
7. **highest_impact_improvements** — Prioritized list of changes with maximum ROI
8. **before_after_rewrites** — Concrete examples showing current bullet points rewritten for impact
9. **final_verdict** — Overall assessment with `hiring_readiness` rating

### Output Validation

- Uses `setdefault` extensively to ensure all 9 top-level sections and their nested fields exist
- Clamps `hiring_readiness` (in `final_verdict`) to known values — prevents the model from inventing new rating categories
- Nested structures like `recruiter_pov` and `skill_gap` have their sub-fields validated individually

### Error Handling

- `with_ai_retry` handles transient Groq failures (rate limits, malformed JSON responses)
- The 60s timeout prevents hanging on unusually long generations
- If the model returns partial output, `setdefault` ensures the response is still renderable in the frontend

## Things To Know Before Editing

- The 60s timeout exists because this is the longest-running AI call in the system — if you add more sections, you may need to increase it
- Temperature 0.3 is intentionally low for consistency — raising it will make recruiter verdicts less predictable across runs
- The `shortlist_probability` in `recruiter_pov.verdict` is a percentage (0-100) — the frontend displays it as a progress bar, so keep it numeric
- `before_after_rewrites` expects an array of objects with `before` and `after` string fields — changing this structure breaks the frontend diff display
- The `hiring_readiness` clamping logic must be updated if you want to add new verdict tiers
- This service requires a job description to be meaningful — unlike `deep_analysis`, it doesn't have a useful JD-less mode (though it won't crash without one)
