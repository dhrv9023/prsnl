"""
Pytest configuration for Kareerist Studio backend tests.

Sets up:
- asyncio mode for async tests
- Environment variable mocking so the app can import without real credentials
- Sentry disabled so test errors never pollute the production Sentry dashboard
"""

import os
from unittest.mock import patch, MagicMock
import pytest

# ── Disable Sentry BEFORE any app imports ─────────────────────────────────────
# pydantic-settings loads .env AFTER os.environ, so we can't suppress the DSN
# via os.environ. Instead we patch sentry_sdk.init to a no-op so it never
# actually initialises, regardless of what DSN is in .env.
import sentry_sdk as _sentry_sdk
_sentry_sdk.init = lambda *a, **kw: None  # type: ignore[assignment]

# ── Set test environment variables before any app imports ─────────────────────
os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE", "test-service-role")
os.environ.setdefault("HUGGINGFACE_API_KEY", "test-hf-key")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("COOKIE_SECURE", "False")
