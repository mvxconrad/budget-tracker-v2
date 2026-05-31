"""Bank account linking via Plaid. STUB — not implemented.

Plaid needs an application/approval, has costs, and carries real security and
compliance weight (you'd be handling financial credentials). The endpoints exist
so the shape is reserved; they return 501 until deliberately built out.
"""
from fastapi import APIRouter, Depends, HTTPException

from ..deps import get_current_user

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.post("/link-token")
def create_link_token(user: dict = Depends(get_current_user)):
    # TODO: Plaid /link/token/create using settings.plaid_client_id / plaid_secret.
    raise HTTPException(501, "Bank linking not implemented yet")


@router.post("/exchange")
def exchange_public_token(user: dict = Depends(get_current_user)):
    # TODO: Plaid /item/public_token/exchange, then store the access_token per user.
    raise HTTPException(501, "Bank linking not implemented yet")


@router.get("/transactions")
def transactions(user: dict = Depends(get_current_user)):
    # TODO: Plaid /transactions/sync.
    raise HTTPException(501, "Bank linking not implemented yet")
