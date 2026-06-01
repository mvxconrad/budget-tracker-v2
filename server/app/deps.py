"""Shared FastAPI dependencies (DB session + auth).

The JWT subject is the user's UUID (stable across email changes). We look the
user up by id on every request, so a deleted user's token immediately stops working.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from . import store
from .db import get_session
from .models import User
from .security import decode_token

# auto_error=False so routes can choose to allow anonymous access.
_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user(
    token: str | None = Depends(_oauth2), session: AsyncSession = Depends(get_session)
) -> User:
    """Require a valid access token. Raises 401 otherwise."""
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_token(token)
    if not payload or payload.get("type") != "access" or "sub" not in payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    user = await store.get_user_by_id(session, payload["sub"])
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


async def get_optional_user(
    token: str | None = Depends(_oauth2), session: AsyncSession = Depends(get_session)
) -> User | None:
    """Return the user if a valid token is present, else None (no error)."""
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("type") != "access" or "sub" not in payload:
        return None
    return await store.get_user_by_id(session, payload["sub"])
