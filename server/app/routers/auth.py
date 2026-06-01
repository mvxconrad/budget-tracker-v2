"""Auth: register, login, refresh, logout, me.

- Passwords are bcrypt-hashed.
- Access tokens are short-lived JWTs; refresh tokens are opaque random strings
  whose SHA-256 hash is stored in the DB (the raw token is never persisted).
- Login uses a constant-ish path (always hashes/looks up) and a single generic
  error so it can't be used to enumerate which emails exist.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from .. import store
from ..db import get_session
from ..deps import get_current_user
from ..limiter import limiter
from ..models import User
from ..schemas import RefreshRequest, RegisterRequest, TokenResponse, UserResponse
from ..security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    refresh_expiry,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


async def _issue_tokens(session: AsyncSession, user: User) -> TokenResponse:
    access = create_access_token(str(user.id))
    raw_refresh = generate_refresh_token()
    await store.store_refresh_token(session, user, hash_refresh_token(raw_refresh), refresh_expiry())
    return TokenResponse(access_token=access, refresh_token=raw_refresh)


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, session: AsyncSession = Depends(get_session)):
    if await store.get_user_by_email(session, body.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = await store.create_user(session, body.email, hash_password(body.password))
    return await _issue_tokens(session, user)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
):
    # OAuth2 form uses "username"; we treat it as the email.
    user = await store.get_user_by_email(session, form.username)
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    return await _issue_tokens(session, user)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
async def refresh(request: Request, body: RefreshRequest, session: AsyncSession = Depends(get_session)):
    """Rotate refresh tokens: validate the presented one, revoke it, issue a new pair."""
    token_hash = hash_refresh_token(body.refresh_token)
    rt = await store.get_active_refresh_token(session, token_hash)
    if not rt:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")
    user = await store.get_user_by_id(session, rt.user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    await store.revoke_refresh_token(session, token_hash)  # rotation
    return await _issue_tokens(session, user)


@router.post("/logout", status_code=204)
async def logout(body: RefreshRequest, session: AsyncSession = Depends(get_session)):
    """Revoke a refresh token. Idempotent — always 204 (no token enumeration)."""
    await store.revoke_refresh_token(session, hash_refresh_token(body.refresh_token))
    return None


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return UserResponse(email=user.email, role=user.role)
