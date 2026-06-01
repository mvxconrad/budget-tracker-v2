"""Admin panel API. All routes require the 'admin' role (get_admin_user -> 403
for non-admins, 401 for anonymous). Promote a user with:

    UPDATE users SET role = 'admin' WHERE email = 'you@example.com';

Read-only over user data plus a guarded role-change. We never expose password
hashes or API keys here - only whether a key is set.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from .. import store
from ..db import get_session
from ..deps import get_admin_user
from ..models import User

router = APIRouter(prefix="/api/admin", tags=["admin"])


class AdminUser(BaseModel):
    id: str
    email: str
    role: str
    has_api_key: bool
    created_at: str


class AdminStats(BaseModel):
    total_users: int
    users_with_key: int
    saved_budgets: int


class RoleUpdate(BaseModel):
    role: str  # "user" | "admin"


def _to_admin_user(u: User) -> AdminUser:
    return AdminUser(
        id=str(u.id),
        email=u.email,
        role=u.role,
        has_api_key=bool(u.api_key_encrypted),
        created_at=u.created_at.isoformat() if u.created_at else "",
    )


@router.get("/stats", response_model=AdminStats)
async def stats(admin: User = Depends(get_admin_user), session: AsyncSession = Depends(get_session)):
    return AdminStats(
        total_users=await store.count_users(session),
        users_with_key=await store.count_users_with_key(session),
        saved_budgets=await store.count_budgets(session),
    )


@router.get("/users", response_model=list[AdminUser])
async def users(
    limit: int = 100,
    offset: int = 0,
    admin: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    rows = await store.list_users(session, limit=limit, offset=offset)
    return [_to_admin_user(u) for u in rows]


@router.put("/users/{user_id}/role", response_model=AdminUser)
async def set_role(
    user_id: str,
    body: RoleUpdate,
    admin: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    if body.role not in ("user", "admin"):
        raise HTTPException(400, "role must be 'user' or 'admin'")
    target = await store.get_user_by_id(session, user_id)
    if not target:
        raise HTTPException(404, "User not found")
    # Guard: an admin can't demote themselves (avoid locking out the last admin).
    if target.id == admin.id and body.role != "admin":
        raise HTTPException(400, "You cannot remove your own admin role")
    target.role = body.role
    await session.commit()
    await session.refresh(target)
    return _to_admin_user(target)
