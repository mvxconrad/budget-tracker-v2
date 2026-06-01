"""Test fixtures. Uses a throwaway SQLite DB so tests need no Postgres.

Env vars are set BEFORE importing the app so settings pick them up.
"""
import os

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_ledger.db"
os.environ["JWT_SECRET"] = "test-secret-please-ignore"
os.environ["APP_ENCRYPTION_KEY"] = ""  # use derived dev key
os.environ["RATE_LIMIT_ENABLED"] = "false"  # don't throttle the test suite

import httpx  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport  # noqa: E402

from app.db import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402


@pytest_asyncio.fixture
async def client():
    # Fresh schema per test.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def register(client, email="user@example.com", password="password123"):
    r = await client.post("/api/auth/register", json={"email": email, "password": password})
    return r


async def auth_headers(client, email="user@example.com", password="password123"):
    r = await register(client, email, password)
    tokens = r.json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}, tokens
