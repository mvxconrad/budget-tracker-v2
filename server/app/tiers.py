"""Subscription tiers and their monthly limits on the SERVER AI key.

Users who bring their own API key (BYOK) are never metered: they pay Anthropic
directly, so they get unlimited assistant use. These limits apply only when a
user falls back to Quarterbyte's shared server key.
"""

# Monthly assistant-message allowance per tier on the server key.
TIER_LIMITS: dict[str, int] = {"free": 15, "plus": 75, "pro": 200}

# Valid tier names (a Stripe webhook can only ever set one of these).
TIERS: tuple[str, ...] = tuple(TIER_LIMITS)

DEFAULT_TIER = "free"


def limit_for(tier: str | None) -> int:
    """Monthly server-key message limit for a tier (unknown tier -> free)."""
    return TIER_LIMITS.get(tier or DEFAULT_TIER, TIER_LIMITS[DEFAULT_TIER])
