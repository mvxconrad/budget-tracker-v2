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
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null); // Date | null
  // The exact JSON we last persisted to the server. `dirty` = current budget
  // differs from this. null means "never saved to the server" -> always dirty,
  // so a signed-in user with unsaved work never sees a false "Saved".
  const [savedSnapshot, setSavedSnapshot] = useState(null);

  // Mirror to localStorage on every change (draft cache, also for guests).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
    } catch {
      // storage full / blocked - ignore
    }
  }, [budget]);

  // On login, pull the server copy (if any) so the budget follows the user.
  useEffect(() => {
    if (!user) {
      setSavedSnapshot(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const { budget: serverBudget } = await apiClient.getBudget();
        if (!alive) return;
        if (serverBudget) {
          setBudget(serverBudget);
          setSavedSnapshot(JSON.stringify(serverBudget));
          setLastSaved(new Date());
        } else {
          setSavedSnapshot(null); // user has nothing saved yet -> dirty
        }
      } catch {
        // offline or request failed - treat as not-yet-saved
        if (alive) setSavedSnapshot(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  // Dirty = signed in AND current budget != last server snapshot.
  const dirty = !!user && JSON.stringify(budget) !== savedSnapshot;

  const update = useCallback((fn) => setBudget((b) => fn(structuredClone(b))), []);

  const save = useCallback(async () => {
    if (!user) return; // guests have nothing to save to
    setSaving(true);
    try {
      const snapshot = JSON.stringify(budget);
      await apiClient.saveBudget(budget);
      setSavedSnapshot(snapshot);
      setLastSaved(new Date());
    } finally {
      setSaving(false);
    }
  }, [user, budget]);

  const api = {
    setTitle: (title) => update((b) => ((b.title = title), b)),
    setSubtitle: (subtitle) => update((b) => ((b.subtitle = subtitle), b)),
    setLocation: (location) => update((b) => ((b.location = location), b)),
    setLocationZip: (zip) => update((b) => ((b.locationZip = zip || ""), b)),
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
          const { overrides: incomingOverrides, ...rest } = edits.savings;
          b.savings = { ...b.savings, ...rest };
          // The AI sends overrides as [{month (1-based), amount}]; the budget
          // stores them as a 0-based-index map. Convert and merge.
          if (Array.isArray(incomingOverrides)) {
            b.savings.overrides = { ...(b.savings.overrides || {}) };
            for (const o of incomingOverrides) {
              const m = Number(o?.month);
              if (!Number.isFinite(m) || m < 1) continue;
              b.savings.overrides[m - 1] = Math.max(0, Number(o.amount) || 0);
            }
          }
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
