// Shared, refined UI primitives: KPI stats, labels, tables bits, inputs, chart.
import { BORDER, BORDER_SOFT, PRIMARY, SURFACE, TEXT, TEXT_2, TEXT_3, fmt } from "./theme.js";

// Section label - small uppercase eyebrow, optional right-aligned slot.
// `dot` adds a small colored marker before the label (tasteful brand accent).
export const SectionLabel = ({ children, right, dot }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 600, letterSpacing: 0.7, textTransform: "uppercase", color: TEXT_3 }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: 2, background: dot, flexShrink: 0 }} />}
      {children}
    </div>
    {right}
  </div>
);

// KPI card. `tint` adds a subtle colored left edge + label color so a row of
// stats echoes the brand palette without shouting.
export const Stat = ({ label, value, sub, accent, tint }) => (
  <div
    className="card"
    style={{
      flex: "1 1 150px",
      minWidth: 0,
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      borderLeft: tint ? `3px solid ${tint}` : `1px solid ${BORDER}`,
      borderRadius: 10,
      padding: "14px 16px",
    }}
  >
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: tint || TEXT_3 }}>
      {label}
    </div>
    <div className="tnum" style={{ marginTop: 9, fontSize: 24, fontWeight: 700, lineHeight: 1.05, color: accent || TEXT }}>
      {typeof value === "number" ? fmt(value) : value}
    </div>
    {sub && <div style={{ marginTop: 6, fontSize: 12, color: TEXT_2 }}>{sub}</div>}
  </div>
);

// Small badge / pill.
export const Pill = ({ children, color = TEXT_3 }) => (
  <span
    style={{
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color,
      background: `${color}1f`,
      padding: "2px 6px",
      borderRadius: 5,
    }}
  >
    {children}
  </span>
);

// Slim stacked allocation bar.
export const StackBar = ({ segments, total }) => (
  <div style={{ display: "flex", height: 8, borderRadius: 5, overflow: "hidden", background: BORDER_SOFT }}>
    {total > 0 &&
      segments.map((s, i) => (
        <div key={i} title={`${s.label}: ${fmt(s.value)}`} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
      ))}
  </div>
);

export const Legend = ({ items }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", marginTop: 14 }}>
    {items.map((it, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: TEXT_2 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: it.color, flexShrink: 0 }} />
        <span>{it.label}</span>
        <span className="tnum" style={{ color: TEXT_3 }}>{it.value}</span>
      </div>
    ))}
  </div>
);

export const InfoBox = ({ color = PRIMARY, title, children }) => (
  <div
    style={{
      marginBottom: 10,
      padding: "12px 14px",
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      borderLeft: `2px solid ${color}`,
      borderRadius: 8,
      fontSize: 13,
      color: TEXT_2,
      lineHeight: 1.65,
    }}
  >
    {title && <strong style={{ color: TEXT, fontWeight: 600 }}>{title}</strong>} {children}
  </div>
);

// Column header cell for tables.
export const Th = ({ children, right }) => (
  <span
    style={{
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: TEXT_3,
      justifySelf: right ? "end" : "start",
    }}
  >
    {children}
  </span>
);

export const Btn = ({ children, onClick, variant = "ghost", disabled, title, style }) => (
  <button
    className={`btn ${variant === "primary" ? "btn-primary" : "btn-ghost"}`}
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      fontSize: 12.5,
      fontWeight: 600,
      padding: "7px 13px",
      borderRadius: 7,
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      color: variant === "primary" ? "#fff" : TEXT_2,
      background: variant === "primary" ? PRIMARY : "transparent",
      border: `1px solid ${variant === "primary" ? PRIMARY : BORDER}`,
      ...style,
    }}
  >
    {children}
  </button>
);

export const IconBtn = ({ children, onClick, title }) => (
  <button
    className="icon-btn"
    onClick={onClick}
    title={title}
    style={{
      width: 26,
      height: 26,
      borderRadius: 6,
      color: TEXT_3,
      background: "transparent",
      border: `1px solid ${BORDER}`,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      flexShrink: 0,
    }}
  >
    {children}
  </button>
);

// Inline text field - reads as text, reveals an editable surface on hover/focus.
export const TextInput = ({ value, onChange, placeholder, style }) => (
  <input
    className="field"
    type="text"
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    style={style}
  />
);

// Currency field - "$" prefix and number highlight together.
export const MoneyInput = ({ value, onChange, width = 108, style }) => (
  <label className="field-wrap" style={{ width, justifyContent: "flex-end", ...style }}>
    <span className="prefix">$</span>
    <input
      type="number"
      value={value === 0 ? 0 : value || ""}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      style={{ flex: 1, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
    />
  </label>
);

// Plain numeric field (optional unit suffix). Passes the raw string to onChange.
export const NumField = ({ value, onChange, step, suffix, width = 108 }) => (
  <label className="field-wrap" style={{ width, justifyContent: "flex-end" }}>
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ flex: 1, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
    />
    {suffix && <span className="prefix">{suffix}</span>}
  </label>
);

// Dependency-free area chart for projections.
export const AreaChart = ({ values, color = PRIMARY, height = 156 }) => {
  const W = 660;
  const H = height;
  const pad = 8;
  const n = values.length;
  if (n < 2) return <div style={{ height: H }} />;
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const x = (i) => pad + (i * (W - 2 * pad)) / (n - 1);
  const y = (v) => H - pad - ((v - min) / span) * (H - 2 * pad);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${(H - pad).toFixed(1)} L${x(0).toFixed(1)},${(H - pad).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaFill)" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};
