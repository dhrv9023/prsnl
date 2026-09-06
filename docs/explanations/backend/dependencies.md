# dependencies.py

**Location:** `prsnl/backend/app/api/dependencies.py`  
**Type:** FastAPI Dependency Injection

## What This File Does

Provides reusable FastAPI dependencies for authentication and credit validation. The `get_current_user` dependency extracts and verifies the JWT from HttpOnly cookies via Supabase's auth API. The `require_credits` factory creates dependencies that atomically deduct credits before a route handler executes, implementing a pay-before-use model for AI features.

## How It Fits Into The System

- **What triggers it:** FastAPI's dependency injection system calls these functions automatically when a route declares them as dependencies (via `Depends()` or the `CurrentUser` type alias).
- **What it depends on:** `app.core.config` (cookie names), `app.db.supabase` (get_db for auth verification), `app.services.credits` (deduct_feature_credits, refund_feature_credits).
- **What depends on it:** All protected endpoint routes use `CurrentUser` for authentication. AI feature endpoints use `require_credits()` for credit gating.

## Code Breakdown

### get_current_user(request)

The core authentication dependency. Extracts and verifies the user's identity from the session cookie:

1. Reads the access token cookie from the request (name from settings)
2. Strips the `"Bearer "` prefix (added by `auth_cookies.py`)
3. Calls `supabase.auth.get_user(token)` to verify the token with Supabase
4. Returns the Supabase user object on success
5. Raises `HTTPException(401)` if the cookie is missing, token is invalid, or Supabase rejects it

This is a server-side verification — the JWT is validated against Supabase's auth service, not just decoded locally. This ensures revoked tokens are caught.

### CurrentUser (type alias)

```python
CurrentUser = Annotated[object, Depends(get_current_user)]
```

A convenience type alias that combines the return type with the dependency declaration. Route handlers use it like:

```python
async def my_endpoint(user: CurrentUser):
    user_id = user.id
```

The type is `object` (not a specific class) because Supabase's Python SDK returns different user object shapes depending on the auth method and SDK version.

### require_credits(feature, cost)

A dependency factory that returns a `Depends()` instance for credit gating:

```python
async def my_endpoint(
    user: CurrentUser,
    _credits=require_credits("deep_analysis", 15)
):
```

When FastAPI resolves this dependency:

1. Gets the current user (chains with `get_current_user`)
2. Gets the Supabase client
3. Calls `deduct_feature_credits(supabase, user_id, feature, cost)`
4. If the user has sufficient credits, deduction succeeds and the route executes
5. If insufficient credits, raises `HTTPException(402)` — route never executes

The credit deduction happens BEFORE the route handler runs. This is the "pay first" model.

## Things To Know Before Editing

- `require_credits` executes BEFORE the route handler. If the AI call fails after credits are deducted, the endpoint handler must manually call `refund_feature_credits()` to return the credits. This is not automatic.
- The `CurrentUser` type is `object` because Supabase returns different user object shapes. You access `.id`, `.email`, etc. as attributes, but there's no static type checking. Be careful with attribute access.
- The credit guard import (`from app.services.credits import ...`) is done inside the function body, not at the top of the file. This avoids circular imports since `credits.py` also imports from `app.db.supabase`.
- If you add a new protected endpoint, use `CurrentUser` as a parameter type — don't call `get_current_user` manually.
- The Supabase `get_user()` call is a network request on every authenticated request. This adds latency but ensures token revocation is respected immediately.
- The `require_credits` factory captures `feature` and `cost` in a closure. If you need dynamic costs (e.g., based on request body), you'll need a different pattern — the cost is fixed at route definition time.
- A 401 from `get_current_user` means the user needs to re-authenticate. A 402 from `require_credits` means the user needs to purchase more credits.
