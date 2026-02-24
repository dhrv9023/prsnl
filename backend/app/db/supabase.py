from supabase import create_client, Client
from app.core.config import settings

def create_supabase_client() -> Client:
    supabase_url: str = settings.SUPABASE_URL
    supabase_key: str = settings.SUPABASE_SERVICE_ROLE
    return create_client(supabase_url, supabase_key)

supabase: Client = create_supabase_client()