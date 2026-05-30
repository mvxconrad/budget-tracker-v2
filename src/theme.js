// Shared colors, formatting, and small style helpers.
export const ACCENT = "#2E75B6";
export const GREEN = "#22c55e";
export const RED = "#ef4444";
export const AMBER = "#f59e0b";
export const MUTED = "#94a3b8";
export const BORDER = "#1e293b";
export const CARD_BG = "#0f172a";
export const BG = "#060c18";
export const PURPLE = "#a78bfa";

// Palette used to auto-color categories by their position in the list.
export const PALETTE = [
  "#E24B4A", // red
  ACCENT, // blue
  "#1D9E75", // green
  PURPLE, // purple
  AMBER, // amber
  "#4ade80", // light green
  "#38bdf8", // sky
  "#f472b6", // pink
  "#fb923c", // orange
  "#2dd4bf", // teal
];

export const colorForIndex = (i) => PALETTE[i % PALETTE.length];

// Format a number as currency. Strings pass through unchanged.
export const fmt = (n) => {
  if (typeof n === "string") return n;
  if (n == null || Number.isNaN(n)) return "$0";
  const neg = n < 0;
  const abs = Math.abs(Math.round(n));
  const s = "$" + abs.toLocaleString();
  return neg ? `-${s}` : s;
};

export const FONT = "'DM Sans', system-ui, sans-serif";
