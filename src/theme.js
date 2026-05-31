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

export const PRIMARY = "#4f46e5"; // indigo accent
export const PRIMARY_TEXT = "#4338ca"; // accent text on light tint
export const PRIMARY_SOFT = "rgba(79,70,229,0.10)";
export const POSITIVE = "#059669"; // emerald
export const NEGATIVE = "#dc2626"; // red
export const WARNING = "#d97706"; // amber

// Restrained categorical palette, tuned to read well on white.
export const PALETTE = [
  "#4f46e5", // indigo
  "#0d9488", // teal
  "#d97706", // amber
  "#e11d48", // rose
  "#2563eb", // blue
  "#7c3aed", // violet
  "#059669", // emerald
  "#ea580c", // orange
  "#0891b2", // cyan
  "#c026d3", // fuchsia
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
