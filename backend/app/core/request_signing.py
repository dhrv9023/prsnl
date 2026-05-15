# app/core/request_signing.py
"""
Request signing for sensitive admin operations.
Adds an extra layer of security beyond authentication.
"""

import hashlib
import hmac
import time
from fastapi import HTTPException, Request

from app.core.config import settings


def generate_signature(payload: str, timestamp: str) -> str:
    """
    Generate HMAC-SHA256 signature for a request payload.
    Uses SUPABASE_JWT_SECRET as the signing key.
    """
    secret = settings.SUPABASE_JWT_SECRET or ""
    if not secret:
        raise ValueError("SUPABASE_JWT_SECRET not configured")
    
    message = f"{timestamp}:{payload}"
    signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature


def verify_request_signature(request: Request, body_str: str) -> None:
    """
    Verify request signature for admin operations.
    Expects headers:
    - X-Signature: HMAC-SHA256 signature
    - X-Timestamp: Unix timestamp (must be within 5 minutes)
    
    Raises HTTPException if signature is invalid or expired.
    """
    signature = request.headers.get("X-Signature")
    timestamp = request.headers.get("X-Timestamp")
    
    if not signature or not timestamp:
        raise HTTPException(
            status_code=401,
            detail="Missing signature headers (X-Signature, X-Timestamp)"
        )
    
    # Check timestamp is recent (within 5 minutes)
    try:
        ts = int(timestamp)
        now = int(time.time())
        if abs(now - ts) > 300:  # 5 minutes
            raise HTTPException(
                status_code=401,
                detail="Request signature expired (timestamp too old)"
            )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid timestamp format")
    
    # Verify signature
    expected_sig = generate_signature(body_str, timestamp)
    if not hmac.compare_digest(signature, expected_sig):
        raise HTTPException(status_code=401, detail="Invalid request signature")
