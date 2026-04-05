from supabase import create_async_client, AsyncClient
from app.core.config import settings

# async def create_supabase_client() -> AsyncClient:
#     supabase_url: str = settings.SUPABASE_URL
#     supabase_key: str = settings.SUPABASE_SERVICE_ROLE
#     return create_async_client(supabase_url, supabase_key)

# supabase: AsyncClient = create_supabase_client()

_client = None


async def get_db() -> AsyncClient:
    global _client
    if not _client:
        _client = await create_async_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE)
    return _client
