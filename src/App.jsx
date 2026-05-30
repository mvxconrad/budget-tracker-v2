import { useState } from "react";
import { BG, CARD_BG, BORDER, MUTED, ACCENT, FONT } from "./theme.js";
import { useBudget } from "./useBudget.js";
import { Btn, TextInput } from "./components.jsx";
import BudgetTab from "./tabs/BudgetTab.jsx";
import SavingsTab from "./tabs/SavingsTab.jsx";
import HelpTab from "./tabs/HelpTab.jsx";

const TABS = ["Budget", "Savings", "Help"];

export default function App() {
  const [budget, api] = useBudget();
  const [tab, setTab] = useState(0);

  const onReset = () => {
    if (confirm("Reload the example budget? Your current changes will be replaced."))
      api.resetToExample();
  };
  const onClear = () => {
    if (confirm("Clear everything and start from a blank budget?")) api.clearAll();
  };

  return (
    <div
      style={{
        background: BG,
        color: "#e2e8f0",
        fontFamily: FONT,
        minHeight: "100vh",
        padding: "32px 24px",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Editable header */}
        <TextInput
          value={budget.title}
          onChange={api.setTitle}
          placeholder="Budget title"
          style={{ fontSize: 26, fontWeight: 700, color: "#f8fafc", width: "100%" }}
        />
        <TextInput
          value={budget.subtitle}
          onChange={api.setSubtitle}
          placeholder="Subtitle"
          style={{ fontSize: 13, color: MUTED, width: "100%", marginBottom: 16 }}
        />

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Btn ghost onClick={onReset}>
            Reset to example
          </Btn>
          <Btn ghost danger onClick={onClear}>
            Clear all
          </Btn>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 24,
            background: CARD_BG,
            borderRadius: 10,
            padding: 4,
            border: `1px solid ${BORDER}`,
          }}
        >
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              style={{
                flex: 1,
                padding: "10px 6px",
                fontSize: 12,
                fontWeight: 500,
                fontFamily: FONT,
                color: tab === i ? "#f8fafc" : MUTED,
                background: tab === i ? ACCENT : "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 0 && <BudgetTab budget={budget} api={api} />}
        {tab === 1 && <SavingsTab budget={budget} api={api} />}
        {tab === 2 && <HelpTab />}
      </div>
    </div>
  );
}
