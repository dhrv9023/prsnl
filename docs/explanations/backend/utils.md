# utils.md

**Location:** `prsnl/backend/app/api/v1/endpoints/utils.py`  
**Type:** API Endpoint

## What This File Does

Provides utility endpoints that don't fit into the core feature categories. Currently contains a single endpoint that converts English career-related text into Hinglish (Hindi + English written in Roman/Latin script) using a Groq LLM. This is a free feature with no credit cost, designed to make the platform more accessible and fun for Hindi-speaking users.

## How It Fits Into The System

- **Triggers:** Called by the frontend Hinglish Toggle component when a user enables Hinglish mode on any text content (cover letters, analysis results, etc.).
- **Dependencies:** Groq LLM service (for translation), `ai_retry` wrapper (handles transient LLM failures), rate limiter middleware, authentication middleware.
- **Dependents:** No other backend endpoints depend on this. The frontend Hinglish toggle is the sole consumer.

## Code Breakdown

### Hinglish Conversion (`POST /hinglish`)

Converts English career/professional text into Hinglish:

1. **Authenticate** the user (requires login, even though it's free).
2. **Sanitize input** — Strip potentially harmful content, validate text length.
3. **Rate limit check** — 20 requests per hour per user.
4. **Call Groq LLM** with a specialized prompt that instructs:
   - Write in Roman script (Latin alphabet, not Devanagari).
   - Mix Hindi and English naturally (code-switching style).
   - Keep technical/career terms in English.
   - Maintain the meaning and tone of the original.
5. **Return** the converted text.

### Input Sanitization

Before sending text to the LLM, the endpoint:
- Strips HTML tags (prevents prompt injection via markup).
- Validates text length (not empty, not excessively long).
- Removes control characters.

This is important because the input text could come from AI-generated content (cover letters, analyses) which might contain unexpected formatting.

### `ai_retry` Wrapper

The LLM call is wrapped in the `ai_retry` utility which:
- Retries on transient failures (rate limits, timeouts).
- Uses exponential backoff between retries.
- Gives up after a configured number of attempts.
- Returns a clear error if all retries fail.

This is shared infrastructure used across all LLM-calling endpoints.

### Rate Limiting

Limited to **20 requests per hour** per user. This is more generous than auth endpoints (5/min) because:
- It's a free feature (no credit cost to limit abuse).
- Users might convert multiple pieces of text in a session.
- The rate limit prevents LLM cost abuse without being restrictive for normal use.

## Things To Know Before Editing

- **This is a free feature — no credits deducted.** The rate limit is the only abuse prevention. If you remove the rate limit, LLM costs could spike from automated abuse.
- **Hinglish is Roman script, not Devanagari.** The prompt specifically requests Roman/Latin script output. If users see Devanagari (हिंदी), the prompt needs adjustment — don't change the endpoint logic, fix the LLM prompt.
- **The `ai_retry` wrapper is shared infrastructure.** If you modify its behavior here, check that other endpoints using it aren't affected. It's likely imported from a shared module.
- **Input sanitization prevents prompt injection.** The text being converted could itself be AI-generated (from cover letter or analysis endpoints). Without sanitization, nested prompts could manipulate the Hinglish LLM call.
- **Rate limit is per-user, not per-IP.** Unlike auth endpoints (per-IP), this uses user ID for rate limiting since it requires authentication. This means each authenticated user gets their own 20/hour quota.
- **Adding new utility endpoints here is fine.** This file is designed as a catch-all for small, standalone features. Keep each endpoint self-contained with its own rate limits and validation.
- **Groq is the LLM provider for this endpoint.** It's chosen for speed (low latency) since Hinglish conversion is a lightweight task. If you switch to a different provider, ensure latency stays acceptable for the UX (users expect near-instant conversion).
