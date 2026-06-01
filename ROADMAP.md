# Budget Tracker — Roadmap

> Planning doc. No code yet. Goal: turn the existing hardcoded React dashboard
> into a real app — simple to hack on, easy to deploy, and structured so Claude-powered
> features drop in cleanly later.

## Where we are today

A single polished React component (`BudgetV4`) with **all data hardcoded** into the
file: the `months` array, every `<Row>` amount, the category segments. It's a beautiful
*static report* — but to change a number you edit source code.

**What's already good and worth keeping:**

- The visual design (dark theme, cards, tabs, timeline) — reusable as-is.
- The projection engine concept: `compute()` rolls a running cash balance forward
  month by month, applying income, expenses, one-off events, and HYSA interest.
- The real-world modeling: bridge loan, free-rent months, sign-on tax, EF bucket.

**The core limitation:** it's a snapshot, not a tool. It can't answer "what if my
rent were $4,800?" without a code edit, and it can't track what actually happened.

## Guiding priorities (from you)

1. **Stay simple** — minimal deps, easy for you to read and hack on solo.
2. **Easy to deploy** — should go online (phone access) with near-zero ops.
3. **AI-ready** — structure data + logic now so Claude features add cleanly later.

## Recommended stack

| Concern           | Choice                                                         | Why                                                                                                                                                                                |
| ----------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework         | **Vite + React**                                         | You already write React. Vite = instant dev server, tiny config.                                                                                                                   |
| Language          | **TypeScript** (light)                                   | Typed data model pays for itself the moment AI features touch your data. Keep it minimal — no fancy generics.                                                                     |
| State/persistence | **React state + `localStorage`**                       | No backend needed. Your data lives in your browser. Zero ops, free.                                                                                                                |
| Styling           | **Keep the inline-style approach for now**               | Don't rewrite what works. Can extract to CSS later if it gets painful.                                                                                                             |
| Deploy            | **Vercel or Netlify** (static)                           | `git push` → live URL. Free tier is plenty. Works on your phone.                                                                                                                |
| AI (later)        | **Serverless function proxy** (Vercel/Netlify Functions) | Your Claude API key must NOT live in frontend code. A tiny serverless endpoint holds the key and calls Claude. This is the one piece that needs a "backend" — and it's ~30 lines. |

**Why this stays deployable AND ai-ready:** the app is a static site (cheap, simple)
right up until AI features arrive, at which point we add *one* serverless function —
no database, no servers to manage.

## Data model (the heart of it)

Pull everything hardcoded into a single typed shape. Everything else derives from this.

```ts
type Budget = {
  profile:   { title, base, takeHome, location, startDate };
  income:    { monthly, signOn, signOnTaxRate };
  categories: Category[];          // Housing, Transport, Living, EF...
  events:    OneOffEvent[];        // mom loan, repay, paydowns, deposit, furniture
  accounts:  { hysaAPY, efMonthly, efAPY };
  months:    MonthPlan[];          // overrides per month (free rent, etc.)
};

type Category = { name, color, items: { label, amount }[] };
type OneOffEvent = { month, label, amount, type: "in"|"out" };
```

The `compute()` projection logic stays almost exactly as-is — it just reads from this
object instead of module-level constants. **Keep projection logic in its own file,
separate from UI.** That separation is what makes both testing and AI features clean.

## Milestones (start small, ship each step)

### M1 — Make it run (the smallest real step)

Scaffold Vite + React/TS, drop the existing dashboard in unchanged. Outcome: a real
app boots locally at `localhost:5173`. Nothing behaves differently yet — but it's now
a project, not a snippet.

### M2 — Extract data + persist

Move all hardcoded numbers into the `Budget` object above. Load from / save to
`localStorage`. Projections compute from it. Outcome: same UI, but data is now *data*.

### M3 — Make it editable

Add edit controls (click a number → change it) for category line items, income, and
the HYSA rate. Outcome: you can tune your real budget without touching code. **This is
the moment it becomes an actual app.**

### M4 — Deploy

Push to GitHub, connect Vercel/Netlify. Outcome: a live URL you open on your phone.

### M5 — Track actuals (plan vs. reality)

Add a simple transactions list: log what you actually spent, tagged to a category.
Show planned vs. actual per category per month. Outcome: it stops being a *forecast*
and starts being a *tracker*. This is also the data foundation AI features need.

### M6 — AI features

Add the serverless Claude proxy, then layer features (see below).

## AI feature ideas (M6+, once there's real data)

- **Natural-language "what if"** — "what if Sophia pays $800 of rent?" → Claude maps
  it to budget edits and shows the new 6-month projection.
- **Transaction categorization** — paste/import transactions, Claude tags each to a
  category. (Big quality-of-life win for M5.)
- **Monthly check-in / coach** — Claude reviews plan vs. actual and flags drift:
  "you're $180 over on dining, on track for savings."
- **"Can I afford X?"** — simulate a big purchase against the projection.
- **Statement import** — drop a CSV/PDF bank statement, Claude extracts + categorizes.

**Note on cost/keys:** AI calls need an Anthropic API key behind the serverless
function (never in the browser bundle). Usage is cheap at personal scale, but it's the
one part that isn't free-static-hosting.

## AI for projections (parked - possible directions, decide later)

> Backend seam exists (`/api/ai/chat` with tool use: `apply_budget_edits`,
> `project_savings`). These are candidate features, not committed work.

- **Goal-solver** - "I want $30k by December" -> back-solve the monthly contribution
  and offer to apply it across the editable months. Add a `solve_for_goal` tool.
- **Scenario compare** - "what if I move to Austin?" -> pull the COL delta from the
  benchmark data, re-run housing + projection, show before/after side by side.
- **Narrative monthly report** - `/api/ai/report` turns the projection + benchmark
  into a plain-English readout.
- **Proactive nudges** - once transactions exist, flag drift from plan (depends on
  the data layer / bank connection).
- **Chatbot tab** - the visible UI for the above (tell it your numbers, it fills the
  budget + answers what-ifs).

## Connections hub (parked - "route everything" idea)

Generalize Settings into a data-sources hub backed by one encrypted-credential
pattern (already used for the per-user AI key):
- **`connections` table**: `user_id, kind, credentials_encrypted, status` where
  `kind` is anthropic | openai | plaid | brokerage.
- **Banking** via Plaid Link (`/api/accounts/*` stubs exist) -> sync transactions ->
  feeds plan-vs-actual and AI nudges.
- **Portfolios** -> manual entry first, then a brokerage aggregator.
- Each integration = add a `kind` + connect flow + sync job; no new security design.

## Open questions to decide later (not now)

- TypeScript vs. plain JS? (Leaning TS for the data model; reversible.)
- Multi-user ever? (If you + Sophia both want logins, that's when a real backend +
  database enters. Out of scope for v1 — localStorage is fine for one person.)
- Keep inline styles or move to CSS/Tailwind? (Defer until styling gets painful.)

## Suggested next action

Start **M1** — scaffold and get your existing dashboard running as a real app. It's
low-risk, fast, and everything else builds on it.
