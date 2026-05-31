"""AI assistant route.

Real Anthropic call, gated on ANTHROPIC_API_KEY: with no key it returns a clear
"not configured" response instead of erroring, so the frontend seam works before
you add billing. Runs a manual tool-use loop so Claude can both propose budget
edits (returned to the UI) and run projections (executed here).

Auth is intentionally optional in this skeleton (get_optional_user) so you can
test without logging in. To require login, swap to get_current_user.
"""
import json

from fastapi import APIRouter, Depends, Request

from ..config import settings
from ..deps import get_optional_user
from ..limiter import limiter
from ..schemas import ChatRequest, ChatResponse
from ..services.budget_tools import SYSTEM, TOOLS, compute_projection

router = APIRouter(prefix="/api/ai", tags=["ai"])

_client = None


def _get_client():
    global _client
    if _client is None:
        from anthropic import AsyncAnthropic

        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")  # the expensive route — real model spend per call
async def chat(request: Request, req: ChatRequest, _user=Depends(get_optional_user)):
    if not settings.anthropic_api_key:
        return ChatResponse(
            reply="The assistant isn't configured yet. Add ANTHROPIC_API_KEY to the "
            "server's .env to turn it on.",
            edits=None,
            configured=False,
        )

    client = _get_client()
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
