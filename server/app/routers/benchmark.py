"""Location benchmark backed by HUD Fair Market Rents (official US gov data).

Flow: the frontend geocoder gives a city + state + ZIP; we ask HUD for that ZIP's
Fair Market Rents (real published median rents by bedroom size, updated yearly).
We return the 1- and 2-bedroom FMR plus the data year so the UI can benchmark the
user's housing spend against a real local figure instead of a hardcoded index.

The HUD token lives server-side (HUD_API_TOKEN), never in the browser. Responses
are cached in-process by ZIP since FMR data only changes annually. If the token
is missing or HUD is unreachable, we return {available: false} and the frontend
falls back to its guideline-based estimate.
"""
import logging

import httpx
from fastapi import APIRouter

from ..config import settings

router = APIRouter(prefix="/api/benchmark", tags=["benchmark"])
log = logging.getLogger("quarterbyte")

_HUD_BASE = "https://www.huduser.gov/hudapi/public/fmr"
_cache: dict[str, dict] = {}  # zip -> result


@router.get("/fmr")
async def fmr(zip_code: str = "", city: str = "", state: str = ""):
    """Return Fair Market Rents for a ZIP. Always 200 with an `available` flag so
    the frontend can degrade gracefully."""
    zip_code = (zip_code or "").strip()[:5]
    if not zip_code.isdigit() or len(zip_code) != 5:
        return {"available": False, "reason": "need a 5-digit ZIP"}

    if zip_code in _cache:
        return _cache[zip_code]

    if not settings.hud_api_token:
        return {"available": False, "reason": "not configured"}

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                f"{_HUD_BASE}/data/{zip_code}",
                headers={"Authorization": f"Bearer {settings.hud_api_token}"},
            )
        if r.status_code != 200:
            return {"available": False, "reason": f"hud {r.status_code}"}
        payload = r.json().get("data", {})
        # ZIP-level responses put rents under basicdata (a dict, or a list of
        # small-area entries). Normalize to a single representative figure.
        basic = payload.get("basicdata")
        if isinstance(basic, list):
            basic = basic[0] if basic else {}
        basic = basic or {}
        result = {
            "available": True,
            "zip": zip_code,
            "year": payload.get("year"),
            "area": payload.get("area_name") or payload.get("county_name"),
            "fmr": {
                "studio": basic.get("Efficiency"),
                "one_br": basic.get("One-Bedroom"),
                "two_br": basic.get("Two-Bedroom"),
                "three_br": basic.get("Three-Bedroom"),
            },
        }
        _cache[zip_code] = result
        return result
    except Exception as e:  # noqa: BLE001 - benchmark is best-effort
        log.warning("HUD FMR lookup failed for %s: %s", zip_code, e)
        return {"available": False, "reason": "lookup failed"}
