# redis_client.py

**Location:** `prsnl/backend/app/db/redis_client.py`  
**Type:** Redis Client / Session Storage

## What This File Does

Manages the Redis connection and provides CRUD operations for interview sessions. Sessions are stored as JSON-serialized Pydantic models with a 45-minute TTL that refreshes on activity. This file is the single point of contact between the application and Redis for session management, providing save, load, delete, and TTL refresh operations.

## How It Fits Into The System

- **What triggers it:** Called by the `interview.py` endpoint to persist interview session state between individual question/answer exchanges.
- **What it depends on:** `app.core.config` (for REDIS_URL), `app.schemas.models` (InterviewSession Pydantic model), `redis.asyncio` (async Redis client library).
- **What depends on it:** `app.api.endpoints.interview.py` (all session lifecycle operations).

## Code Breakdown

### SESSION_TTL_SECONDS = 2700

The time-to-live for interview sessions: 45 minutes. After 45 minutes of inactivity (no TTL refresh), Redis automatically deletes the session. This prevents abandoned sessions from consuming memory indefinitely.

### _redis (module-level variable)

Holds the singleton async Redis client instance. Starts as `None` and is populated on the first call to `get_redis()`.

### get_redis()

Lazy-creates and returns the async Redis client:

- Connects to the URL specified in `settings.REDIS_URL`
- Configures UTF-8 encoding for string operations (no manual encode/decode needed)
- Reuses the same connection across all calls

### _session_key(user_id)

Generates a namespaced Redis key for a user's interview session:

```
"interview:session:{user_id}"
```

The namespace prefix prevents key collisions with other Redis data (like rate limit counters from slowapi). Only one session key exists per user — starting a new interview overwrites the previous one.

### save_session(user_id, session)

Serializes an `InterviewSession` Pydantic model to JSON and stores it in Redis with the configured TTL:

- Uses `session.model_dump_json()` for serialization (Pydantic v2)
- Sets the key with `EX=SESSION_TTL_SECONDS` for automatic expiration
- Overwrites any existing session for that user

### load_session(user_id)

Loads and deserializes a session from Redis:

- Returns `None` if the key doesn't exist (expired or never created)
- Uses `InterviewSession.model_validate_json(data)` for deserialization
- The returned object is a fully hydrated Pydantic model ready for use

### delete_session(user_id)

Explicitly removes a session key from Redis. Used when an interview is completed or explicitly ended by the user. While sessions would eventually expire via TTL, explicit deletion frees memory immediately.

### refresh_session_ttl(user_id)

Resets the TTL on an active session back to 45 minutes without modifying the session data. Called on every `/submit` interaction to keep active interviews alive. Uses Redis `EXPIRE` command which is O(1).

## Things To Know Before Editing

- Sessions auto-expire after 45 minutes of inactivity. The TTL is refreshed on every `/submit` call, so active interviews stay alive indefinitely as long as the user keeps answering questions.
- If Redis is down or unreachable, all interview features will return 503 errors. There is no fallback storage mechanism.
- Only one active session exists per user (keyed by `user_id`). Starting a new interview silently overwrites any existing session. There's no multi-session support.
- Pydantic's `model_dump_json()` and `model_validate_json()` handle serialization. If you change the `InterviewSession` schema, existing sessions in Redis may fail to deserialize — consider adding a migration or version field.
- The Redis client uses `decode_responses=True` (UTF-8), so all values are returned as Python strings, not bytes. No manual decoding needed.
- The `get_redis()` function doesn't test the connection — it will succeed even if Redis is unreachable. The first actual operation (save/load) will raise the connection error.
- Rate limiting (slowapi) also uses Redis but manages its own connection. This client is exclusively for session storage.
