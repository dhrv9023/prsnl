# humanizer.md

**Location:** `prsnl/backend/app/services/humanizer.py`  
**Type:** AI Service

## What This File Does

Provides a single function `humanize_text` that rewrites AI-generated cover letters to sound natural and human-written. It removes robotic filler phrases, varies sentence length and structure, and preserves all factual details while making the text feel like it was written by a real person rather than an LLM. This is the final polish step in the cover letter pipeline.

## How It Fits Into The System

- **Triggered by:** The `/humanize` API endpoint, typically called after cover letter generation when the user wants the output to sound less AI-generated
- **Dependencies:** Groq API client (llama-3.3-70b-versatile), `with_ai_retry`
- **Dependents:** The Cover Letter page in the frontend, which offers a "Humanize" button after generation completes

## Code Breakdown

### humanize_text Function

- Takes AI-generated text as input and returns a rewritten version that passes as human-written
- Uses Groq with **temperature 0.7** (higher than other services) to encourage more creative, varied phrasing
- The system prompt instructs the model to:
  - Remove common AI filler phrases ("I am writing to express my interest...", "I believe I would be a great fit...")
  - Vary sentence length (mix short punchy sentences with longer ones)
  - Keep all factual details intact (company names, skills, experiences, dates)
  - Add natural imperfections that humans exhibit (contractions, informal transitions)
  - Maintain the same overall meaning and professional tone

### Post-Processing

- Strips `<think>...</think>` tags (same as other services)
- Removes markdown asterisks
- Returns `None` on failure (rather than raising an exception)

### Error Handling

- Wrapped with `with_ai_retry` for transient Groq failures
- Returns `None` if all retries are exhausted or if the model returns empty/unusable output
- The frontend handles `None` by showing an error toast and keeping the original text

## Things To Know Before Editing

- Temperature 0.7 is intentionally higher than other services (which use 0.3 or default) — this is because humanization requires creative variation; lowering it will make output sound formulaic
- The function returns `None` on failure, not an empty string — callers must handle this case
- "Preserve all factual details" is enforced only via prompt — there's no programmatic verification that facts weren't altered; if you need guaranteed fact preservation, you'd need a post-generation comparison step
- This function is designed for cover letters specifically — using it on other text types (resumes, reports) may produce unexpected results because the prompt is tuned for letter-style prose
- The humanizer doesn't know what the original AI prompt was — it only sees the generated text, so it can't "undo" specific AI patterns it doesn't recognize
