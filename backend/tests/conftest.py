"""
Pytest configuration for Kareerist Studio backend tests.

Sets up:
- asyncio mode for async tests
- Environment variable mocking so the app can import without real credentials
"""

import os
import pytest

# ── Set test environment variables before any app imports ─────────────────────
# This runs before conftest fixtures so pydantic_settings doesn't fail.

os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE", "test-service-role")
os.environ.setdefault("HUGGINGFACE_API_KEY", "test-hf-key")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("COOKIE_SECURE", "False")
