# errors.ts

**Location:** `prsnl/FRONTEND/src/lib/errors.ts`  
**Type:** Error Translation Utility

## What This File Does

Maps raw backend error strings into friendly, user-facing messages. The backend returns technical error messages (e.g., "insufficient_credits", "resume_parse_failed") and this module translates them into something a user can understand and act on. Provides a single `friendlyError()` function used throughout the UI.

## How It Fits Into The System

- **Triggers:** Called in `catch` blocks and error handlers across all pages and hooks
- **Dependencies:** None (pure utility, no imports)
- **Dependents:** Every page component, `useAuth`, toast notifications, error displays

## Code Breakdown

### ERROR_MAP Array

An ordered array of `[pattern, message]` tuples where:
- `pattern` is a string or RegExp to match against the raw error
- `message` is the user-friendly replacement (can use regex capture groups like `$1`)

Categories covered:
- **Auth errors** — invalid credentials, expired sessions, account not found
- **Credit errors** — insufficient credits, with feature name extraction
- **Resume errors** — upload failures, parse failures, size limits
- **AI errors** — model timeouts, generation failures, rate limits
- **Interview errors** — session expired, no active session
- **Cover letter errors** — generation failures
- **Rate limiting** — too many requests with retry-after extraction
- **Network errors** — fetch failures, timeouts, CORS issues

The array is ordered so more specific patterns match before generic ones.

### friendlyError(e, fallback?) Function

```typescript
function friendlyError(error: unknown, fallback?: string): string
```

1. Extracts the error string from various shapes (Error object, string, object with `.message` or `.error`)
2. Iterates through `ERROR_MAP`, testing each pattern against the raw message
3. If a regex pattern matches, applies capture group substitution (e.g., "You need $1 more credits")
4. If no pattern matches:
   - If the raw message is short (<100 chars) and doesn't contain technical jargon (stack traces, HTTP codes), returns it as-is
   - Otherwise returns the `fallback` parameter or a generic "Something went wrong" message

## Things To Know Before Editing

- Pattern order matters — put specific patterns before generic ones (e.g., "insufficient_credits_for_deep_analysis" before "insufficient_credits")
- When adding new backend error codes, add a corresponding entry here
- Regex patterns with capture groups let you extract dynamic values (feature names, retry times) into the friendly message
- The "short and safe" fallthrough is intentional — some backend messages are already user-friendly
- This file has no side effects and no state — it's a pure mapping function, easy to unit test
