"""Investment portfolio (holdings + returns). STUB.

Not yet persisted — there is no portfolio table in the current schema (users,
refresh_tokens, budgets). Returns an empty portfolio so the frontend can build
against the shape; PUT reports not-implemented. Wire to a real table when the
investments feature is built. Requires auth.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..deps import get_current_user
from ..models import User

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


class Holding(BaseModel):
    symbol: str
    shares: float = Field(gt=0)
    cost_basis: float = Field(ge=0)  # per share


@router.get("")
async def get_portfolio(user: User = Depends(get_current_user)):
    return {"holdings": [], "total_value": 0.0, "total_gain": 0.0, "note": "not persisted yet"}


@router.put("")
def replace_portfolio(holdings: list[Holding], user: User = Depends(get_current_user)):
    raise HTTPException(501, "Portfolio persistence not implemented yet")
