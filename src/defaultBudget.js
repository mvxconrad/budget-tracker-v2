// The budget data shape. New users (and guests) start with a completely EMPTY
// budget: no seeded categories, income, or location. The user fills it in by
// hand, or the AI advisor populates it via apply_budget_edits. Nothing is
// hardcoded so every account is a blank slate.

export const SCHEMA_VERSION = 1;

let counter = 0;
// Simple unique id for categories and line items.
export const uid = (prefix = "id") =>
  `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

// A blank budget. This is what the app starts with.
export function makeEmptyBudget() {
  return {
    version: SCHEMA_VERSION,
    title: "My Budget",
    subtitle: "",
    location: "",
    locationZip: "", // ZIP of the selected city, for the HUD rent benchmark
    income: 0,
    savings: { startingBalance: 0, apyPercent: 3.1, months: 6, overrides: {} },
    categories: [],
  };
}

// Default budget == empty budget. (Kept as a named export so callers that ask
// for "the default" always get a clean slate.)
export const makeDefaultBudget = makeEmptyBudget;
