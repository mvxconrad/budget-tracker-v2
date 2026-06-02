# Quarterbyte API

The FastAPI backend for Quarterbyte. Async throughout, PostgreSQL-backed, with
JWT and refresh-token auth, an email-verification gate, and a bring-your-own-key
AI advisor. Features light up as their env keys are provided.

Interactive API docs (Swagger): `http://localhost:8000/docs`


## Run it

```bash
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # set JWT_SECRET; DATABASE_URL optional (see below)
uvicorn app.main:app --reload   # http://localhost:8000
```

**Database:** leave `DATABASE_URL` blank and it uses a local SQLite file, creating
tables on startup, so it runs with zero setup. Point it at Postgres for prod:

```
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DBNAME
```

**Migrations** (Postgres): run once after pulling schema changes.

```bash
alembic upgrade head
```

**Tests:**

```bash
pip install -r requirements-dev.txt
pytest                          # 25 tests, SQLite-backed, no Postgres needed
```

## Routes

| Area | Route(s) | State |
|------|----------|-------|
| Health | `GET /api/health` | live (reports which features are on) |
| Auth | `register`, `verify`, `resend`, `login`, `refresh`, `logout`, `me` | JWT + rotating refresh tokens, email-verified gate |
| Settings | `GET/PUT/DELETE /api/settings`, `POST /api/settings/test-key` | per-user AI key, encrypted at rest, masked on read |
| Budget sync | `GET/PUT /api/budget` | signed-in users' budget, stored as JSONB |
| AI assistant | `POST /api/ai/chat` | real Anthropic call; uses the user's key, else server fallback |
| Admin | `GET /api/admin/stats`, `GET /api/admin/users`, `PUT .../role` | role-gated (403 for non-admins) |
| Market | `GET /api/market/quote` | mock until `FINNHUB_API_KEY` |
| Portfolio | `GET/PUT /api/portfolio` | stub (no table yet) |
| Bank linking | `/api/accounts/*` | Plaid stubs (501) |

## How auth works

1. **Register** creates an unverified user and emails a 6-digit code. No tokens yet.
2. **Verify** the code to receive an access token (short-lived JWT) plus a refresh
   token (opaque; only its SHA-256 hash is stored, and it rotates on every use).
3. **Login** refuses unverified accounts with `403 email_not_verified`. Every
   protected route also requires a verified email, so the gate can't be bypassed.

Promote an admin directly in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

## Email

`EMAIL_PROVIDER` selects the sender:

- `console` (default) logs the code to the server log. Zero setup; great for dev.
- `ses` sends a styled HTML+text email via AWS SES. Needs `EMAIL_FROM` set to a
  verified SES identity, `ses:SendEmail` IAM permission, and (for real users) the
  account out of the SES sandbox. Sends run off the event loop and never crash
  registration; a failed send is logged and the user can resend.

Full SES setup (verify a sender, leave the sandbox, IAM policy) is in
[../INFRASTRUCTURE.md](../INFRASTRUCTURE.md#email-aws-ses--verification-codes).

## The AI assistant

`POST /api/ai/chat` takes `{ message, budget, history }` and returns
`{ reply, edits, configured }`. `edits` is a partial budget the frontend applies
to the on-screen UI; the assistant can also run savings projections server-side
to answer what-if and goal questions. Model is `claude-opus-4-8` with adaptive
thinking; tool and schema definitions live in `app/services/budget_tools.py`,
which is the file to grow as the assistant gets smarter.

The route streams a single JSON response today. To stream tokens to the UI later,
switch the final model call to `client.messages.stream(...)` behind a
`StreamingResponse`; the tool-use loop stays the same.

## Layout

```
app/
  main.py                  app + middleware + router wiring
  config.py                env-driven settings + feature flags
  db.py                    async engine + session dependency
  models.py                SQLAlchemy ORM models
  store.py                 data-access layer (all bound-param queries)
  security.py              bcrypt, JWT, refresh-token hashing
  crypto.py                Fernet encryption for per-user secrets
  email.py                 OTP generation + pluggable sender
  deps.py                  auth dependencies (current user, admin)
  limiter.py               slowapi rate limiting
  middleware.py            request IDs, timing, clean error JSON
  routers/                 one module per area
  services/budget_tools.py AI tools + projection math
alembic/                   migrations (0001 schema, 0002 email verification)
tests/test_security.py     injection / auth / admin / crypto coverage
```

See [../INFRASTRUCTURE.md](../INFRASTRUCTURE.md) for the live AWS setup and where
each secret lives.
