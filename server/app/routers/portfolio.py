"""Investment portfolio (holdings + returns). STUB.

In-memory CRUD per user so the shape is usable now. Returns are computed against
the (currently mock) market quote. Requires auth.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..deps import get_current_user
from ..routers.market import quote as market_quote
from ..store import list_holdings, set_holdings

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


class Holding(BaseModel):
    symbol: str
    shares: float = Field(gt=0)
    cost_basis: float = Field(ge=0)  # per share


@router.get("")
async def get_portfolio(user: dict = Depends(get_current_user)):
    holdings = list_holdings(user["email"])
    enriched = []
    total_value = 0.0
    total_cost = 0.0
    for h in holdings:
        q = await market_quote(h["symbol"])
        value = q["price"] * h["shares"]
        cost = h["cost_basis"] * h["shares"]
        total_value += value
        total_cost += cost
        enriched.append(
            {**h, "price": q["price"], "value": round(value, 2), "gain": round(value - cost, 2)}
        )
    return {
        "holdings": enriched,
        "total_value": round(total_value, 2),
        "total_gain": round(total_value - total_cost, 2),
    }


@router.put("")
def replace_portfolio(holdings: list[Holding], user: dict = Depends(get_current_user)):
    set_holdings(user["email"], [h.model_dump() for h in holdings])
    return {"count": len(holdings)}
