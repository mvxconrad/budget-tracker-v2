"""Ledger API — FastAPI entrypoint."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from .config import settings
from .limiter import limiter
from .middleware import RequestContextMiddleware
from .routers import accounts, ai, auth, market, portfolio, settings as settings_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(title="Ledger API", version="0.1.0")

# Rate limiting: registers the limiter, the 429 handler, and the enforcing middleware.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Order matters: middleware added last runs first (outermost). Request context
# wraps everything so even CORS-rejected/erroring requests get an ID + timing.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-request-id", "x-response-time-ms"],
)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(RequestContextMiddleware)

app.include_router(auth.router)
app.include_router(settings_router.router)
app.include_router(ai.router)
app.include_router(market.router)
app.include_router(portfolio.router)
app.include_router(accounts.router)


@app.get("/api/health")
def health():
    """Liveness + which features are enabled by the current env."""
    return {"status": "ok", "features": settings.features()}
