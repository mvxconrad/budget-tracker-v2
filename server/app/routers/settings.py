"""Per-user settings: store the user's own AI API key (encrypted at rest) so the
assistant runs on their account. Keys are write-only over the API — we return
only a masked hint, never the full key. Requires auth.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from .. import store
from ..db import get_session
from ..deps import get_current_user
from ..limiter import limiter
from ..models import User
from ..schemas import SettingsResponse, SettingsUpdate, TestKeyResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])

VALID_PROVIDERS = {"anthropic", "openai"}


def _to_response(user: User) -> SettingsResponse:
    key = store.get_user_api_key(user)
    return SettingsResponse(
        provider=user.api_provider,
        has_key=bool(key),
        key_hint=f"…{key[-4:]}" if key else None,
    )


@router.get("", response_model=SettingsResponse)
async def read_settings(user: User = Depends(get_current_user)):
    return _to_response(user)


@router.put("", response_model=SettingsResponse)
async def update_settings(
    body: SettingsUpdate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)
):
    kwargs: dict = {}
    if body.provider is not None:
        if body.provider not in VALID_PROVIDERS:
            raise HTTPException(400, f"provider must be one of {sorted(VALID_PROVIDERS)}")
        kwargs["provider"] = body.provider
    if body.api_key is not None:
        key = body.api_key.strip()
        kwargs["api_key"] = key or None  # empty string clears it
    user = await store.set_user_api_key(session, user, **kwargs)
    return _to_response(user)


@router.delete("", response_model=SettingsResponse)
async def clear_key(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    user = await store.set_user_api_key(session, user, api_key=None)
    return _to_response(user)


@router.post("/test-key", response_model=TestKeyResponse)
@limiter.limit("6/minute")
async def test_key(request: Request, user: User = Depends(get_current_user)):
    """Validate the stored key with a tiny live call so the user gets a clear
    'connected' check instead of discovering a bad key mid-chat."""
    key = store.get_user_api_key(user)
    if not key:
        raise HTTPException(400, "No API key saved")
    if user.api_provider == "anthropic":
        try:
            from anthropic import AsyncAnthropic

            client = AsyncAnthropic(api_key=key)
            await client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=1,
                messages=[{"role": "user", "content": "hi"}],
            )
            return TestKeyResponse(ok=True, detail="Key works.")
        except Exception as e:  # surface a clean message, not a stack trace
            return TestKeyResponse(ok=False, detail=_clean_err(e))
    return TestKeyResponse(ok=False, detail=f"Validation for '{user.api_provider}' not implemented yet.")


def _clean_err(e: Exception) -> str:
    msg = str(e).lower()
    if "authentication" in msg or "401" in msg:
        return "Invalid API key."
    if "rate" in msg or "429" in msg:
        return "Rate limited — key is valid but throttled."
    return "Could not validate key."
