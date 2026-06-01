"""TEMPORARY in-memory data store.

This is a skeleton stand-in so the API runs without a database. Replace with a
real datastore (Postgres via SQLAlchemy, or DynamoDB on AWS) before production —
everything is namespaced here so the swap is contained to this file.
"""
from threading import Lock

_lock = Lock()
_users: dict[str, dict] = {}  # email -> {email, password_hash, created_at}
_portfolios: dict[str, list] = {}  # email -> [holding, ...]
_settings: dict[str, dict] = {}  # email -> {provider, api_key}


# --- users ---
def get_user(email: str) -> dict | None:
    return _users.get(email.lower())


def create_user(email: str, password_hash: str) -> dict:
    with _lock:
        email = email.lower()
        user = {"email": email, "password_hash": password_hash}
        _users[email] = user
        return user


# --- portfolios (stub) ---
def list_holdings(email: str) -> list:
    return _portfolios.get(email.lower(), [])


def set_holdings(email: str, holdings: list) -> list:
    with _lock:
        _portfolios[email.lower()] = holdings
        return holdings


# --- per-user settings (e.g. their own AI API key) ---
# NOTE: stored in plaintext in memory for the skeleton. Before production, move
# to a DB and encrypt at rest (e.g. KMS-backed envelope encryption on AWS).
def get_settings(email: str) -> dict:
    return _settings.get(email.lower(), {})


def set_settings(email: str, **fields) -> dict:
    with _lock:
        cur = dict(_settings.get(email.lower(), {}))
        for k, v in fields.items():
            if v is None:
                cur.pop(k, None)
            else:
                cur[k] = v
        _settings[email.lower()] = cur
        return cur
