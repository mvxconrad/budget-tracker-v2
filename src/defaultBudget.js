// The example budget the app ships with. It's just a starting point -
// the user can edit every field, add/remove categories, or wipe it clean.
// These numbers are seeded from the original LA-move planning sheet.

export const SCHEMA_VERSION = 1;

let counter = 0;
// Simple unique id for categories and line items.
export const uid = (prefix = "id") =>
  `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export function makeDefaultBudget() {
  return {
    version: SCHEMA_VERSION,
    title: "My Budget",
    subtitle: "Monthly overview",
    location: "Los Angeles, CA",
    income: 7900,
    savings: {
      startingBalance: 0,
      apyPercent: 3.1,
      months: 6,
      overrides: {}, // per-month contribution overrides, keyed by month index
    },
    categories: [
      {
        id: uid("cat"),
        name: "Housing",
        items: [
          { id: uid("it"), label: "Rent", amount: 4600 },
          { id: uid("it"), label: "Utilities", amount: 225 },
          { id: uid("it"), label: "WiFi", amount: 70 },
          { id: uid("it"), label: "Renter's insurance", amount: 0 },
        ],
      },
      {
        id: uid("cat"),
        name: "Transportation",
        items: [
          { id: uid("it"), label: "Car payment", amount: 550 },
          { id: uid("it"), label: "Insurance", amount: 430 },
          { id: uid("it"), label: "Gas", amount: 120 },
          { id: uid("it"), label: "Maintenance fund", amount: 120 },
        ],
      },
      {
        id: uid("cat"),
        name: "Living",
        items: [
          { id: uid("it"), label: "Groceries", amount: 300 },
          { id: uid("it"), label: "Entertainment", amount: 700 },
          { id: uid("it"), label: "Subscriptions", amount: 100 },
          { id: uid("it"), label: "Mobile", amount: 60 },
        ],
      },
      {
        id: uid("cat"),
        name: "Emergency Fund",
        items: [{ id: uid("it"), label: "Monthly contribution", amount: 200 }],
      },
    ],
  };
}

// A blank slate for someone who wants to build from scratch.
export function makeEmptyBudget() {
  return {
    version: SCHEMA_VERSION,
    title: "My Budget",
    subtitle: "Monthly overview",
    location: "",
    income: 0,
    savings: { startingBalance: 0, apyPercent: 3.1, months: 6, overrides: {} },
    categories: [],
  };
}
