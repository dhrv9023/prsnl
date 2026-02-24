# app/api/deps.py
from typing import Annotated
from fastapi import Depends, HTTPException, status, Request
from app.db.supabase import supabase

def get_current_user(request: Request):
    """
    Dependency: Extracts the JWT from the HttpOnly cookie 
    and verifies it with Supabase.
    """
    # 1. Extract the token from the cookie
    token = request.cookies.get("access_token")
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    
    # 2. The token might start with "Bearer ", strip it if needed
    if token.startswith("Bearer "):
        token = token.split(" ")[1]

    # 3. Verify with Supabase
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        return user_response.user

    except Exception as e:
        print(f"Auth Error: {e}") # Log this internally
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
        )

# Type alias for easy use in routes
CurrentUser = Annotated[object, Depends(get_current_user)]