"""Async database engine + session dependency.

Engine is created from settings.database_url (Postgres in prod via asyncpg,
SQLite in local dev). Routes get a session via Depends(get_session); the session
is committed/rolled-back and closed automatically per request.
"""
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .config import settings
from .models import Base

# SQLite needs check_same_thread off for the async driver; Postgres ignores it.
_connect_args = {"check_same_thread": False} if settings.is_sqlite else {}

engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,  # drop dead connections (RDS idle timeouts)
    connect_args=_connect_args,
)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def create_all() -> None:
    """Create tables directly. Used for local SQLite dev and tests; production
    Postgres should be migrated with Alembic instead."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
