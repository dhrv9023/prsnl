# cover_letter_gen.md

**Location:** `prsnl/backend/app/services/cover_letter_gen.py`  
**Type:** AI Service

## What This File Does

Provides two cover letter generation functions: a professional generator that produces formal, polished cover letters, and a roast-mode generator that creates savage, self-aware, darkly funny cover letters that are still technically usable. Both functions use the shared `chat_complete` client (`groq/compound-mini` primary, `groq/compound` fallback — both free on GroqCloud) and include post-processing to strip markdown artifacts and thinking tags from the output.

## How It Fits Into The System

- **Triggered by:** The `/cover-letter` and `/cover-letter/roast` API endpoints
- **Dependencies:** Groq API client via `chat_complete` (`groq/compound-mini` primary, `groq/compound` fallback — both free), `sanitize_user_text`, `with_ai_retry`
- **Dependents:** The Cover Letter page in the frontend (`CoverLetter.tsx`), which toggles between professional and roast modes based on the RoastMode context

## Code Breakdown

### cover_letter_generator (Professional Mode)

- Generates a formal, professional cover letter
- Constraints enforced via system prompt:
  - Maximum 250 words
  - No placeholders (e.g., no "[Company Name]" — uses actual values)
  - Plain text only (no markdown, no bullet points, no headers)
  - Formal but not stiff tone
- Context hints: `company_name` and `job_title` are injected directly into the prompt so the letter references the specific role naturally
- Output is post-processed to strip any markdown asterisks (`*`, `**`) and `<think>` tags that the model occasionally emits

### roast_cover_letter_generator (Roast Mode)

- Generates a savage, self-deprecating cover letter that roasts the candidate while still being a functional cover letter
- The persona is a brutally honest writer who finds corporate language hilarious
- Supports **Hinglish** and other languages — when the user selects a language preference, the prompt instructs the model to blend that language naturally
- Same post-processing as professional mode (strip asterisks and think tags)
- Still technically usable as a cover letter — the humor is self-aware, not unprofessional to the point of being unusable

### Context Hints

Both functions accept `company_name` and `job_title` as optional context hints. When provided, these are injected into the prompt so the generated letter:
- Addresses the specific company by name
- References the exact role being applied for
- Avoids generic placeholder text

### Post-Processing

Both functions apply the same cleanup pipeline:
1. Strip `<think>...</think>` tags (Groq models sometimes emit chain-of-thought in these tags)
2. Remove markdown bold/italic asterisks (`*text*`, `**text**`)
3. Trim leading/trailing whitespace

## Things To Know Before Editing

- The 250-word limit for professional mode is enforced only via prompt instruction — the model may occasionally exceed it; there's no hard truncation in code
- Roast mode's Hinglish support depends on the language parameter being passed correctly from the frontend's `HinglishToggle` component
- If you modify the post-processing regex for stripping asterisks, be careful not to strip legitimate uses (e.g., asterisks in email addresses, though unlikely in cover letters)
- The `<think>` tag stripping is necessary because Groq reasoning models sometimes emit chain-of-thought in these tags even when not asked to — removing this cleanup will leak internal model reasoning into user-facing output. The same stripping is done globally in `llm_client._clean_response()`, but cover letter gen also applies it as an extra safety layer
- Both functions use `with_ai_retry` — if Groq returns malformed output, it retries automatically
- The "no placeholders" rule is critical for UX — users expect a ready-to-send letter, not a template they need to fill in
