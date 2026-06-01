"""Symmetric encryption for secrets at rest (per-user API keys).

Uses Fernet (AES-128-CBC + HMAC). The key comes from APP_ENCRYPTION_KEY; if that
is unset we derive a valid Fernet key from JWT_SECRET so dev works out of the box.
In production, set APP_ENCRYPTION_KEY explicitly (generate with
`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`)
so rotating JWT_SECRET doesn't silently invalidate stored keys.
"""
import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from .config import settings


def _fernet() -> Fernet:
    key = settings.app_encryption_key.strip()
    if key:
        return Fernet(key.encode())
    # Dev fallback: derive a deterministic 32-byte urlsafe key from JWT_SECRET.
    derived = base64.urlsafe_b64encode(hashlib.sha256(settings.jwt_secret.encode()).digest())
    return Fernet(derived)


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str | None) -> str | None:
    if not ciphertext:
        return None
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        return None
