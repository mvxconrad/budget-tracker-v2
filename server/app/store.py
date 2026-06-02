"""Data-access layer (PostgreSQL via async SQLAlchemy).

ALL queries go through the ORM with bound parameters — user input is never
interpolated into SQL text, so these functions are not vulnerable to SQL
injection. Emails are normalized to lowercase. API keys are encrypted at rest.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from . import crypto
from .models import Budget, EmailVerification, RefreshToken, User


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


async def set_user_password(session: AsyncSession, user: User, hashed_password: str) -> None:
    user.hashed_password = hashed_password
    await session.commit()


async def delete_user(session: AsyncSession, user: User) -> None:
    # Cascades to refresh_tokens, budgets, and email_verifications (FK ondelete).
    await session.delete(user)
    await session.commit()


# --- AI usage metering (server key only; BYOK is unlimited) ---
def _aware(dt: datetime) -> datetime:
    """SQLite hands back naive datetimes; treat them as UTC."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


async def reset_ai_usage_if_stale(session: AsyncSession, user: User) -> None:
    """Zero the monthly counter when we've rolled into a new calendar month.

    Compares (year, month) so the same month a year later still resets.
    """
    now = datetime.now(timezone.utc)
    reset_at = user.ai_usage_reset_at
    rolled = reset_at is None or (
        (_aware(reset_at).year, _aware(reset_at).month) != (now.year, now.month)
    )
    if rolled:
        user.ai_messages_used = 0
        user.ai_usage_reset_at = now
        await session.commit()


async def increment_ai_usage(session: AsyncSession, user: User) -> None:
    """Count one successful server-key assistant message against the user."""
    user.ai_messages_used = (user.ai_messages_used or 0) + 1
    await session.commit()


async def set_user_tier(
    session: AsyncSession, user: User, tier: str, *, stripe_customer_id: str | None = ...
) -> User:
    """Set a user's subscription tier (and optionally their Stripe customer id)."""
    user.tier = tier
    if stripe_customer_id is not ...:
        user.stripe_customer_id = stripe_customer_id
    await session.commit()
    await session.refresh(user)
    return user


async def set_stripe_customer_id(session: AsyncSession, user: User, customer_id: str) -> None:
    user.stripe_customer_id = customer_id
    await session.commit()


async def get_user_by_stripe_customer(session: AsyncSession, customer_id: str) -> User | None:
    res = await session.execute(select(User).where(User.stripe_customer_id == customer_id))
    return res.scalar_one_or_none()


# --- admin ---
async def count_users(session: AsyncSession) -> int:
    res = await session.execute(select(func.count()).select_from(User))
    return int(res.scalar_one())


async def count_users_with_key(session: AsyncSession) -> int:
    res = await session.execute(
        select(func.count()).select_from(User).where(User.api_key_encrypted.is_not(None))
    )
    return int(res.scalar_one())


async def count_budgets(session: AsyncSession) -> int:
    res = await session.execute(select(func.count()).select_from(Budget))
    return int(res.scalar_one())


async def list_users(session: AsyncSession, limit: int = 100, offset: int = 0) -> list[User]:
    limit = max(1, min(limit, 500))
    offset = max(0, offset)
    res = await session.execute(
        select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
    )
    return list(res.scalars().all())


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


# --- email verification (OTP) ---
async def mark_email_verified(session: AsyncSession, user: User) -> None:
    user.email_verified = True
    await session.commit()


async def create_email_code(
    session: AsyncSession, user: User, code_hash: str, expires_at
) -> EmailVerification:
    # Invalidate any prior unconsumed codes for this user, then add the new one.
    res = await session.execute(
        select(EmailVerification).where(
            EmailVerification.user_id == user.id, EmailVerification.consumed.is_(False)
        )
    )
    for old in res.scalars().all():
        old.consumed = True
    ev = EmailVerification(user_id=user.id, code_hash=code_hash, expires_at=expires_at)
    session.add(ev)
    await session.commit()
    await session.refresh(ev)
    return ev


async def get_active_email_code(session: AsyncSession, user: User) -> EmailVerification | None:
    res = await session.execute(
        select(EmailVerification)
        .where(EmailVerification.user_id == user.id, EmailVerification.consumed.is_(False))
        .order_by(EmailVerification.created_at.desc())
    )
    ev = res.scalars().first()
    if not ev:
        return None
    exp = ev.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        return None
    return ev


async def bump_code_attempt(session: AsyncSession, ev: EmailVerification) -> None:
    ev.attempts += 1
    await session.commit()


async def consume_code(session: AsyncSession, ev: EmailVerification) -> None:
    ev.consumed = True
    await session.commit()


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


async def revoke_all_refresh_tokens(session: AsyncSession, user: User) -> None:
    """Revoke every refresh token for a user (e.g. after a password change)."""
    res = await session.execute(
        select(RefreshToken).where(RefreshToken.user_id == user.id, RefreshToken.revoked.is_(False))
    )
    for rt in res.scalars().all():
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
