"""Shared FastAPI dependencies (auth)."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from .security import decode_token
from .store import get_user

# auto_error=False so routes can choose to allow anonymous access.
_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(token: str | None = Depends(_oauth2)) -> dict:
    """Require a valid bearer token. Raises 401 otherwise."""
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    user = get_user(payload["sub"])
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


def get_optional_user(token: str | None = Depends(_oauth2)) -> dict | None:
    """Return the user if a valid token is present, else None (no error)."""
    if not token:
        return None
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        return None
    return get_user(payload["sub"])
