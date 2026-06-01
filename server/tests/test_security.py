"""Security-focused tests: SQL injection, auth, key encryption, isolation.

The ORM uses bound parameters everywhere, so injection payloads are treated as
literal data. These tests prove that: malicious strings never bypass auth, never
break out of a query, and never corrupt the schema.
"""
from sqlalchemy import select

from app.db import SessionLocal
from app.models import User
from tests.conftest import auth_headers, register


# ---------- basic auth flow ----------
async def test_register_login_me(client):
    r = await register(client)
    assert r.status_code == 201
    tokens = r.json()
    assert tokens["access_token"] and tokens["refresh_token"]

    r = await client.post("/api/auth/login", data={"username": "user@example.com", "password": "password123"})
    assert r.status_code == 200

    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "user@example.com"


async def test_duplicate_register_conflicts(client):
    await register(client)
    r = await register(client)
    assert r.status_code == 409


async def test_me_requires_auth(client):
    assert (await client.get("/api/auth/me")).status_code == 401
    assert (await client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})).status_code == 401


async def test_password_not_stored_plaintext(client):
    await register(client, "p@example.com", "supersecret123")
    async with SessionLocal() as s:
        user = (await s.execute(select(User).where(User.email == "p@example.com"))).scalar_one()
        assert user.hashed_password != "supersecret123"
        assert user.hashed_password.startswith("$2")  # bcrypt


# ---------- SQL injection ----------
async def test_sql_injection_in_login_username(client):
    await register(client, "victim@example.com", "password123")
    # Classic auth-bypass payloads — must NOT log in, must NOT error.
    for payload in [
        "victim@example.com' --",
        "' OR '1'='1",
        "' OR 1=1 --",
        "admin'/*",
        "victim@example.com'; DROP TABLE users; --",
    ]:
        r = await client.post("/api/auth/login", data={"username": payload, "password": "x"})
        assert r.status_code == 401, payload
    # Real account still works → users table intact, nothing dropped.
    r = await client.post("/api/auth/login", data={"username": "victim@example.com", "password": "password123"})
    assert r.status_code == 200


async def test_sql_injection_in_register_email_rejected(client):
    # EmailStr validation rejects these before they ever reach the DB.
    for payload in ["' OR '1'='1", "x'; DROP TABLE users; --@e.com", "not-an-email"]:
        r = await client.post("/api/auth/register", json={"email": payload, "password": "password123"})
        assert r.status_code == 422, payload


async def test_injection_in_budget_data_roundtrips_safely(client):
    headers, _ = await auth_headers(client, "b@example.com")
    nasty = "'; DROP TABLE users; --"
    budget = {
        "title": nasty,
        "income": 5000,
        "categories": [{"name": nasty, "items": [{"label": "rent", "amount": 1}]}],
    }
    r = await client.put("/api/budget", json=budget, headers=headers)
    assert r.status_code == 200
    # Stored and returned verbatim as data (not executed).
    got = await client.get("/api/budget", headers=headers)
    assert got.json()["budget"]["title"] == nasty
    assert got.json()["budget"]["categories"][0]["name"] == nasty
    # users table still exists — register a second user successfully.
    assert (await register(client, "still@here.com")).status_code == 201


# ---------- API key encryption ----------
async def test_api_key_encrypted_and_masked(client):
    headers, _ = await auth_headers(client, "k@example.com")
    secret = "sk-ant-SUPERSECRET-1234"
    r = await client.put("/api/settings", json={"provider": "anthropic", "api_key": secret}, headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["has_key"] is True
    assert body["key_hint"] == "…1234"
    assert secret not in r.text  # full key never returned

    # Stored ciphertext must NOT equal the plaintext key.
    async with SessionLocal() as s:
        user = (await s.execute(select(User).where(User.email == "k@example.com"))).scalar_one()
        assert user.api_key_encrypted
        assert secret not in user.api_key_encrypted


async def test_settings_requires_auth(client):
    assert (await client.get("/api/settings")).status_code == 401
    assert (await client.put("/api/settings", json={"provider": "anthropic"})).status_code == 401


async def test_invalid_provider_rejected(client):
    headers, _ = await auth_headers(client, "prov@example.com")
    r = await client.put("/api/settings", json={"provider": "evilcorp"}, headers=headers)
    assert r.status_code == 400


# ---------- cross-user isolation ----------
async def test_users_cannot_read_each_others_budget(client):
    ha, _ = await auth_headers(client, "alice@example.com")
    hb, _ = await auth_headers(client, "bob@example.com")
    await client.put("/api/budget", json={"title": "Alice secret", "income": 9}, headers=ha)
    # Bob sees his own (none), never Alice's.
    rb = await client.get("/api/budget", headers=hb)
    assert rb.json()["budget"] is None
    # Alice still sees hers.
    ra = await client.get("/api/budget", headers=ha)
    assert ra.json()["budget"]["title"] == "Alice secret"


# ---------- refresh token rotation ----------
async def test_refresh_rotation_and_reuse_blocked(client):
    r = await register(client, "r@example.com")
    refresh = r.json()["refresh_token"]
    # Use it once → new pair.
    r2 = await client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert r2.status_code == 200
    new_refresh = r2.json()["refresh_token"]
    assert new_refresh != refresh
    # Old refresh is now revoked → reuse fails.
    assert (await client.post("/api/auth/refresh", json={"refresh_token": refresh})).status_code == 401
    # New one still works.
    assert (await client.post("/api/auth/refresh", json={"refresh_token": new_refresh})).status_code == 200


async def test_logout_revokes_refresh(client):
    r = await register(client, "lo@example.com")
    refresh = r.json()["refresh_token"]
    assert (await client.post("/api/auth/logout", json={"refresh_token": refresh})).status_code == 204
    assert (await client.post("/api/auth/refresh", json={"refresh_token": refresh})).status_code == 401


async def test_garbage_refresh_rejected(client):
    assert (await client.post("/api/auth/refresh", json={"refresh_token": "nope"})).status_code == 401
