"""The AI 'seam': system prompt, tool definitions, and the projection the
assistant can call. The tool schemas mirror the frontend budget shape so the UI
can apply the assistant's proposed edits directly.

cache_control marks the stable prefix (system + tools) for prompt caching. Note:
the Anthropic cache only engages above a model-specific minimum (~4096 tokens for
Opus); a short system prompt like this may not reach it, in which case caching is
a no-op (harmless). It pays off once the prompt/tooling grows.
"""

SYSTEM_PROMPT = (
    "You are Quarterbyte, an AI financial advisor in the user's pocket. You help them "
    "budget, plan, and reach their money goals with clear, practical guidance.\n\n"
    "Each turn you receive the user's current budget as JSON plus a message. You can:\n"
    "- Call `apply_budget_edits` to change their budget. Include ONLY the fields you are "
    "changing; the app applies your edits to the on-screen budget immediately, so be precise.\n"
    "- Call `project_savings` to answer what-if and goal questions (e.g. \"what monthly amount "
    "reaches $20k by month 6?\"). You may call it several times to search for the right number.\n\n"
    "Budget shape:\n"
    "- income: monthly take-home (number)\n"
    "- location: \"City, ST\"\n"
    "- savings: { startingBalance, apyPercent, months, overrides }\n"
    "  - By default every month saves the leftover (income minus expenses).\n"
    "  - overrides sets specific months to a different amount: a list of\n"
    "    { month (1-based), amount }. Use it when the user wants to vary savings\n"
    "    by month, e.g. \"save $500 in month 1 but $900 from month 3 on\" -> include\n"
    "    an entry for each month they specify.\n"
    "- categories: [ { name, items: [ { label, amount } ] } ]\n\n"
    "Guidelines:\n"
    "- When the user states figures (\"I make 7900, rent is 2600\"), map them into apply_budget_edits.\n"
    "- After editing, briefly tell the user what you changed and why.\n"
    "- Offer advisor-style guidance when it helps (savings rate, where they're over/under), but "
    "never invent numbers the user didn't give; ask if something is ambiguous.\n"
    "- Keep replies short, concrete, and free of jargon."
)

# System prompt as a cacheable block.
SYSTEM = [{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}]

_CATEGORY_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "label": {"type": "string"},
                    "amount": {"type": "number"},
                },
                "required": ["label", "amount"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["name", "items"],
    "additionalProperties": False,
}

TOOLS = [
    {
        "name": "apply_budget_edits",
        "description": (
            "Apply changes to the user's budget on screen. Include only fields you want to "
            "change. A category provided here replaces an existing category with the same name "
            "(case-insensitive), otherwise it is added."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "income": {"type": "number"},
                "location": {"type": "string"},
                "savings": {
                    "type": "object",
                    "properties": {
                        "startingBalance": {"type": "number"},
                        "apyPercent": {"type": "number"},
                        "months": {"type": "integer"},
                        "overrides": {
                            "type": "array",
                            "description": (
                                "Per-month savings amounts that differ from the default. Use this "
                                "when the user wants to save different amounts in different months "
                                "(e.g. $500 in month 1, $800 in month 3). month is 1-based."
                            ),
                            "items": {
                                "type": "object",
                                "properties": {
                                    "month": {"type": "integer", "description": "1-based month number"},
                                    "amount": {"type": "number"},
                                },
                                "required": ["month", "amount"],
                                "additionalProperties": False,
                            },
                        },
                    },
                    "additionalProperties": False,
                },
                "categories": {"type": "array", "items": _CATEGORY_SCHEMA},
                "summary": {"type": "string", "description": "One-line summary of what changed."},
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "project_savings",
        "description": "Compute a compound monthly savings projection. Use for what-if and goal questions.",
        "input_schema": {
            "type": "object",
            "properties": {
                "startingBalance": {"type": "number"},
                "monthlyContribution": {"type": "number"},
                "apyPercent": {"type": "number"},
                "months": {"type": "integer"},
            },
            "required": ["startingBalance", "monthlyContribution", "apyPercent", "months"],
            "additionalProperties": False,
        },
        # Cache breakpoint on the last tool → caches system + all tools together.
        "cache_control": {"type": "ephemeral"},
    },
]


def compute_projection(
    startingBalance: float, monthlyContribution: float, apyPercent: float, months: int
) -> dict:
    """Mirror of the frontend SavingsTab projection (end-of-month contribution)."""
    rate = (apyPercent or 0) / 100 / 12
    months = max(1, min(int(months), 600))
    balance = startingBalance
    contributed = 0.0
    interest_total = 0.0
    for _ in range(months):
        interest = balance * rate
        balance = balance + interest + monthlyContribution
        contributed += monthlyContribution
        interest_total += interest
    return {
        "final_balance": round(balance, 2),
        "contributed": round(contributed, 2),
        "interest_total": round(interest_total, 2),
        "months": months,
    }
