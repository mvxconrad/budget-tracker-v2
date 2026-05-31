# Ledger API (FastAPI backend)

The Python backend for the budget app. Skeleton: every route exists; each feature
turns on when its key is present.

## Run it

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate          # this is the venv you asked about earlier
pip install -r requirements.txt
cp .env.example .env               # then fill in keys (ANTHROPIC_API_KEY, JWT_SECRET)
uvicorn app.main:app --reload      # http://localhost:8000
```

Interactive API docs: http://localhost:8000/docs

## What's wired

| Area | Route(s) | State |
|---|---|---|
| Health / feature flags | `GET /api/health` | ✅ live |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | ✅ JWT + bcrypt, **in-memory users** (swap for a DB) |
| AI assistant | `POST /api/ai/chat` | ✅ real Anthropic call, **key-gated** (returns "not configured" with no key) |
| Market / stocks | `GET /api/market/quote?symbol=AAPL` | 🟡 mock until `FINNHUB_API_KEY` |
| Portfolio | `GET/PUT /api/portfolio` | 🟡 in-memory CRUD, returns vs. (mock) quotes |
| Bank linking (Plaid) | `POST /api/accounts/link-token`, `/exchange`, `GET /transactions` | 🔴 `501` stub |

## The AI assistant

`POST /api/ai/chat` takes `{ message, budget, history }` and returns
`{ reply, edits, configured }`:
- `edits` is a partial budget the frontend applies to the on-screen UI (your
  "tell it my numbers → it fills the form" idea).
- The assistant can also run savings projections server-side to answer what-if /
  goal questions.

Model: `claude-opus-4-8`, adaptive thinking, `effort: medium`. System prompt and
tool defs are marked for prompt caching (engages once the prefix is large enough).
Tool/schema definitions live in `app/services/budget_tools.py` — that's the file
to grow as the assistant gets more capable.

**Streaming:** this skeleton returns a single JSON response (simplest, and fine
for short replies). To stream tokens to the UI later, switch the final model call
to `client.messages.stream(...)` and return a `StreamingResponse` (SSE); the
tool-use loop stays the same, you only stream the final assistant turn.

## Notes / next steps

- Users + portfolios are **in-memory** (`app/store.py`) — they reset on restart.
  First real step toward AWS: swap to Postgres (SQLAlchemy) or DynamoDB.
- Auth on `/api/ai/chat` is currently optional so you can test without logging in
  (`get_optional_user`). Switch to `get_current_user` to require login.
- For AWS: this runs under any ASGI server. Easiest paths are a container on
  App Runner / ECS Fargate, or Lambda via Mangum. Keep secrets in SSM/Secrets
  Manager, not `.env`.
