// The single source of truth for budget data.
//
// - Guests: budget lives in localStorage only (a local draft).
// - Signed-in users: budget loads from the server on login and is saved to the
//   server with the Save button. localStorage still mirrors it as a fast cache.
//
// localStorage key is versioned (:v2). The old :v1 held seeded example data from
// before budgets started empty; bumping the key abandons that stale seed so new
// users genuinely start blank.
import { useCallback, useEffect, useRef, useState } from "react";
import { SCHEMA_VERSION, makeEmptyBudget, uid } from "./defaultBudget.js";
import * as apiClient from "./api.js";

const STORAGE_KEY = "quarterbyte-budget:v2";

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeEmptyBudget();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== SCHEMA_VERSION) return makeEmptyBudget();
    return parsed;
  } catch {
    return makeEmptyBudget();
  }
}

export function useBudget(user) {
  const [budget, setBudget] = useState(loadLocal);
  const [dirty, setDirty] = useState(false); // unsaved changes vs. the server
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null); // Date | null
  const skipDirty = useRef(true); // don't flag the initial/loaded state as dirty

  // Mirror to localStorage on every change (draft cache, works for guests too).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
    } catch {
      // storage full / blocked - ignore
    }
    if (skipDirty.current) {
      skipDirty.current = false; // the change that set this state was a load, not an edit
    } else {
      setDirty(true);
    }
  }, [budget]);

  // On login, pull the server copy (if any) so the budget follows the user.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const { budget: serverBudget } = await apiClient.getBudget();
        if (alive && serverBudget) {
          skipDirty.current = true;
          setBudget(serverBudget);
          setDirty(false);
          setLastSaved(new Date());
        }
      } catch {
        // offline or no server budget yet - keep the local draft
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const update = useCallback((fn) => setBudget((b) => fn(structuredClone(b))), []);

  const save = useCallback(async () => {
    if (!user) return; // guests have nothing to save to
    setSaving(true);
    try {
      await apiClient.saveBudget(budget);
      setDirty(false);
      setLastSaved(new Date());
    } finally {
      setSaving(false);
    }
  }, [user, budget]);

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

    clearAll: () => setBudget(makeEmptyBudget()),

    // Merge a partial budget from the AI assistant (apply_budget_edits shape):
    // scalar fields overwrite; savings merges; a category replaces one with the
    // same name (case-insensitive) or is appended. New ids are generated.
    applyEdits: (edits) =>
      update((b) => {
        if (!edits || typeof edits !== "object") return b;
        if (typeof edits.income === "number") b.income = edits.income;
        if (typeof edits.location === "string") b.location = edits.location;
        if (edits.savings && typeof edits.savings === "object") {
          b.savings = { ...b.savings, ...edits.savings };
        }
        if (Array.isArray(edits.categories)) {
          for (const incoming of edits.categories) {
            if (!incoming || typeof incoming.name !== "string") continue;
            const cat = {
              id: uid("cat"),
              name: incoming.name,
              items: (incoming.items || []).map((it) => ({
                id: uid("it"),
                label: String(it.label ?? ""),
                amount: Number(it.amount) || 0,
              })),
            };
            const idx = b.categories.findIndex(
              (c) => c.name.trim().toLowerCase() === incoming.name.trim().toLowerCase()
            );
            if (idx >= 0) cat.id = b.categories[idx].id, (b.categories[idx] = cat);
            else b.categories.push(cat);
          }
        }
        return b;
      }),

    // Save / sync state for the UI.
    save,
    saving,
    dirty,
    lastSaved,
  };

  return [budget, api];
}

// Derived numbers - computed, never stored.
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
