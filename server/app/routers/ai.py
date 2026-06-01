"""AI assistant route.

Key resolution order: the logged-in user's own saved key (Settings, decrypted)
first, then the server's ANTHROPIC_API_KEY env fallback. With neither, returns a
clear "not configured" response instead of erroring.

Auth is optional (get_optional_user) so the seam works without login, but a
logged-in user with a saved key runs the assistant on their own account.
"""
import json

from fastapi import APIRouter, Depends, Request

from .. import store
from ..config import settings
from ..deps import get_optional_user
from ..limiter import limiter
from ..models import User
from ..schemas import ChatRequest, ChatResponse
from ..services.budget_tools import SYSTEM, TOOLS, compute_projection

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Cache one Anthropic client per distinct key (users bring their own).
_clients: dict[str, object] = {}


def _client_for(key: str):
    if key not in _clients:
        from anthropic import AsyncAnthropic

        _clients[key] = AsyncAnthropic(api_key=key)
    return _clients[key]


def _resolve_key(user: User | None) -> str:
    if user and (user.api_provider or "anthropic") == "anthropic":
        key = store.get_user_api_key(user)
        if key:
            return key
    return settings.anthropic_api_key  # env fallback


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")  # the expensive route — real model spend per call
async def chat(request: Request, req: ChatRequest, user: User | None = Depends(get_optional_user)):
    api_key = _resolve_key(user)
    if not api_key:
        return ChatResponse(
            reply="The assistant isn't connected yet. Add your Anthropic API key in "
            "Settings to turn it on.",
            edits=None,
            configured=False,
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
        return ChatResponse(reply=reply, edits=captured_edits, configured=True)

    return ChatResponse(
        reply="I took several steps but didn't finish cleanly — try rephrasing.",
        edits=captured_edits,
        configured=True,
    )
