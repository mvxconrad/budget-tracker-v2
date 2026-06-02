"""Stripe billing: upgrade to Plus/Pro via Checkout, and a webhook that syncs the
user's tier from Stripe subscription events.

Design:
- /checkout (auth required) creates a Stripe Checkout Session for the chosen tier
  and returns its URL; the frontend redirects the browser there.
- /webhook (no auth, Stripe-signed) is the source of truth for `users.tier`. We
  NEVER trust the client to set a paid tier; only a signature-verified Stripe
  event flips it. checkout.session.completed / subscription.updated -> set tier;
  subscription.deleted -> downgrade to free.

Everything is inert until STRIPE_SECRET_KEY + price ids are configured, so the
app runs (and tests pass) with no Stripe account.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import store
from ..config import settings
from ..db import get_session
from ..deps import get_current_user
from ..limiter import limiter
from ..models import User
from ..schemas import CheckoutRequest, CheckoutResponse
from ..tiers import TIERS

log = logging.getLogger("quarterbyte.billing")

router = APIRouter(prefix="/api/billing", tags=["billing"])

# Upgradeable (paid) tiers only — you can't "check out" the free tier.
_PAID_TIERS = tuple(t for t in TIERS if t != "free")


def _stripe():
    """Lazily configure and return the stripe module (kept out of import path so
    the app loads even if the package or key is absent)."""
    import stripe

    stripe.api_key = settings.stripe_secret_key
    return stripe


def _tier_for_price(price_id: str | None) -> str | None:
    """Reverse-map a Stripe price id back to our tier name."""
    if not price_id:
        return None
    for tier, pid in settings.stripe_price_for.items():
        if pid and pid == price_id:
            return tier
    return None


@router.post("/checkout", response_model=CheckoutResponse)
@limiter.limit("10/minute")
async def create_checkout(
    request: Request,
    body: CheckoutRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not settings.billing_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Billing is not configured")

    tier = (body.tier or "").lower()
    if tier not in _PAID_TIERS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown plan")
    price_id = settings.stripe_price_for.get(tier)
    if not price_id:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"No price configured for {tier}")

    stripe = _stripe()
    base = settings.public_base_url.rstrip("/")
    try:
        params = {
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": f"{base}/?upgrade=success",
            "cancel_url": f"{base}/?upgrade=cancelled",
            "client_reference_id": str(user.id),
            # metadata on both the session and the subscription so any event can
            # recover which user + tier it belongs to.
            "metadata": {"user_id": str(user.id), "tier": tier},
            "subscription_data": {"metadata": {"user_id": str(user.id), "tier": tier}},
        }
        # Reuse an existing Stripe customer if we have one; otherwise prefill email.
        if user.stripe_customer_id:
            params["customer"] = user.stripe_customer_id
        else:
            params["customer_email"] = user.email
        checkout = stripe.checkout.Session.create(**params)
    except Exception as e:  # network / Stripe API error
        log.exception("stripe checkout failed")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not start checkout") from e

    return CheckoutResponse(url=checkout.url)


@router.post("/webhook")
async def stripe_webhook(request: Request, session: AsyncSession = Depends(get_session)):
    if not settings.stripe_webhook_secret:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Webhook not configured")

    stripe = _stripe()
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig, settings.stripe_webhook_secret
        )
    except Exception as e:  # bad signature / malformed payload
        log.warning("stripe webhook signature verification failed: %s", e)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid signature") from e

    etype = event["type"]
    obj = event["data"]["object"]

    if etype == "checkout.session.completed":
        await _apply_subscription(session, obj, customer_id=obj.get("customer"))
    elif etype in ("customer.subscription.created", "customer.subscription.updated"):
        # Map the active subscription's price -> tier.
        price_id = None
        try:
            price_id = obj["items"]["data"][0]["price"]["id"]
        except (KeyError, IndexError, TypeError):
            pass
        tier = _tier_for_price(price_id) or (obj.get("metadata") or {}).get("tier")
        status_ = obj.get("status")
        # A canceled/unpaid subscription means no paid access.
        if status_ in ("canceled", "unpaid", "incomplete_expired"):
            tier = "free"
        await _apply_subscription(session, obj, customer_id=obj.get("customer"), tier=tier)
    elif etype == "customer.subscription.deleted":
        await _apply_subscription(session, obj, customer_id=obj.get("customer"), tier="free")

    return {"received": True}


async def _apply_subscription(session, obj, *, customer_id, tier: str | None = None):
    """Resolve the event back to a user and set their tier. Looks up by stored
    stripe_customer_id first, then by the user_id we stamped into metadata."""
    user = None
    if customer_id:
        user = await store.get_user_by_stripe_customer(session, customer_id)
    if user is None:
        meta = obj.get("metadata") or {}
        uid = meta.get("user_id") or obj.get("client_reference_id")
        if uid:
            user = await store.get_user_by_id(session, uid)
    if user is None:
        log.warning("stripe event for unknown user (customer=%s)", customer_id)
        return

    # Default tier from session metadata when not derived from a price.
    if tier is None:
        tier = (obj.get("metadata") or {}).get("tier") or "free"
    if tier not in TIERS:
        tier = "free"

    await store.set_user_tier(
        session, user, tier, stripe_customer_id=customer_id or user.stripe_customer_id
    )
    log.info("set user %s tier=%s via Stripe", user.id, tier)
