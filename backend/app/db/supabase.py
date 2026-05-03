# app/db/supabase.py
from supabase import create_async_client, AsyncClient
from app.core.config import settings

_client: AsyncClient | None = None
_anon_client: AsyncClient | None = None


async def get_db() -> AsyncClient:
    """Return (or lazily create) the shared async Supabase client."""
    global _client
    if not _client:
        _client = await create_async_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE,
        )
    return _client


async def get_supabase_anon() -> AsyncClient | None:
    """Anon-key client for PKCE OAuth exchange. None if SUPABASE_ANON_KEY is unset."""
    global _anon_client
    key = (settings.SUPABASE_ANON_KEY or "").strip()
    if not key:
        return None
    if not _anon_client:
        _anon_client = await create_async_client(settings.SUPABASE_URL, key)
    return _anon_client
