# app/db/supabase.py
from supabase import create_async_client, AsyncClient
from app.core.config import settings

_client: AsyncClient | None = None


async def get_db() -> AsyncClient:
    """Return (or lazily create) the shared async Supabase client."""
    global _client
    if not _client:
        _client = await create_async_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE,
        )
    return _client
