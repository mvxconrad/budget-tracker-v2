# Ledger — Budget Tracker

A fully-editable personal budgeting web app. Set your income, list spending by
category, see what's left over, and project your savings forward month by month.
Includes a location-based benchmark, optional accounts, and an AI assistant that
can fill in your budget and answer what-if questions.

**Live (soft launch):** https://d6koy70w6r2op.cloudfront.net

> Soft launch / active development — no custom domain yet. The CloudFront URL is
> the live site.

## Features

- **Editable everything** — income, categories, and line items; add/rename/remove freely.
- **Live summary** — total expenses, leftover, savings rate, category breakdown bar.
- **Savings projection** — compounds your surplus at a chosen APY; each month is
  individually editable (month 1 can differ from month 6).
- **Location benchmark** — grades your housing % and savings rate against
  cost-of-living-adjusted targets, with a real city autocomplete.
- **Accounts** — register / log in (JWT); or use it as a guest (local only).
- **AI assistant** — bring your own Anthropic key in Settings; it proposes budget
  edits and runs projections. *(Backend wired; chat UI is the next build.)*
- **Auto-saved** — budget data persists in your browser (localStorage).

## Repository layout

```
src/                     Frontend — Vite + React 18 (plain JS)
  main.jsx               entry; gates Landing (login) vs App
  App.jsx                sidebar app shell + nav
  auth.jsx               auth context (login/register/guest)
  Landing.jsx            login / create-account screen
  api.js                 backend client (reads VITE_API_URL)
  theme.js               design tokens (light theme)
  useBudget.js           budget state hook + summarize()
  defaultBudget.js       seeded example budget + blank template
  components.jsx         reusable UI (cards, inputs, chart, etc.)
  benchmarks.js          cost-of-living benchmark logic
  geo.js                 city search (Open-Meteo) + caching
  LocationAutocomplete.jsx
  tabs/
    BudgetTab.jsx        income + categories editor + benchmark
    SavingsTab.jsx       per-month savings projection
    SettingsTab.jsx      connect your AI provider key
    HelpTab.jsx          tutorial
server/                  Backend — FastAPI (Python). See server/README.md
  app/
    main.py              app + middleware + router wiring
    routers/             auth, ai, settings, market, portfolio, accounts
    services/            budget_tools.py (AI tools + projection)
.github/workflows/
  deploy-frontend.yml    auto-deploy frontend on push to main
INFRASTRUCTURE.md        live AWS architecture, deploy flow, server details
ROADMAP.md               where this is headed
reference/BudgetV4.jsx   original hardcoded planning dashboard (kept for reference)
```

## Run locally

**Frontend:**
```bash
npm install
npm run dev      # http://localhost:5173  (uses .env.development → localhost:8000)
npm run build    # production build (uses .env.production → CloudFront)
```

**Backend:** see [server/README.md](server/README.md).
```bash
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # set JWT_SECRET, optionally ANTHROPIC_API_KEY
uvicorn app.main:app --reload # http://localhost:8000/docs
```

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite + React 18, plain JS, inline styles, localStorage |
| Backend | FastAPI (Python), JWT auth, slowapi rate limiting, Anthropic SDK |
| Hosting | AWS — S3 + CloudFront (frontend), EC2 + Nginx (backend), region us-west-2 |
| CI/CD | GitHub Actions → S3 + CloudFront invalidation |

The frontend and `/api/*` are served from the **same CloudFront domain** →
single-origin HTTPS, no CORS, no mixed content.

## Deployment

Push to `main` → GitHub Actions builds the frontend, syncs to S3, and invalidates
CloudFront (live in ~1–2 min). Full details, server config, and secrets locations
are in [INFRASTRUCTURE.md](INFRASTRUCTURE.md).

## Roadmap

See [ROADMAP.md](ROADMAP.md). Near-term: a real database (persistence for accounts
+ keys), the AI chatbot tab, then backend auto-deploy.
