"""AI assistant route.

Key resolution order: the logged-in user's own saved key (Settings, decrypted)
first, then the server's ANTHROPIC_API_KEY env fallback. With neither, returns a
clear "not configured" response instead of erroring.

Auth is optional (get_optional_user) so the seam works without login, but a
logged-in user with a saved key runs the assistant on their own account.
"""
import json

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from .. import store
from ..config import settings
from ..db import get_session
from ..deps import get_optional_user
from ..limiter import limiter
from ..models import User
from ..schemas import ChatRequest, ChatResponse, UsageInfo
from ..services.budget_tools import SYSTEM, TOOLS, compute_projection
from ..tiers import limit_for

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Cache one Anthropic client per distinct key (users bring their own).
_clients: dict[str, object] = {}


def _client_for(key: str):
    if key not in _clients:
        from anthropic import AsyncAnthropic

        _clients[key] = AsyncAnthropic(api_key=key)
    return _clients[key]


def _resolve_key(user: User | None) -> tuple[str, bool]:
    """Return (api_key, is_byok). BYOK = the user is on their own key, which is
    never metered. Falls back to the shared server key (is_byok=False)."""
    if user and (user.api_provider or "anthropic") == "anthropic":
        key = store.get_user_api_key(user)
        if key:
            return key, True
    return settings.anthropic_api_key, False  # env fallback (metered)


def _usage_info(user: User) -> UsageInfo:
    limit = limit_for(user.tier)
    return UsageInfo(
        used=user.ai_messages_used or 0, limit=limit, tier=user.tier, unlimited=False
    )


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")  # the expensive route — real model spend per call
async def chat(
    request: Request,
    req: ChatRequest,
    user: User | None = Depends(get_optional_user),
    session: AsyncSession = Depends(get_session),
):
    api_key, is_byok = _resolve_key(user)
    if not api_key:
        return ChatResponse(
            reply="The assistant isn't connected yet. Add your Anthropic API key in "
            "Settings to turn it on.",
            edits=None,
            configured=False,
        )

    # Metering applies ONLY when falling back to the shared server key. BYOK users
    # pay Anthropic directly and are unlimited; anonymous callers can't use the
    # server key at all (no account to meter, and it protects our spend).
    if not is_byok:
        if not user:
            return ChatResponse(
                reply="Sign in to chat with Q, or add your own Anthropic API key in "
                "Settings for unlimited use.",
                edits=None,
                configured=False,
            )
        await store.reset_ai_usage_if_stale(session, user)
        limit = limit_for(user.tier)
        if (user.ai_messages_used or 0) >= limit:
            return ChatResponse(
                reply=f"You've used all {limit} of your {user.tier} plan's monthly "
                "messages. Upgrade for more, or add your own Anthropic API key in "
                "Settings for unlimited use.",
                edits=None,
                configured=True,
                limit_reached=True,
                usage=_usage_info(user),
            )

    client = _client_for(api_key)
    budget_json = json.dumps(req.budget.model_dump(), indent=2)
    messages: list[dict] = [t.model_dump() for t in req.history]
    messages.append(
        {
            "role": "user",
            "content": f"Current budget:\n```json\n{budget_json}\n```\n\n{req.message}",
        }
    )

    captured_edits: dict | None = None

    for _ in range(6):  # bound the tool loop
        resp = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=4096,
            system=SYSTEM,
            tools=TOOLS,
            messages=messages,
            thinking={"type": "adaptive"},
            output_config={"effort": "medium"},
        )

        if resp.stop_reason == "tool_use":
            tool_results = []
            for block in resp.content:
                if block.type != "tool_use":
                    continue
                if block.name == "apply_budget_edits":
                    captured_edits = {**(captured_edits or {}), **block.input}
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": "Applied to the user's screen.",
                        }
                    )
                elif block.name == "project_savings":
                    out = compute_projection(**block.input)
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(out),
                        }
                    )
            messages.append({"role": "assistant", "content": resp.content})
            messages.append({"role": "user", "content": tool_results})
            continue

        reply = "".join(b.text for b in resp.content if b.type == "text")
        usage = None
        if not is_byok:
            await store.increment_ai_usage(session, user)
            usage = _usage_info(user)
        return ChatResponse(reply=reply, edits=captured_edits, configured=True, usage=usage)

    # Fell out of the tool loop without a clean text reply. Still a real model
    # call, so meter it the same way.
    usage = None
    if not is_byok:
        await store.increment_ai_usage(session, user)
        usage = _usage_info(user)
    return ChatResponse(
        reply="I took several steps but didn't finish cleanly — try rephrasing.",
        edits=captured_edits,
        configured=True,
        usage=usage,
    )
