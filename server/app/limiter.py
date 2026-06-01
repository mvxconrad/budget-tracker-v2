"""Rate limiting (slowapi).

Throttles per client IP by default. Limits are tuned per-route at the decorator:
the AI route is the expensive one (real Anthropic spend) and auth is the
brute-force target, so both are tighter than the rest.

Scope note: the default backend is in-memory, which limits PER PROCESS. That's
correct for a single instance. When you scale to multiple instances on AWS,
point `storage_uri` at Redis (e.g. "redis://...") so the limit is shared — set
RATE_LIMIT_STORAGE_URI and it's picked up automatically.
"""
import os

from slowapi import Limiter
from slowapi.util import get_remote_address

# X-Forwarded-For aware: behind a load balancer / proxy, the real client IP is
# in that header. get_remote_address falls back to the socket peer locally.
def _client_key(request):
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return get_remote_address(request)


# Set RATE_LIMIT_ENABLED=false to disable (used in tests; useful prod escape hatch).
_enabled = os.getenv("RATE_LIMIT_ENABLED", "true").lower() not in ("false", "0", "no")

limiter = Limiter(
    key_func=_client_key,
    default_limits=["200/minute"],  # global backstop for any unannotated route
    storage_uri=os.getenv("RATE_LIMIT_STORAGE_URI", "memory://"),
    enabled=_enabled,
)
