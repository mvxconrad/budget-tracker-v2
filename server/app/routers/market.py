"""Market data (stocks / S&P). STUB.

Returns a deterministic mock quote until FINNHUB_API_KEY is set, at which point
this is where the real provider call goes (e.g. httpx GET to Finnhub /quote).
"""
from fastapi import APIRouter, HTTPException

from ..config import settings

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/quote")
async def quote(symbol: str):
    symbol = symbol.upper().strip()
    if not symbol:
        raise HTTPException(400, "symbol is required")

    if not settings.finnhub_api_key:
        # Deterministic placeholder so the frontend can build against the shape.
        pseudo = sum(ord(c) for c in symbol)
        price = round(50 + pseudo % 450 + (pseudo % 100) / 100, 2)
        return {
            "symbol": symbol,
            "price": price,
            "change": round((pseudo % 7) - 3 + (pseudo % 50) / 100, 2),
            "source": "mock",
        }

    # TODO: real provider call, e.g.
    #   async with httpx.AsyncClient() as c:
    #       r = await c.get("https://finnhub.io/api/v1/quote",
    #                        params={"symbol": symbol, "token": settings.finnhub_api_key})
    #   data = r.json(); return {"symbol": symbol, "price": data["c"], ...}
    raise HTTPException(501, "Live market data not wired yet")
