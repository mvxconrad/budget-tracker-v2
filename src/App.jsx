import { useState } from "react";
import {
  BG,
  BORDER_SOFT,
  FONT,
  PRIMARY,
  PRIMARY_SOFT,
  PRIMARY_TEXT,
  SIDEBAR,
  TEXT,
  TEXT_2,
  TEXT_3,
} from "./theme.js";
import { useBudget } from "./useBudget.js";
import { Btn, Pill } from "./components.jsx";
import BudgetTab from "./tabs/BudgetTab.jsx";
import SavingsTab from "./tabs/SavingsTab.jsx";
import HelpTab from "./tabs/HelpTab.jsx";

const NAV = [
  { key: "budget", label: "Budget", icon: "budget" },
  { key: "savings", label: "Savings", icon: "savings" },
];
const SOON = [
  { key: "investments", label: "Investments", icon: "investments" },
  { key: "reports", label: "Reports", icon: "reports" },
];
const TITLES = { budget: "Budget", savings: "Savings", help: "Help" };

export default function App() {
  const [budget, api] = useBudget();
  const [active, setActive] = useState("budget");

  const onReset = () => {
    if (confirm("Reload the example budget? Your current changes will be replaced.")) api.resetToExample();
  };
  const onClear = () => {
    if (confirm("Clear everything and start from a blank budget?")) api.clearAll();
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: BG, color: TEXT, fontFamily: FONT }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 232,
          flexShrink: 0,
          background: SIDEBAR,
          borderRight: `1px solid ${BORDER_SOFT}`,
          display: "flex",
          flexDirection: "column",
          padding: "18px 14px",
        }}
      >
        <Brand />
        <NavGroup label="Workspace">
          {NAV.map((n) => (
            <NavItem key={n.key} {...n} active={active === n.key} onClick={() => setActive(n.key)} />
          ))}
        </NavGroup>
        <NavGroup label="Coming soon">
          {SOON.map((n) => (
            <NavItem key={n.key} {...n} soon />
          ))}
        </NavGroup>
        <div style={{ flex: 1 }} />
        <NavItem label="Help" icon="help" active={active === "help"} onClick={() => setActive("help")} />
        <div style={{ marginTop: 10, paddingTop: 12, borderTop: `1px solid ${BORDER_SOFT}`, fontSize: 11, color: TEXT_3, paddingLeft: 10 }}>
          Saved locally in your browser
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 60,
            flexShrink: 0,
            borderBottom: `1px solid ${BORDER_SOFT}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600 }}>{TITLES[active]}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Btn onClick={onReset}>Reset</Btn>
            <Btn onClick={onClear}>Clear</Btn>
            <Btn variant="primary" disabled title="Coming soon">
              <Icon name="plus" size={15} /> Connect account
            </Btn>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 880, margin: "0 auto", padding: "30px 28px 72px" }}>
            {active === "budget" && <BudgetTab budget={budget} api={api} />}
            {active === "savings" && <SavingsTab budget={budget} api={api} />}
            {active === "help" && <HelpTab />}
          </div>
        </div>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 8px 20px" }}>
      <div
        style={{
          width: 27,
          height: 27,
          borderRadius: 8,
          background: `linear-gradient(135deg, ${PRIMARY}, #4a57d8)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        L
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>Ledger</div>
    </div>
  );
}

function NavGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: TEXT_3, padding: "0 10px 8px" }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
    </div>
  );
}

function NavItem({ label, icon, active, soon, onClick }) {
  return (
    <button
      className={`nav-item${active ? " active" : ""}`}
      onClick={onClick}
      disabled={soon}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        textAlign: "left",
        padding: "8px 10px",
        borderRadius: 7,
        border: "none",
        background: active ? PRIMARY_SOFT : "transparent",
        color: active ? PRIMARY_TEXT : soon ? TEXT_3 : TEXT_2,
        fontSize: 13.5,
        fontWeight: active ? 600 : 500,
        fontFamily: "inherit",
      }}
    >
      <Icon name={icon} />
      <span style={{ flex: 1 }}>{label}</span>
      {soon && <Pill>Soon</Pill>}
    </button>
  );
}

function Icon({ name, size = 17 }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "budget":
      return (
        <svg {...p}>
          <rect x="2.5" y="5" width="19" height="15" rx="2.5" />
          <path d="M2.5 9.5h19" />
          <circle cx="17" cy="14.5" r="1.4" />
        </svg>
      );
    case "savings":
      return (
        <svg {...p}>
          <path d="M3 16.5l6-6 4 4 7.5-7.5" />
          <path d="M16 7h4.5v4.5" />
        </svg>
      );
    case "investments":
      return (
        <svg {...p}>
          <path d="M4 20V11M9.3 20V6M14.6 20v-5M20 20V8" />
        </svg>
      );
    case "reports":
      return (
        <svg {...p}>
          <rect x="5" y="3" width="14" height="18" rx="2.5" />
          <path d="M9 8.5h6M9 12.5h6M9 16.5h4" />
        </svg>
      );
    case "help":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.6 9.3a2.4 2.4 0 1 1 3.3 2.2c-.7.4-1.1.9-1.1 1.7" />
          <path d="M11.9 16.4h.01" />
        </svg>
      );
    case "plus":
      return (
        <svg {...p}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    default:
      return null;
  }
}
