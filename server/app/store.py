"""Data-access layer (PostgreSQL via async SQLAlchemy).

ALL queries go through the ORM with bound parameters — user input is never
interpolated into SQL text, so these functions are not vulnerable to SQL
injection. Emails are normalized to lowercase. API keys are encrypted at rest.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from . import crypto
from .models import Budget, RefreshToken, User


def _norm(email: str) -> str:
    return email.strip().lower()


# --- users ---
async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    res = await session.execute(select(User).where(User.email == _norm(email)))
    return res.scalar_one_or_none()


async def get_user_by_id(session: AsyncSession, user_id: str | uuid.UUID) -> User | None:
    try:
        uid = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
    except (ValueError, AttributeError):
        return None
    res = await session.execute(select(User).where(User.id == uid))
    return res.scalar_one_or_none()


async def create_user(session: AsyncSession, email: str, hashed_password: str) -> User:
    user = User(email=_norm(email), hashed_password=hashed_password, role="user")
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


# --- per-user AI key (encrypted at rest) ---
async def set_user_api_key(
    session: AsyncSession, user: User, *, provider: str | None = ..., api_key: str | None = ...
) -> User:
    """Update provider and/or key. Pass `...` (default) to leave a field
    unchanged; pass None to clear it; pass a string to set it."""
    if provider is not ...:
        user.api_provider = provider
    if api_key is not ...:
        user.api_key_encrypted = crypto.encrypt(api_key) if api_key else None
    await session.commit()
    await session.refresh(user)
    return user


def get_user_api_key(user: User) -> str | None:
    """Decrypt and return the user's stored API key (or None)."""
    return crypto.decrypt(user.api_key_encrypted)


# --- refresh tokens ---
async def store_refresh_token(
    session: AsyncSession, user: User, token_hash: str, expires_at: datetime
) -> RefreshToken:
    rt = RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
    session.add(rt)
    await session.commit()
    return rt


async def get_active_refresh_token(session: AsyncSession, token_hash: str) -> RefreshToken | None:
    res = await session.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    rt = res.scalar_one_or_none()
    if not rt or rt.revoked:
        return None
    exp = rt.expires_at
    if exp.tzinfo is None:  # SQLite returns naive datetimes
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        return None
    return rt


async def revoke_refresh_token(session: AsyncSession, token_hash: str) -> None:
    res = await session.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    rt = res.scalar_one_or_none()
    if rt:
        rt.revoked = True
        await session.commit()


# --- budgets (server-synced copy) ---
async def get_budget(session: AsyncSession, user: User) -> dict | None:
    res = await session.execute(select(Budget).where(Budget.user_id == user.id))
    b = res.scalar_one_or_none()
    return b.data if b else None


async def upsert_budget(session: AsyncSession, user: User, data: dict) -> dict:
    res = await session.execute(select(Budget).where(Budget.user_id == user.id))
    b = res.scalar_one_or_none()
    if b:
        b.data = data
    else:
        b = Budget(user_id=user.id, data=data)
        session.add(b)
    await session.commit()
    return data
