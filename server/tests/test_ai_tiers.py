"""AI usage metering + Stripe billing surface.

The Anthropic client is faked so no real model call (or spend) happens; we only
assert the metering/tier logic around it.
"""
import pytest

from app import tiers
from app.config import settings
from app.routers import ai as ai_router
from tests.conftest import auth_headers

EMPTY_BUDGET = {"title": "T", "income": 0, "savings": {}, "categories": []}


class _FakeText:
    type = "text"

    def __init__(self, text):
        self.text = text


class _FakeResp:
    stop_reason = "end_turn"

    def __init__(self, text="Hi from fake Q."):
        self.content = [_FakeText(text)]


class _FakeMessages:
    async def create(self, **kwargs):
        return _FakeResp()


class _FakeClient:
    messages = _FakeMessages()


@pytest.fixture
def fake_ai(monkeypatch):
    """Server key present + a fake Anthropic client (no real calls)."""
    monkeypatch.setattr(settings, "anthropic_api_key", "sk-server-test")
    monkeypatch.setattr(ai_router, "_client_for", lambda key: _FakeClient())
    yield


async def _chat(client, headers, msg="hello"):
    return await client.post(
        "/api/ai/chat",
        json={"message": msg, "budget": EMPTY_BUDGET, "history": []},
        headers=headers,
    )


@pytest.mark.asyncio
async def test_me_reports_free_tier_and_usage(client):
    headers, _ = await auth_headers(client)
    me = (await client.get("/api/auth/me", headers=headers)).json()
    assert me["tier"] == "free"
    assert me["usage"]["limit"] == tiers.TIER_LIMITS["free"]
    assert me["usage"]["used"] == 0
    assert me["usage"]["unlimited"] is False
    assert me["has_own_key"] is False


@pytest.mark.asyncio
async def test_server_key_chat_increments_usage(client, fake_ai):
    headers, _ = await auth_headers(client)
    r = await _chat(client, headers)
    body = r.json()
    assert body["configured"] is True
    assert body["limit_reached"] is False
    assert body["usage"]["used"] == 1
    # /me reflects the same incremented count.
    me = (await client.get("/api/auth/me", headers=headers)).json()
    assert me["usage"]["used"] == 1


@pytest.mark.asyncio
async def test_limit_reached_blocks_further_calls(client, fake_ai, monkeypatch):
    monkeypatch.setitem(tiers.TIER_LIMITS, "free", 2)
    headers, _ = await auth_headers(client)
    assert (await _chat(client, headers)).json()["usage"]["used"] == 1
    assert (await _chat(client, headers)).json()["usage"]["used"] == 2
    blocked = (await _chat(client, headers)).json()
    assert blocked["limit_reached"] is True
    assert blocked["usage"]["used"] == 2  # not incremented past the limit


@pytest.mark.asyncio
async def test_byok_user_is_unlimited(client, fake_ai):
    headers, _ = await auth_headers(client)
    # Save a personal Anthropic key -> BYOK.
    await client.put(
        "/api/settings",
        json={"provider": "anthropic", "api_key": "sk-user-personal-key"},
        headers=headers,
    )
    body = (await _chat(client, headers)).json()
    assert body["configured"] is True
    assert body["usage"] is None  # BYOK isn't metered
    me = (await client.get("/api/auth/me", headers=headers)).json()
    assert me["has_own_key"] is True
    assert me["usage"]["unlimited"] is True
    assert me["usage"]["used"] == 0


@pytest.mark.asyncio
async def test_anonymous_cannot_use_server_key(client, fake_ai):
    # No auth header: server key must not be spent by anonymous callers.
    r = await client.post(
        "/api/ai/chat", json={"message": "hi", "budget": EMPTY_BUDGET, "history": []}
    )
    assert r.json()["configured"] is False


@pytest.mark.asyncio
async def test_checkout_rejects_unknown_tier_and_unconfigured(client, monkeypatch):
    headers, _ = await auth_headers(client)
    # Billing not configured -> 503 regardless of tier.
    monkeypatch.setattr(settings, "stripe_secret_key", "")
    r = await client.post("/api/billing/checkout", json={"tier": "plus"}, headers=headers)
    assert r.status_code == 503

    # Configured but unknown tier -> 400.
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test_x")
    monkeypatch.setattr(settings, "stripe_price_plus", "price_plus")
    r = await client.post("/api/billing/checkout", json={"tier": "free"}, headers=headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_webhook_requires_configuration(client):
    r = await client.post("/api/billing/webhook", content=b"{}")
    assert r.status_code == 503
