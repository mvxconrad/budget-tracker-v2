"""Test fixtures. Uses a throwaway SQLite DB so tests need no Postgres.

Env vars are set BEFORE importing the app so settings pick them up. The email
sender is patched to capture OTP codes (so tests can complete the verify flow
without reading server logs or sending real email).
"""
import os

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_ledger.db"
os.environ["JWT_SECRET"] = "test-secret-please-ignore"
os.environ["APP_ENCRYPTION_KEY"] = ""  # use derived dev key
os.environ["RATE_LIMIT_ENABLED"] = "false"  # don't throttle the test suite
os.environ["EMAIL_PROVIDER"] = "console"

import httpx  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport  # noqa: E402

from app import routers  # noqa: E402
from app.db import engine  # noqa: E402
from app.limiter import limiter  # noqa: E402
from app.models import Base  # noqa: E402
from app.main import app  # noqa: E402

# Hard-disable rate limiting for the suite (the shared test client would
# otherwise accumulate per-route counts and trip 429s across tests).
limiter.enabled = False

# Captured OTP codes, keyed by email (populated by the patched sender).
SENT_CODES: dict[str, str] = {}


async def _capture(to_email, code):  # async to match the real sender's signature
    SENT_CODES[to_email.lower()] = code


# Patch the sender that auth.py actually calls.
routers.auth.send_verification_email = _capture


@pytest_asyncio.fixture
async def client():
    SENT_CODES.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def register(client, email="user@example.com", password="password123"):
    """Register only - returns the raw register response (no tokens; sends code)."""
    return await client.post("/api/auth/register", json={"email": email, "password": password})


async def register_and_verify(client, email="user@example.com", password="password123"):
    """Full happy path: register, read the captured code, verify -> returns token dict."""
    await register(client, email, password)
    code = SENT_CODES[email.lower()]
    r = await client.post("/api/auth/verify", json={"email": email, "code": code})
    return r.json()


async def auth_headers(client, email="user@example.com", password="password123"):
    tokens = await register_and_verify(client, email, password)
    return {"Authorization": f"Bearer {tokens['access_token']}"}, tokens
