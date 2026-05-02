# app/db/redis_client.py
# Shared Redis client for session state management.
# Uses redis-py's async interface so it integrates cleanly with FastAPI's async routes.

import json
import redis.asyncio as aioredis
from app.core.config import settings
from app.schemas.models import InterviewSession

# TTL for interview sessions — 45 minutes.
# If a user abandons an interview, Redis auto-cleans it after this.
SESSION_TTL_SECONDS = 60 * 45  # 45 minutes

# Module-level singleton — shared across all workers via Redis server
_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Return (or lazily create) the shared async Redis client."""
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis


def _session_key(user_id: str) -> str:
    """Namespaced Redis key for an interview session."""
    return f"interview:session:{user_id}"


async def save_session(user_id: str, session: InterviewSession) -> None:
    """Serialize a session to JSON and persist it in Redis with a TTL."""
    r = await get_redis()
    key = _session_key(user_id)
    # Use model_dump to convert Pydantic model → dict → JSON string
    data = session.model_dump_json()
    await r.setex(key, SESSION_TTL_SECONDS, data)


async def load_session(user_id: str) -> InterviewSession | None:
    """Load and deserialize a session from Redis. Returns None if not found / expired."""
    r = await get_redis()
    key = _session_key(user_id)
    raw = await r.get(key)
    if raw is None:
        return None
    # Deserialize JSON string → InterviewSession Pydantic model
    return InterviewSession.model_validate_json(raw)


async def delete_session(user_id: str) -> None:
    """Explicitly delete a session key from Redis when interview ends."""
    r = await get_redis()
    key = _session_key(user_id)
    await r.delete(key)


async def refresh_session_ttl(user_id: str) -> None:
    """Reset the TTL on every request so active sessions don't expire mid-interview."""
    r = await get_redis()
    key = _session_key(user_id)
    await r.expire(key, SESSION_TTL_SECONDS)
