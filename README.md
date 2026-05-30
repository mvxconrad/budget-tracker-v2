# Budget Tracker

A simple, fully-editable monthly budget app. Set your income, list spending by
category, and see what's left over and how your savings grow. Ships with an example
budget you can edit or wipe clean — anyone can make it their own.

## Features (v1)

- **Editable everything** — income, categories, and line items. Add/rename/remove freely.
- **Live summary** — total expenses, leftover, and a category breakdown bar.
- **Savings projection** — compounds your monthly leftover at a chosen APY over N months.
- **Help tab** — built-in walkthrough for first-time users.
- **Auto-saved** to your browser (localStorage). No account, no backend.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Stack

Vite + React, plain JavaScript, inline styles. No backend — data lives in
`localStorage`. Designed to deploy as a static site (Vercel / Netlify).

## Project layout

```
src/
  theme.js          colors, currency formatting, palette
  defaultBudget.js  the seeded example budget + blank template
  useBudget.js      state hook (load/save + edit helpers) and summarize()
  components.jsx    reusable UI: cards, bar, inputs, buttons
  tabs/
    BudgetTab.jsx   income + categories editor
    SavingsTab.jsx  savings projection
    HelpTab.jsx     tutorial
  App.jsx           header, toolbar, tab switching
reference/
  BudgetV4.jsx      the original hardcoded planning dashboard (kept for reference)
ROADMAP.md          where this is headed (incl. future AI features)
```

## Roadmap

See [ROADMAP.md](ROADMAP.md). Next up: tracking actual spending vs. plan, then
AI helpers (natural-language "what if", transaction categorization, statement import).
