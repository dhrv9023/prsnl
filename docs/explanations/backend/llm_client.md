# llm_client.py

**Location:** `prsnl/backend/app/services/llm_client.py`  
**Type:** Shared LLM Client / Service Wrapper

## What This File Does

This file acts as the primary interface for all LLM (Large Language Model) features across the backend application. It configures and initializes a single, shared, asynchronous Groq API client using the application's configuration settings. It specifies the primary model (`groq/compound-mini`) and fallback model (`groq/compound`) for all text analysis, and exposes a clean `chat_complete` wrapper with automatic model fallback, think-tag stripping, and code-fence sanitizers.

## How It Fits Into The System

- **What triggers it:** Any API endpoint that requires AI processing (e.g., resume scoring, deep analysis, cover letter generation, humanizer, mock interview generation/evaluations) imports and calls the async `chat_complete` function.
- **What it depends on:**
  - `groq.AsyncGroq` — Groq's official asynchronous Python SDK client.
  - `app.core.config.settings` — retrieves `GROQ_API_KEY` for credentials.
- **What depends on it:**
  - `app.services.ai_interview` — uses it to generate mock interview questions and evaluations.
  - `app.services.ats_general_engine` / `ats_jd_engine` — uses it for scoring.
  - `app.services.cover_letter_gen` — uses it to draft cover letters.
  - `app.services.deep_analysis` — uses it for resume critiques.
  - `app.services.hiring_intel` — uses it for recruiter report generation.
  - `app.services.humanizer` — uses it to make cover letters sound natural.

## Code Breakdown

### Client Initialization
**Lines:** 16–19  
Initializes a single shared instance of `AsyncGroq` using the `settings.GROQ_API_KEY`. Instantiating the client once at the module level is highly performant because it allows connection pooling and keeps memory usage low across multiple asynchronous FastAPI workers.

### Model Selection
**Lines:** 26–29  
Defines two models:
- **Primary:** `groq/compound-mini` — Groq's own fast model. Supports `response_format={"type": "json_object"}` natively, runs on Groq's LPU hardware (1–3s latency), and has no hard output-token-per-minute limits on the free tier. **100% free** on GroqCloud.
- **Fallback:** `groq/compound` — Groq's higher-quality compound model, also free and also supports JSON mode. Used automatically if the primary model fails JSON validation.

> **Why not `openai/gpt-oss-20b`?** That model was the original choice but it returns HTTP 400 `json_validate_failed` on all `json_object` requests — it does not support that response format on Groq. Both compound models were tested and confirmed working.

### `_strip_think_tags` helper function
**Lines:** 40–42  
Strips `<think>...</think>` reasoning blocks emitted by reasoning-capable models (e.g. Qwen3). These blocks contain the model's internal chain-of-thought and must not appear in user-facing output.

### `_strip_code_fences` helper function
**Lines:** 32–37  
Strips ` ```json ``` ` and ` ``` ``` ` wrappers that models occasionally emit even when configured for native JSON output.

### `_clean_response` helper function
**Lines:** 45–49  
Combines both cleanup steps: strips think tags first, then code fences. All `chat_complete` responses go through this pipeline.

### `chat_complete` asynchronous function
**Lines:** 52–111  
The primary service function. It accepts:
- `messages`: A list of message dictionaries (system prompts, user inputs, conversational history).
- `temperature`: Response randomness control (default `0.3` for structured, deterministic output).
- `response_format`: e.g. `{"type": "json_object"}` to enforce JSON output at the API level.
- `timeout`: Maximum request duration (default `60` seconds).
- `max_tokens`: Optional token cap for the completion.
- `model`: Optional model override (defaults to `GROQ_CHAT_MODEL`).

**Automatic fallback logic:** If the primary model (`groq/compound-mini`) returns HTTP 400 `json_validate_failed`, the function automatically retries the same request using the fallback model (`groq/compound`) — no caller code changes needed. This makes JSON-mode features resilient to per-model failures.

```python
completion = await _groq_client.chat.completions.create(**kwargs)
content = completion.choices[0].message.content or ""
return _clean_response(content)  # strips <think> tags + code fences
```

## Things To Know Before Editing

- **Model Swapping:** To change the model, update `GROQ_CHAT_MODEL` in `.env` (or `config.py` defaults). Both the primary and fallback are controlled via `GROQ_CHAT_MODEL` and `GROQ_FALLBACK_MODEL` env vars.
- **JSON Mode Compatibility:** Before switching to any new Groq model, test that it handles `response_format={"type": "json_object"}` — not all models on Groq support this. `openai/gpt-oss-20b` and `qwen/qwen3.6-27b` are known non-working examples.
- **OTPM Limits:** Groq's free tier imposes per-model Output Tokens Per Minute (OTPM) limits. `qwen/qwen3.8-27b` has a 1,000 OTPM limit — too low for deep analysis (2,500 tokens) and hiring intel (4,096 tokens). `groq/compound-mini` and `groq/compound` have no such hard OTPM cap.
- **JSON Formatting:** Always keep `temperature` low (`0.1`–`0.3`) when using JSON mode to prevent malformed output.
- **Whisper Client:** This client is for **text completions** only. Whisper audio transcriptions in `interview.py` call the Groq audio transcription API directly and are not affected by model changes here.
