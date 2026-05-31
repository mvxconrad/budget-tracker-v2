"""Request-scoped middleware: a request ID + timing on every response, and a
catch-all that turns unhandled exceptions into clean JSON (no stack traces over
the wire) while logging the full traceback server-side.

HTTPException is intentionally NOT caught here — FastAPI already renders those as
proper JSON with the right status code. This only handles the unexpected.
"""
import logging
import time
import uuid

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

log = logging.getLogger("ledger")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        request.state.request_id = request_id
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            elapsed = (time.perf_counter() - start) * 1000
            log.exception("Unhandled error [%s] %s %s (%.0fms)", request_id, request.method, request.url.path, elapsed)
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error", "request_id": request_id},
                headers={"x-request-id": request_id},
            )
        elapsed = (time.perf_counter() - start) * 1000
        response.headers["x-request-id"] = request_id
        response.headers["x-response-time-ms"] = f"{elapsed:.0f}"
        log.info("[%s] %s %s -> %s (%.0fms)", request_id, request.method, request.url.path, response.status_code, elapsed)
        return response
