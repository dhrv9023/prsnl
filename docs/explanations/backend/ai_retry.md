# ai_retry.py

**Location:** `prsnl/backend/app/services/ai_retry.py`  
**Type:** Utility / Resilience

## What This File Does

Provides a shared retry wrapper for transient AI API failures. Automatically retries on network errors, rate limits (429), and server errors (500/502/503) with exponential backoff. Immediately fails on non-retryable errors like 400 (bad request) or 401 (auth failure) to avoid wasting time on requests that will never succeed.

## How It Fits Into The System

- **What triggers it:** Called by every AI service file that makes external API calls (Groq LLM inference). The service wraps its API call in a lambda and passes it to `with_ai_retry()`.
- **What it depends on:** `asyncio` (for sleep/backoff), `logging` (for retry/failure logging).
- **What depends on it:** `deep_analysis.py`, `hiring_intel.py`, `cover_letter_gen.py`, `humanizer.py`, `ai_interview.py`, and the `utils.py` endpoint (Hinglish translation).

## Code Breakdown

### _RETRYABLE_GROQ_MESSAGES (tuple)

A tuple of substring patterns that indicate a retryable error when found in an exception message:

- `"connection"` — network connectivity issues
- `"timeout"` — request timed out
- `"rate_limit"` — API rate limit hit (429)
- `"502"` — bad gateway (upstream server error)
- `"503"` — service unavailable
- `"500"` — internal server error
- `"overloaded"` — Groq-specific capacity message

These are checked case-insensitively against the exception's string representation.

### _is_retryable(exc)

Determines whether an exception is worth retrying:

1. Converts the exception to its string representation (lowercased)
2. Checks if any substring from `_RETRYABLE_GROQ_MESSAGES` appears in it
3. Returns `True` if retryable, `False` if the error is permanent

Non-retryable errors (400 bad request, 401 unauthorized, 404 not found, validation errors) fail immediately without consuming retry attempts.

### with_ai_retry(fn, max_attempts=3, base_delay=1.5, label="AI call")

The main retry wrapper. Accepts a zero-argument async callable and retries it with exponential backoff:

**Parameters:**
- `fn` — async callable (typically a lambda wrapping the API call)
- `max_attempts` — maximum number of attempts (default: 3)
- `base_delay` — initial delay in seconds (default: 1.5)
- `label` — human-readable name for log messages (e.g., "deep_analysis")

**Retry behavior:**
- Attempt 1: immediate
- Attempt 2: wait 1.5 seconds
- Attempt 3: wait 3.0 seconds
- (If max_attempts were higher: wait 6.0s, 12.0s, etc.)

**Flow:**
1. Calls `fn()` and returns the result on success
2. On exception, checks `_is_retryable(exc)`
3. If retryable and attempts remain: logs a WARNING, sleeps for `base_delay * 2^attempt`, retries
4. If not retryable: logs an ERROR, re-raises immediately
5. If all attempts exhausted: logs an ERROR, re-raises the last exception

**Usage pattern:**
```python
result = await with_ai_retry(
    lambda: groq_client.chat.completions.create(...),
    label="cover_letter_generation"
)
```

## Things To Know Before Editing

- The `fn` parameter must be a zero-argument async callable. Use `lambda:` to wrap calls that need arguments. If you pass a coroutine directly (already called), it won't be retryable since coroutines can only be awaited once.
- The delay doubles each attempt (exponential backoff): 1.5s → 3.0s → 6.0s. This prevents hammering a rate-limited or overloaded API.
- Non-retryable errors fail immediately without any delay. This is intentional — a 400 error means the request is malformed and retrying won't help.
- The `label` parameter appears in log messages. Use descriptive labels so you can identify which AI call failed when reading production logs.
- Adding new retryable patterns to `_RETRYABLE_GROQ_MESSAGES` will cause those errors to be retried instead of failing fast. Be careful not to retry errors that indicate permanent failures.
- The total maximum wait time with defaults is 4.5 seconds (1.5 + 3.0). Combined with the API call time itself, a fully-retried request could take 15-20 seconds. Callers should account for this in their timeout budgets.
- This wrapper does not handle credit refunds — that's the caller's responsibility. If all retries fail, the caller must catch the exception and call `refund_feature_credits()`.
