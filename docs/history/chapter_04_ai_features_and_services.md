# Chapter 04 — AI Features & Services

## Shared Infrastructure

All AI features share three pieces of infrastructure:

### 1. `llm_client.py` — Shared Groq Client

```python
_groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
GROQ_CHAT_MODEL = "groq/compound-mini"       # primary (free, JSON mode)
GROQ_FALLBACK_MODEL = "groq/compound"        # fallback (free, higher quality)

async def chat_complete(messages, temperature=0.3, response_format=None,
                         timeout=60, max_tokens=None, model=None) -> str:
    ...
```

Single shared async client. All features call `chat_complete()` instead of creating their own clients. The model is `groq/compound-mini` — Groq's own compound model, free on GroqCloud, supports `response_format={"type": "json_object"}` natively, 1–3s latency.

> **Model History:** Started with `llama-3.3-70b-versatile` (deprecated on Groq), then switched to `openai/gpt-oss-20b` (broken — returns HTTP 400 on all JSON-mode requests), then settled on `groq/compound-mini` + `groq/compound` fallback (September 2026). Always test JSON mode support before switching models.

### 2. `ai_retry.py` — Retry Utility

```python
async def with_ai_retry(fn, max_attempts=3, base_delay=1.5, label="AI call") -> T:
    ...
```

Wraps any async AI call with exponential backoff retry. Retries on: connection errors, timeouts, rate limits (429), 500/502/503 from Groq. Does NOT retry on 400 (bad request) or 401 (auth failure).

Backoff: 1.5s → 3s → 6s.

### 3. `prompt_sanitizer.py` — Injection Defense

```python
def sanitize_user_text(text: str) -> str:
    text = _DANGEROUS_TAGS.sub("", text)
    text = _INJECTION_PATTERNS.sub("[removed]", text)
    return text
```

Called on every piece of user-provided text before it enters a prompt. See Chapter 03 for details.

---

## ATS Score (`math_engine.py` + `ats_scoring.py`)

Two modes depending on whether a job description is provided:

### Mode 1: No JD — Rule-Based General Scorer

Evaluates the resume on 6 dimensions, each worth up to 20 or 10 points (total 100):

| Dimension | Max | How it's measured |
|---|---|---|
| Content density | 20 | Word count (400+ = full score) |
| Quantification | 20 | Regex for numbers + units (%, K, M, users, ms, etc.) |
| Action verbs | 20 | Presence of 33 strong action verbs (built, led, deployed...) |
| Section coverage | 20 | Presence of experience, skills, education, projects sections |
| Contact info | 10 | Email (5pts), phone (3pts), LinkedIn/GitHub (2pts) |
| Formatting signals | 10 | Bullet point count ÷ 3 |

### Mode 2: With JD — Semantic Similarity

1. Clean both texts (remove non-ASCII, collapse whitespace)
2. Get sentence embeddings from HuggingFace (`all-mpnet-base-v2`)
3. Compute cosine similarity between resume vector and JD vector
4. Rescale from realistic range [0.25, 0.70] to output range [25, 95]

The rescaling is important. Raw cosine similarity for text embeddings typically falls in 0.2–0.7. A direct 0–100 mapping would make even good matches look terrible. The rescaling makes the scores feel intuitive:
- cosine 0.40 → ~48 (poor match)
- cosine 0.50 → ~64 (decent match)
- cosine 0.60 → ~79 (good match)
- cosine 0.65 → ~87 (strong match)

HuggingFace client has a 30-second timeout to prevent event loop hangs.

---

## Deep Analysis (`deep_analysis.py`)

LLM-powered critique of the resume. The prompt uses XML delimiters to sandbox user data:

```
<RESUME_TEXT>
{sanitized_resume}
</RESUME_TEXT>

<JOB_DESCRIPTION>  ← optional
{sanitized_jd}
</JOB_DESCRIPTION>
```

The LLM returns a structured JSON with:
- `overall_feedback` — 2-3 sentence summary
- `sections` — per-section breakdown (experience, skills, education, projects)
  - `score` (0-10)
  - `issues` — what's wrong
  - `missing_keywords` — what's absent
  - `suggestions` — specific fixes
- `action_items` — top 3-5 concrete things to fix
- `strengths` — what's working

The response is parsed and saved to `ai_analyses` table with `analysis_type = "deep_analysis"`.

---

## Hiring Intelligence (`hiring_intel.py`)

The most comprehensive analysis. Generates a 9-section recruiter-realistic report simulating a panel of: Senior Technical Recruiter, Hiring Manager, ATS Specialist, Career Strategist, Technical Interviewer, and Workforce Intelligence Analyst.

Actual 9 sections (matching the JSON schema):

1. **`overall_alignment`** — 2-3 sentence honest fit assessment for the specific role
2. **`recruiter_pov`** — first impression, strong signals, recruiter concerns, shortlist probability verdict
3. **`skill_gap`** — critical missing skills, optional missing skills, production/deployment gaps
4. **`deep_hiring_analysis`** — engineering maturity, execution capability, project credibility, production readiness
5. **`role_aware_reasoning`** — what recruiters prioritize for this specific role/level, and candidate alignment
6. **`why_this_matters`** — for each concern, explains the recruiter's reasoning and hiring psychology
7. **`highest_impact_improvements`** — surgical, resume-specific fixes (not generic advice)
8. **`before_after_rewrites`** — exact weak bullets quoted from the resume, with specific rewrites
9. **`final_verdict`** — `hiring_readiness` (Not Ready / Borderline / Interview-Ready / Strong Candidate) + 2-sentence summary

This is the most expensive feature (25 credits) because it requires a JD, a target role, and an experience level — and produces the most detailed output. LLM timeout is 60s.

> **Sep 6, 2026 fix:** Credits are now refunded if `generate_hiring_intel()` returns `None` (Groq timeout or JSON parse failure). Previously, users would lose 25 credits on failure.

---

## AI Mock Interview (`ai_interview.py`)

The most complex feature. Two modes: normal and roast.

### Question Generation

Questions are generated from the resume. The LLM is given:
- The role and experience level
- The sanitized resume text (first 3000 chars)
- Analysis context from prior deep analysis (if available) — this lets questions target known weak spots
- Difficulty guidelines per experience level (Fresher/Junior/Mid/Senior)

Always generates exactly 6 questions:
- Q1, Q2: Theory (conceptual questions from their actual stack)
- Q3, Q4: MCQ (4 options, 1 correct, based on tools they listed)
- Q5, Q6: Code (LeetCode-style DSA, language-agnostic)

The LLM must return a JSON object with keys `q1`–`q6`. If fewer than 6 are returned, the system raises an error and retries.

### Answer Evaluation

Each answer is evaluated individually. The evaluator receives:
- Question type (theory/mcq/code)
- The question text
- The sanitized user answer (capped at 10,000 chars)
- For MCQ: the options list

Scoring rules:
- **Theory**: 0-10, proportional for multi-part questions
- **MCQ**: 10 if correct, 0 if wrong
- **Code**: 0-10 for correctness, efficiency, code quality

The evaluator returns `{ score, feedback, ideal_answer }`.

### Voice Input (Whisper STT)

The `/submit_voice` endpoint accepts audio files (webm/wav/mp4/ogg). Flow:
1. Write audio bytes to a temp file
2. Call Groq Whisper (`whisper-large-v3-turbo`) for transcription
3. Delete the temp file
4. Evaluate the transcript exactly like a text answer
5. Return evaluation with `transcribed_answer` field populated

### Session State (Redis)

Interview sessions are stored in Redis with a 45-minute TTL:
- Key: `interview:session:{user_id}`
- Value: JSON-serialized `InterviewSession` Pydantic model
- Contains: resume_text, role, experience_level, questions, answers, evaluations

On `/end`, the session is deleted from Redis and the report is persisted to the `interview_reports` Supabase table.

### Roast Mode

Same technical questions, different persona. The LLM is instructed to be "the most unimpressed, brutally honest senior interviewer." Feedback is savage and unfiltered. Supports Hinglish (Hindi + English in Roman script) and other languages.

---

## Cover Letter Generator (`cover_letter_gen.py`)

Two modes:

**Normal mode:** Professional, targeted cover letter. The LLM receives the resume, JD, company name, and job title. Returns a structured cover letter.

**Roast mode:** Same content, savage tone. The LLM is instructed to write as if it's brutally honest about the candidate's chances.

After generation, the user can:
1. Edit the cover letter in the UI
2. Humanize it (strip AI tone)
3. Download as PDF (client-side, using jsPDF)
4. Save to their account

---

## AI Humanizer (`humanizer.py`)

Takes a cover letter text and rewrites it to sound like a real person wrote it. Removes:
- Overly formal phrases ("I am writing to express my interest")
- AI tells ("leverage", "synergy", "passionate about")
- Repetitive sentence structures

Returns the humanized text. The user can then download or save it.

---

## Hinglish Toggle

Deep Analysis and Interview both support a Hinglish mode. When enabled:
- Deep Analysis feedback is written in Hinglish (Hindi + English in Roman script)
- Interview questions and evaluations are in Hinglish

The language is passed as a parameter and validated against a strict allowlist before being interpolated into prompts.
