# interview.md

**Location:** `prsnl/backend/app/api/v1/endpoints/interview.py`  
**Type:** API Endpoint

## What This File Does

Manages the full lifecycle of AI-powered mock interviews. Handles starting a new interview session (generating tailored questions), submitting text answers OR voice recordings (with Whisper STT transcription), real-time evaluation, ending sessions to compile final reports, abandoning sessions without generating reports, retrieving active session state, and viewing historical interview reports. Sessions are stored in Redis for fast access during the interview with auto-expiration, then persisted to Supabase upon completion with associated resume_id tracking.

## How It Fits Into The System

- **Triggers:** Called by the frontend AI Interview page throughout the interview flow — from starting a session to submitting each answer to ending/abandoning.
- **Dependencies:** Redis (active session storage), LLM service (question generation and answer evaluation), credit service (25 credits to start), Supabase database (final report persistence in `interview_reports` table), `resumes` table (resume text for contextual questions), authentication middleware.
- **Dependents:** The Interview History page reads completed reports. The dashboard may reference interview data. The frontend interview component maintains state by polling `/session`.

## Code Breakdown

### Start Interview (`POST /start`)

**Cost: 25 credits**

Initiates a new interview session:
1. Check if user already has an active session (prevents double-charging and overlapping sessions).
2. Deduct 25 credits.
3. Fetch resume text from `resumes` table for context.
4. Optionally fetch latest deep analysis data for the resume to target questions at candidate's weak spots.
5. Call LLM to generate 6 tailored interview questions based on resume, role, experience level, and analysis context.
6. Store `resume_id` on the session for tracking in the final report.
7. Create a session object in Redis with: questions, answers (empty), evaluations (empty), metadata (language, roast mode, resume_id, timestamps).
8. Return the questions to the client.

The session is stored in Redis with a 45-minute TTL (expiration) to auto-cleanup abandoned sessions. If a session already exists, returns 409 Conflict with instructions to either finish or abandon the existing session first.

### Submit Answer (`POST /submit`)

Evaluates a single text answer during an active interview:
1. Retrieve active session from Redis.
2. Validate the answer corresponds to a valid question ID.
3. Call LLM to evaluate the answer (scoring, feedback, ideal answer).
4. Store the evaluation in the Redis session and refresh TTL.
5. Return the evaluation.

Supports **roast mode** — when enabled, the AI gives brutally honest, humorous feedback instead of polite professional critique.

Supports **multiple languages** — the evaluation prompt adapts to the user's selected language (stored in session.role encoding).

### Submit Voice Answer (`POST /submit_voice`)

**Added: May 22, 2026 · Hardened: Sep 6, 2026**

Accepts voice recordings (webm/wav/mp4/ogg/m4a), transcribes them via Groq Whisper STT, then evaluates exactly like `/submit`:
1. Retrieve active session from Redis.
2. Find the question by question_id (passed as form data).
3. Reject code questions (must use text submission).
4. Validate audio MIME type (`ALLOWED_AUDIO_TYPES`: webm, wav, mp4, ogg, x-m4a) and check file extension allowlist (`ALLOWED_AUDIO_EXTENSIONS`).
5. Enforce 10MB file size limit (`HTTPException(413)` if exceeded) to prevent resource exhaustion attacks (VULN-009 / VULN-017).
6. Write to temp file and send to Groq Whisper API (`whisper-large-v3-turbo` model).
7. Extract transcribed text.
8. Handle silence/empty responses gracefully (score 0, feedback to speak clearly).
9. Evaluate the transcript using the same LLM logic as `/submit` (respects roast mode and language).
10. Attach `transcribed_answer` field so frontend can display what was heard.
11. Store evaluation and transcript in Redis session.

Rate limited to 15 requests/minute. Only valid for theory and MCQ questions.

### End Interview (`POST /end`)

Compiles the final interview report:
1. Retrieve the full session from Redis (all questions, answers, evaluations).
2. Calculate overall score and qualitative rating (Poor/Decent/Good/Very Good/Excellent).
3. Compile breakdown with question, answer, score, feedback for each item.
4. Persist the complete report to Supabase `interview_reports` table with:
   - overall_score, qualitative_score
   - breakdown (full Q&A transcript with evaluations)
   - role, experience_level
   - questions_count, answers_count
   - **resume_id** (added May 24, 2026 — links report to source resume)
5. Delete the Redis session (explicit cleanup).
6. Return the final report to the client.

### Abandon Interview (`POST /abandon`)

**Added: May 22, 2026**

Discards an active session without generating a report:
1. Delete the session from Redis.
2. No report is generated or persisted.
3. No credit refund (the questions were already generated at `/start`).
4. Returns confirmation message.

Used when a user wants to quit mid-interview without waiting for report compilation or when they want to start fresh after abandoning a session.

### Get Session (`GET /session`)

**Added: May 22, 2026**

Returns the current state of an active interview session:
- `active` — Boolean indicating if a session exists
- `questions` — Full question array (null if no session)
- `answered_count` — Number of questions answered so far
- `total_questions` — Total number of questions in the session
- `role` — Cleaned role string (encoding prefixes stripped for display)
- `experience_level` — Experience level from session start

Returns `{ active: false }` if no active session exists. Used by the frontend to:
- Offer resume option when user navigates back
- Restore interview state on page refresh
- Show progress indicator

Session role encoding (e.g., `[ROAST][LANG:hinglish]Software Engineer`) is automatically stripped for frontend display.

### Interview History (`GET /history`)

Returns last 20 completed interview reports for the authenticated user, ordered by date (newest first). Each report includes:
- Report ID
- Overall score (numeric 0-10)
- Qualitative score (Poor/Decent/Good/Very Good/Excellent)
- Full breakdown (questions, answers, evaluations)
- Role and experience level
- Questions count and answers count
- Creation timestamp
- **resume_id** (added May 24, 2026 — links report to source resume)

Reads from the `interview_reports` Supabase table. Limit of 20 keeps response size manageable.

### Roast Mode

When roast mode is enabled at session start, all answer evaluations use an alternative prompt that delivers feedback in a savage, humorous style. The final report also reflects this tone. The mode is stored in the Redis session and cannot be changed mid-interview.

### Language Support

The user can select a language at session start. This affects:
- The language of generated questions
- The language of answer evaluations
- The language of the final report

The user's answers can be in any language regardless of the session language setting.

## Things To Know Before Editing

- **Only one active session per user.** The `/start` endpoint checks Redis for an existing session and returns 409 Conflict if found. Users must explicitly `/end` or `/abandon` before starting a new session.
- **Redis is the source of truth during an active interview.** If Redis goes down mid-interview, the session is lost. There's no database backup of in-progress sessions. The 45-minute TTL balances session persistence with memory usage.
- **Session TTL is refreshed on every `/submit` or `/submit_voice`.** Active interviews won't expire as long as the user keeps answering. Idle sessions auto-expire after 45 minutes.
- **No credit refund on abandon.** The expensive LLM call (question generation) happens at `/start`. Document this clearly in the frontend UX.
- **Voice transcription uses Groq Whisper.** Temp files are created, sent to Groq, then cleaned up. File cleanup happens in a `finally` block to prevent orphaned temp files.
- **Code questions cannot use voice submission.** The `/submit_voice` endpoint explicitly rejects question type "code" with a 400 error. Code must be typed.
- **Roast mode and language are encoded in `session.role`.** Format: `[ROAST][LANG:hinglish]Software Engineer`. This encoding is stripped when returning session data via `/session` but preserved for evaluation logic.
- **Analysis context enrichment is optional.** If the user has a recent `deep_analysis` for the resume, questions target identified weak spots. Non-fatal if analysis is missing.
- **Resume_id tracking was added May 24, 2026.** All new interview reports include the source resume_id. Older reports in the DB won't have this field.
- **`/submit_voice` returns `transcribed_answer` field.** The frontend can display what was heard for user confirmation. Text submissions don't have this field.
