// Reusable UI building blocks: layout pieces plus inline-editable inputs.
import { ACCENT, BORDER, CARD_BG, MUTED, RED, fmt } from "./theme.js";

export const Section = ({ title, color, right, children }) => (
  <div style={{ marginBottom: 24 }}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: color || ACCENT,
          textTransform: "uppercase",
          letterSpacing: 1.2,
        }}
      >
        {title}
      </div>
      {right}
    </div>
    {children}
  </div>
);

export const MetricCard = ({ label, value, accent, sub }) => (
  <div
    style={{
      background: CARD_BG,
      borderRadius: 10,
      padding: "16px 18px",
      border: `1px solid ${BORDER}`,
      flex: 1,
      minWidth: 0,
    }}
  >
    <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>{label}</div>
    <div
      style={{
        fontSize: 22,
        fontWeight: 600,
        color: accent || "#e2e8f0",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {typeof value === "number" ? fmt(value) : value}
    </div>
    {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{sub}</div>}
  </div>
);

export const Bar = ({ segments, total }) => (
  <div
    style={{
      display: "flex",
      height: 14,
      borderRadius: 7,
      overflow: "hidden",
      background: BORDER,
      margin: "16px 0 8px",
    }}
  >
    {total > 0 &&
      segments.map((s, i) => (
        <div
          key={i}
          style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
          title={`${s.label}: ${fmt(s.value)}`}
        />
      ))}
  </div>
);

export const Legend = ({ items }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 4 }}>
    {items.map((it, i) => (
      <div
        key={i}
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED }}
      >
        <div
          style={{ width: 10, height: 10, borderRadius: 3, background: it.color, flexShrink: 0 }}
        />
        {it.label}
      </div>
    ))}
  </div>
);

export const InfoBox = ({ color, title, children }) => (
  <div
    style={{
      marginBottom: 12,
      padding: "12px 14px",
      background: `${color}10`,
      border: `1px solid ${color}30`,
      borderRadius: 8,
      fontSize: 13,
      color: "#cbd5e1",
      lineHeight: 1.7,
    }}
  >
    {title && <strong style={{ color }}>{title}</strong>} {children}
  </div>
);

const inputBase = {
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: 6,
  color: "#e2e8f0",
  fontFamily: "inherit",
  fontSize: 14,
  padding: "4px 6px",
  outline: "none",
};

// Inline text input that looks like plain text until focused.
export const TextInput = ({ value, onChange, placeholder, style }) => (
  <input
    type="text"
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    style={{ ...inputBase, ...style }}
    onFocus={(e) => (e.target.style.borderColor = BORDER)}
    onBlur={(e) => (e.target.style.borderColor = "transparent")}
  />
);

// Currency input. Stores a clean number; blank counts as 0.
export const MoneyInput = ({ value, onChange, style }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
    <span style={{ color: MUTED, fontSize: 14 }}>$</span>
    <input
      type="number"
      value={value === 0 ? 0 : value || ""}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      style={{
        ...inputBase,
        width: 90,
        textAlign: "right",
        fontVariantNumeric: "tabular-nums",
        ...style,
      }}
      onFocus={(e) => (e.target.style.borderColor = BORDER)}
      onBlur={(e) => (e.target.style.borderColor = "transparent")}
    />
  </div>
);

// Small pill button.
export const Btn = ({ children, onClick, color = ACCENT, ghost, danger, style }) => {
  const c = danger ? RED : color;
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "inherit",
        fontSize: 12,
        fontWeight: 500,
        padding: "6px 12px",
        borderRadius: 7,
        cursor: "pointer",
        color: ghost ? c : "#fff",
        background: ghost ? "transparent" : c,
        border: `1px solid ${ghost ? `${c}55` : c}`,
        ...style,
      }}
    >
      {children}
    </button>
  );
};

export const IconBtn = ({ children, onClick, title }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      fontFamily: "inherit",
      fontSize: 14,
      lineHeight: 1,
      width: 26,
      height: 26,
      borderRadius: 6,
      cursor: "pointer",
      color: MUTED,
      background: "transparent",
      border: `1px solid ${BORDER}`,
      flexShrink: 0,
    }}
  >
    {children}
  </button>
);
