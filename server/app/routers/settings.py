"""Per-user settings: store the user's own AI API key so the assistant runs on
their account. Keys are write-only over the API — we return only a masked hint,
never the full key. Requires auth.

Provider support: 'anthropic' is wired for real (key validation + used by the AI
route). 'openai' is accepted/stored so the UI can offer it, but not yet used.
"""
from fastapi import APIRouter, Depends, HTTPException, Request

from ..deps import get_current_user
from ..limiter import limiter
from ..schemas import SettingsResponse, SettingsUpdate, TestKeyResponse
from ..store import get_settings, set_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])

VALID_PROVIDERS = {"anthropic", "openai"}


def _to_response(s: dict) -> SettingsResponse:
    key = s.get("api_key")
    return SettingsResponse(
        provider=s.get("provider"),
        has_key=bool(key),
        key_hint=f"…{key[-4:]}" if key else None,
    )


@router.get("", response_model=SettingsResponse)
def read_settings(user: dict = Depends(get_current_user)):
    return _to_response(get_settings(user["email"]))


@router.put("", response_model=SettingsResponse)
def update_settings(body: SettingsUpdate, user: dict = Depends(get_current_user)):
    fields: dict = {}
    if body.provider is not None:
        if body.provider not in VALID_PROVIDERS:
            raise HTTPException(400, f"provider must be one of {sorted(VALID_PROVIDERS)}")
        fields["provider"] = body.provider
    if body.api_key is not None:
        key = body.api_key.strip()
        fields["api_key"] = key or None  # empty string clears it
    s = set_settings(user["email"], **fields)
    return _to_response(s)


@router.delete("", response_model=SettingsResponse)
def clear_key(user: dict = Depends(get_current_user)):
    s = set_settings(user["email"], api_key=None)
    return _to_response(s)


@router.post("/test-key", response_model=TestKeyResponse)
@limiter.limit("6/minute")
async def test_key(request: Request, user: dict = Depends(get_current_user)):
    """Validate the stored key with a tiny live call so the user gets a clear
    'connected' check instead of discovering a bad key mid-chat."""
    s = get_settings(user["email"])
    provider, key = s.get("provider"), s.get("api_key")
    if not key:
        raise HTTPException(400, "No API key saved")
    if provider == "anthropic":
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
    return TestKeyResponse(ok=False, detail=f"Validation for '{provider}' not implemented yet.")


def _clean_err(e: Exception) -> str:
    msg = str(e)
    if "authentication" in msg.lower() or "401" in msg:
        return "Invalid API key."
    if "rate" in msg.lower() or "429" in msg:
        return "Rate limited — key is valid but throttled."
    return "Could not validate key."
