# deep_analysis.md

**Location:** `prsnl/backend/app/services/deep_analysis.py`  
**Type:** AI Service

## What This File Does

Generates a structured, section-by-section LLM-powered resume critique via the shared `chat_complete` client (primary model: `groq/compound-mini`, fallback: `groq/compound`). It analyzes each resume section individually (summary, experience, education, skills, etc.) and produces scored feedback with actionable improvement suggestions. When a job description is provided, the analysis becomes JD-aware — comparing resume content against role requirements to identify gaps and alignment.

## How It Fits Into The System

- **Triggered by:** The `/deep-analysis` API endpoint when a user requests detailed resume feedback
- **Dependencies:** Groq API client, `sanitize_user_text` utility (input sanitization), `with_ai_retry` decorator (retry logic for transient LLM failures)
- **Dependents:** The Deep Analysis panel in the frontend (`DeepAnalysisPanel.tsx`), which renders the section scores, feedback, and action items

## Code Breakdown

### LLM Configuration

Uses the shared `chat_complete` function (primary: `groq/compound-mini`, both models 100% free on GroqCloud) with JSON response format enforced. The system prompt instructs the model to act as a senior resume reviewer and return structured JSON. Security rules are embedded in the system prompt to guard against prompt injection from resume content (e.g., "ignore previous instructions" patterns in user-submitted text).

### Input Handling

- Resume text is passed through `sanitize_user_text` to strip potentially malicious content before being sent to the LLM
- Job description (JD) is optional — when present, the prompt shifts to JD-aware mode, asking the model to evaluate keyword alignment, role fit, and missing qualifications
- The function is wrapped with `with_ai_retry` to handle transient Groq API failures (rate limits, timeouts)

### Output Schema

The LLM returns a JSON object with:
- `summary` — brief overall assessment (2-3 sentences)
- `overall_feedback` — one of: Excellent, Good, Fair, Poor
- `sections` — dict where each key is a resume section name, and each value contains:
  - `score` (0-100)
  - `feedback` (specific commentary)
  - `issues` (list of problems found)
  - `missing_keywords` (keywords from JD not present in that section, empty if no JD)
- `action_items` — top 5 prioritized improvements the user should make

### Output Validation

After parsing the LLM response:
- Uses `setdefault` to ensure all expected keys exist with sensible defaults (prevents KeyError crashes if the model omits a field)
- Clamps `overall_feedback` to the known set `["Excellent", "Good", "Fair", "Poor"]` — if the model returns something unexpected (e.g., "Average"), it falls back to "Fair"
- Section scores are validated as integers within 0-100

## Things To Know Before Editing

- The system prompt contains anti-injection rules — if you modify the prompt structure, ensure those rules remain intact or malicious resume content could hijack the LLM's behavior
- `overall_feedback` clamping means adding new rating tiers requires updating the validation logic, not just the prompt
- The JSON response format is enforced at the Groq API level (`response_format={"type": "json_object"}`), but the model can still return malformed JSON — the retry decorator handles this by re-attempting on parse failures
- If you change the output schema, update both this service AND the frontend `DeepAnalysisPanel.tsx` which expects the exact field names
- `sanitize_user_text` is critical for security — never bypass it, even for "trusted" inputs
