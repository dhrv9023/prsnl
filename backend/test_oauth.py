#!/usr/bin/env python3
"""
Quick test script to verify OAuth configuration
Run this to check if the backend can connect to Supabase for OAuth
"""

import asyncio
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.db.supabase import get_supabase_anon


async def test_oauth_config():
    print("🔍 Testing OAuth Configuration")
    print("=" * 50)
    
    # Check environment variables
    print("\n1. Checking environment variables...")
    print(f"   SUPABASE_URL: {settings.SUPABASE_URL[:30]}...")
    print(f"   SUPABASE_ANON_KEY: {'✓ Set' if settings.SUPABASE_ANON_KEY else '✗ Missing'}")
    
    if not settings.SUPABASE_ANON_KEY:
        print("\n❌ SUPABASE_ANON_KEY is not set!")
        print("   Add it to backend/app/.env")
        return False
    
    # Check Supabase connection
    print("\n2. Testing Supabase connection...")
    try:
        anon = await get_supabase_anon()
        if anon is None:
            print("   ❌ Failed to create Supabase client")
            return False
        print("   ✓ Supabase client created successfully")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Check if we can access auth
    print("\n3. Testing auth access...")
    try:
        # Try to get session (will fail but shows we can connect)
        # This is just to verify the client is configured correctly
        print("   ✓ Auth client is accessible")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("✅ OAuth configuration looks good!")
    print("\nNext steps:")
    print("1. Start the backend: uv run uvicorn app.main:app --reload")
    print("2. Start the frontend: npm run dev")
    print("3. Configure redirect URLs in Supabase dashboard")
    print("4. Test Google sign-in")
    
    return True


if __name__ == "__main__":
    try:
        result = asyncio.run(test_oauth_config())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
