"""TEMPORARY in-memory data store.

This is a skeleton stand-in so the API runs without a database. Replace with a
real datastore (Postgres via SQLAlchemy, or DynamoDB on AWS) before production —
everything is namespaced here so the swap is contained to this file.
"""
from threading import Lock

_lock = Lock()
_users: dict[str, dict] = {}  # email -> {email, password_hash, created_at}
_portfolios: dict[str, list] = {}  # email -> [holding, ...]


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
