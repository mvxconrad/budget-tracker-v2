"""Server-synced budget: load/save the logged-in user's budget (the `budgets`
JSONB table). The frontend keeps using localStorage for guests; signed-in users
can sync so their budget follows them across devices.

The payload is validated against the Budget schema before storage, so only
well-formed JSON shaped like our budget is ever written.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from .. import store
from ..db import get_session
from ..deps import get_current_user
from ..models import User
from ..schemas import Budget

router = APIRouter(prefix="/api/budget", tags=["budget"])


@router.get("")
async def get_budget(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    data = await store.get_budget(session, user)
    return {"budget": data}  # null if the user hasn't synced one yet


@router.put("")
async def save_budget(
    budget: Budget, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)
):
    saved = await store.upsert_budget(session, user, budget.model_dump())
    return {"budget": saved}
