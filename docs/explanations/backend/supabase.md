# supabase.py

**Location:** `prsnl/backend/app/db/supabase.py`  
**Type:** Database Client Factory

## What This File Does

Provides lazy-initialized async Supabase clients as module-level singletons. Two clients exist: a service-role client with full admin database access (bypasses Row Level Security) and an anon-key client used specifically for PKCE OAuth token exchange. Both clients are created on first use and shared across all requests for the lifetime of the application.

## How It Fits Into The System

- **What triggers it:** Called by `dependencies.py` (to get the service-role client for auth verification), by endpoint handlers (for database operations), and by `services/credits.py` (for credit operations). The anon client is used by the OAuth callback flow.
- **What it depends on:** `app.core.config` (for SUPABASE_URL, SUPABASE_SERVICE_ROLE, SUPABASE_ANON_KEY), `supabase-py` (the `create_async_client` factory).
- **What depends on it:** `app.api.dependencies.py`, all endpoint files, `app.services.credits.py`, auth OAuth flow.

## Code Breakdown

### _client (module-level variable)

Holds the singleton service-role `AsyncClient` instance. Starts as `None` and is populated on the first call to `get_db()`.

### _anon_client (module-level variable)

Holds the singleton anon-key `AsyncClient` instance. Starts as `None` and is populated on the first call to `get_supabase_anon()`.

### get_db()

Returns the service-role Supabase client, creating it on first call:

```python
async def get_db():
    global _client
    if _client is None:
        _client = await create_async_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
    return _client
```

The service-role key grants full access to all tables, bypassing Row Level Security policies. This is the primary client used for all backend database operations.

### get_supabase_anon()

Returns the anon-key Supabase client, or `None` if `SUPABASE_ANON_KEY` is not configured:

```python
async def get_supabase_anon():
    global _anon_client
    if not settings.SUPABASE_ANON_KEY:
        return None
    if _anon_client is None:
        _anon_client = await create_async_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return _anon_client
```

The anon client respects RLS policies and is used for the PKCE OAuth flow where the client needs to exchange an auth code for tokens without elevated privileges.

## Things To Know Before Editing

- The service-role client has FULL database access — it bypasses all Row Level Security policies. Never expose this client or its key to the frontend. Any operation using this client can read/write/delete any row in any table.
- The anon client returns `None` if `SUPABASE_ANON_KEY` is not set in the environment. All callers must handle the `None` case gracefully (typically by disabling OAuth features).
- These are true singletons — they're created once and never closed during the application lifecycle. There's no cleanup on shutdown. This is fine for long-running server processes but means connections persist until the process exits.
- The clients are async — `get_db()` and `get_supabase_anon()` are both `async` functions that must be awaited.
- If Supabase is unreachable when `get_db()` is first called, the `create_async_client` call will raise an exception. Since this happens lazily (on first request, not at startup), the app will start but the first database request will fail.
- Do not create additional Supabase client instances elsewhere in the codebase. Always use these factory functions to ensure connection reuse and consistent configuration.
