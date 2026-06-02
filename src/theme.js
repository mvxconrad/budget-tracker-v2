// Design tokens for a clean, professional light UI (Excel / Monarch / Copilot feel).
// White surfaces on a soft neutral page, crisp slate type, one restrained accent.

export const BG = "#f6f7f9"; // content background (soft gray)
export const SIDEBAR = "#ffffff"; // sidebar rail
export const SURFACE = "#ffffff"; // cards / table bodies
export const SURFACE_2 = "#f3f4f6"; // hover / zebra striping
export const BORDER = "#e5e7eb"; // standard hairline
export const BORDER_SOFT = "#eef0f2"; // faint divider

export const TEXT = "#111827"; // primary text (near-black)
export const TEXT_2 = "#5b6472"; // secondary slate
export const TEXT_3 = "#9aa1ad"; // muted labels

// The four Quarterbyte logo colors. These drive the whole scheme.
export const BRAND_BLUE = "#3b82f6";
export const BRAND_RED = "#ef4444";
export const BRAND_GREEN = "#22c55e";
export const BRAND_AMBER = "#f59e0b";

export const PRIMARY = BRAND_BLUE; // primary accent = logo blue
export const PRIMARY_TEXT = "#2563eb"; // slightly deeper blue for text on light tint
export const PRIMARY_SOFT = "rgba(59,130,246,0.10)";
export const POSITIVE = "#16a34a"; // logo green, deepened for readable text on white
export const NEGATIVE = BRAND_RED; // logo red
export const WARNING = "#d97706"; // logo amber, deepened for readable text on white

// Categorical palette: lead with the four brand colors, then complements.
export const PALETTE = [
  BRAND_BLUE,
  BRAND_RED,
  BRAND_GREEN,
  BRAND_AMBER,
  "#7c3aed", // violet
  "#0d9488", // teal
  "#ec4899", // pink
  "#0891b2", // cyan
  "#ea580c", // orange
  "#6366f1", // indigo
];
export const colorForIndex = (i) => PALETTE[i % PALETTE.length];

export const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

// $ currency, no cents, thousands separators. Strings pass through unchanged.
export const fmt = (n) => {
  if (typeof n === "string") return n;
  if (n == null || Number.isNaN(n)) return "$0";
  const neg = n < 0;
  const s = "$" + Math.abs(Math.round(n)).toLocaleString();
  return neg ? `-${s}` : s;
};

// Signed currency, e.g. +$425 / -$120.
export const fmtSigned = (n) => (n >= 0 ? "+" : "-") + fmt(Math.abs(n));

// Whole-number percent.
export const pct = (n) => `${Math.round(n)}%`;
