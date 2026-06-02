"""Auth: register, verify-email, resend-code, login, refresh, logout, me.

Email verification gate:
- register() creates an UNVERIFIED user and emails a 6-digit OTP. It returns NO
  tokens - the account can't be used until verified.
- verify() checks the code, marks the email verified, and issues tokens.
- login() refuses an unverified account with 403 + detail "email_not_verified"
  so the frontend can route to the verify screen.
- get_current_user (deps) also requires email_verified, so no token can reach a
  protected route without a verified email - the gate is enforced server-side.

Security:
- Passwords are bcrypt-hashed; access tokens are short-lived JWTs; refresh tokens
  are opaque random strings whose SHA-256 hash is stored (raw never persisted).
- OTPs are 6 digits, hashed at rest, expire in 15 min, max 5 attempts, then must
  be resent. Generic errors avoid email enumeration.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from .. import store
from ..db import get_session
from ..deps import get_current_user
from ..email import (
    MAX_ATTEMPTS,
    code_expiry,
    generate_code,
    hash_code,
    send_verification_email,
)
from ..limiter import limiter
from ..models import User
from ..schemas import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResendRequest,
    TokenResponse,
    UserResponse,
    VerifyRequest,
)
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


async def _send_code(session: AsyncSession, user: User) -> None:
    code = generate_code()
    await store.create_email_code(session, user, hash_code(code), code_expiry())
    await send_verification_email(user.email, code)


@router.post("/register", response_model=MessageResponse, status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, session: AsyncSession = Depends(get_session)):
    existing = await store.get_user_by_email(session, body.email)
    if existing:
        if existing.email_verified:
            raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
        # Unverified re-register: refresh the password + resend a code (no dupe row).
        existing.hashed_password = hash_password(body.password)
        await session.commit()
        await _send_code(session, existing)
        return MessageResponse(detail="Verification code sent. Check your email.")
    user = await store.create_user(session, body.email, hash_password(body.password))
    await _send_code(session, user)
    return MessageResponse(detail="Verification code sent. Check your email.")


@router.post("/verify", response_model=TokenResponse)
@limiter.limit("10/minute")
async def verify(request: Request, body: VerifyRequest, session: AsyncSession = Depends(get_session)):
    user = await store.get_user_by_email(session, body.email)
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid code")
    if user.email_verified:
        return await _issue_tokens(session, user)  # already verified - just log in
    ev = await store.get_active_email_code(session, user)
    if not ev:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Code expired - request a new one")
    if ev.attempts >= MAX_ATTEMPTS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts - request a new code")
    if hash_code(body.code) != ev.code_hash:
        await store.bump_code_attempt(session, ev)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid code")
    await store.consume_code(session, ev)
    await store.mark_email_verified(session, user)
    return await _issue_tokens(session, user)


@router.post("/resend", response_model=MessageResponse)
@limiter.limit("3/minute")
async def resend(request: Request, body: ResendRequest, session: AsyncSession = Depends(get_session)):
    user = await store.get_user_by_email(session, body.email)
    # Always return the same message (don't reveal whether the email exists).
    if user and not user.email_verified:
        await _send_code(session, user)
    return MessageResponse(detail="If that account needs verification, a new code was sent.")


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
):
    user = await store.get_user_by_email(session, form.username)
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if not user.email_verified:
        # 403 with a machine-readable detail so the UI routes to the verify screen.
        raise HTTPException(status.HTTP_403_FORBIDDEN, "email_not_verified")
    return await _issue_tokens(session, user)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
async def refresh(request: Request, body: RefreshRequest, session: AsyncSession = Depends(get_session)):
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
    await store.revoke_refresh_token(session, hash_refresh_token(body.refresh_token))
    return None


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return UserResponse(email=user.email, role=user.role, email_verified=user.email_verified)


@router.post("/change-password", status_code=204)
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    await store.set_user_password(session, user, hash_password(body.new_password))
    # Invalidate all other sessions: changing a password should log out everywhere.
    await store.revoke_all_refresh_tokens(session, user)
    return None


@router.post("/delete-account", status_code=204)
@limiter.limit("3/minute")
async def delete_account(
    request: Request,
    body: DeleteAccountRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password is incorrect")
    await store.delete_user(session, user)  # cascades to tokens, budgets, codes
    return None
