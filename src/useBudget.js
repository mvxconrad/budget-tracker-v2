// The single source of truth for budget data.
// Loads from localStorage, saves on every change, and exposes small
// helpers so the UI never has to hand-write immutable updates.
import { useCallback, useEffect, useState } from "react";
import {
  SCHEMA_VERSION,
  makeDefaultBudget,
  makeEmptyBudget,
  uid,
} from "./defaultBudget.js";

const STORAGE_KEY = "budget-tracker:v1";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeDefaultBudget();
    const parsed = JSON.parse(raw);
    // If we ever bump the schema, fall back to defaults rather than crash.
    if (!parsed || parsed.version !== SCHEMA_VERSION) return makeDefaultBudget();
    return parsed;
  } catch {
    return makeDefaultBudget();
  }
}

export function useBudget() {
  const [budget, setBudget] = useState(load);

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
    } catch {
      // Storage might be full or blocked (private mode) — ignore.
    }
  }, [budget]);

  const update = useCallback((fn) => setBudget((b) => fn(structuredClone(b))), []);

  const api = {
    setTitle: (title) => update((b) => ((b.title = title), b)),
    setSubtitle: (subtitle) => update((b) => ((b.subtitle = subtitle), b)),
    setLocation: (location) => update((b) => ((b.location = location), b)),
    setIncome: (income) => update((b) => ((b.income = income), b)),

    setSavingsField: (field, value) =>
      update((b) => {
        b.savings[field] = value;
        // Drop pinned months that fall outside a reduced horizon, so they
        // don't silently reappear if the user later raises the month count.
        if (field === "months" && b.savings.overrides) {
          for (const k of Object.keys(b.savings.overrides)) {
            if (Number(k) >= value) delete b.savings.overrides[k];
          }
        }
        return b;
      }),

    // Pin a single month's savings contribution (clamped to a non-negative number).
    setSavingsOverride: (i, amount) =>
      update((b) => {
        (b.savings.overrides ||= {})[i] = Math.max(0, Number(amount) || 0);
        return b;
      }),
    // Un-pin a month so it auto-fills from the budget leftover again.
    clearSavingsOverride: (i) =>
      update((b) => {
        if (b.savings.overrides) delete b.savings.overrides[i];
        return b;
      }),

    addCategory: () =>
      update((b) => {
        b.categories.push({ id: uid("cat"), name: "New category", items: [] });
        return b;
      }),
    renameCategory: (id, name) =>
      update((b) => {
        const c = b.categories.find((c) => c.id === id);
        if (c) c.name = name;
        return b;
      }),
    removeCategory: (id) =>
      update((b) => {
        b.categories = b.categories.filter((c) => c.id !== id);
        return b;
      }),

    addItem: (catId) =>
      update((b) => {
        const c = b.categories.find((c) => c.id === catId);
        if (c) c.items.push({ id: uid("it"), label: "New item", amount: 0 });
        return b;
      }),
    updateItem: (catId, itemId, field, value) =>
      update((b) => {
        const c = b.categories.find((c) => c.id === catId);
        const it = c && c.items.find((i) => i.id === itemId);
        if (it) it[field] = value;
        return b;
      }),
    removeItem: (catId, itemId) =>
      update((b) => {
        const c = b.categories.find((c) => c.id === catId);
        if (c) c.items = c.items.filter((i) => i.id !== itemId);
        return b;
      }),

    resetToExample: () => setBudget(makeDefaultBudget()),
    clearAll: () => setBudget(makeEmptyBudget()),
  };

  return [budget, api];
}

// Derived numbers — computed, never stored.
export function summarize(budget) {
  const categories = budget.categories.map((c) => ({
    ...c,
    total: c.items.reduce((s, it) => s + (Number(it.amount) || 0), 0),
  }));
  const totalExpenses = categories.reduce((s, c) => s + c.total, 0);
  const income = Number(budget.income) || 0;
  const leftover = income - totalExpenses;
  return { categories, totalExpenses, income, leftover };
}
