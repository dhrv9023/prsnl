# app/db/supabase.py
from supabase import create_async_client, AsyncClient
from app.core.config import settings

_client: AsyncClient | None = None
_anon_client: AsyncClient | None = None


async def get_db() -> AsyncClient:
    """
    Return (or lazily create) the shared async Supabase client.
    Guarantees the service_role key is permanently bound to the client
    and never overwritten by client-side auth state listeners.
    """
    global _client
    if not _client:
        _client = await create_async_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE,
        )
        # CRITICAL FIX: The Supabase python SDK by default attaches an auth listener
        # (`_listen_to_auth_events`) that automatically overwrites the client's
        # Authorization header with any user token passed to `sign_in_with_password`,
        # `refresh_session`, etc. In a multi-tenant backend, this poisons the singleton
        # client with that single user's token, activating RLS and causing all future
        # admin/system database queries to see only that one user's rows.
        # We clear state change listeners and no-op `_listen_to_auth_events`.
        if hasattr(_client, "auth") and hasattr(_client.auth, "_state_change_emitters"):
            _client.auth._state_change_emitters.clear()
        _client._listen_to_auth_events = lambda *args, **kwargs: None

    # Defensive guarantee: Ensure Authorization header is always locked to service_role
    service_auth = f"Bearer {settings.SUPABASE_SERVICE_ROLE}"
    if _client.options.headers.get("Authorization") != service_auth:
        _client.options.headers["Authorization"] = service_auth
    if getattr(_client, "_postgrest", None) is not None:
        if _client._postgrest.headers.get("authorization") != service_auth:
            _client._postgrest.headers["authorization"] = service_auth
    if hasattr(_client, "auth"):
        _client.auth._current_session = None

    return _client


async def get_supabase_anon() -> AsyncClient | None:
    """Anon-key client for PKCE OAuth exchange. None if SUPABASE_ANON_KEY is unset."""
    global _anon_client
    key = (settings.SUPABASE_ANON_KEY or "").strip()
    if not key:
        return None
    if not _anon_client:
        _anon_client = await create_async_client(settings.SUPABASE_URL, key)
        if hasattr(_anon_client, "auth") and hasattr(_anon_client.auth, "_state_change_emitters"):
            _anon_client.auth._state_change_emitters.clear()
        _anon_client._listen_to_auth_events = lambda *args, **kwargs: None
    return _anon_client
