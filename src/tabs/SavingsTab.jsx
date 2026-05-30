// Projects savings forward: starting balance + monthly leftover, compounded
// at the given APY, over N months. All inputs are editable.
import { BORDER, CARD_BG, GREEN, MUTED, RED, fmt } from "../theme.js";
import { summarize } from "../useBudget.js";
import { InfoBox, MetricCard, MoneyInput, Section } from "../components.jsx";

function project(startingBalance, monthly, apyPercent, months) {
  const monthlyRate = apyPercent / 100 / 12;
  const rows = [];
  let balance = startingBalance;
  for (let i = 1; i <= months; i++) {
    const interest = balance * monthlyRate;
    balance = balance + interest + monthly;
    rows.push({ month: i, interest, balance });
  }
  return rows;
}

export default function SavingsTab({ budget, api }) {
  const { leftover } = summarize(budget);
  const { startingBalance, apyPercent, months } = budget.savings;
  const monthly = Math.max(0, leftover);
  const rows = project(startingBalance, monthly, apyPercent, Math.max(1, months));
  const final = rows[rows.length - 1]?.balance ?? startingBalance;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <MetricCard
          label="Saving / month"
          value={monthly}
          accent={leftover >= 0 ? GREEN : RED}
          sub={leftover >= 0 ? "your leftover" : "budget is negative"}
        />
        <MetricCard
          label={`After ${Math.max(1, months)} months`}
          value={final}
          accent={GREEN}
          sub="incl. interest"
        />
      </div>

      {leftover < 0 && (
        <InfoBox color={RED} title="Heads up:">
          Your expenses are above your income, so there's nothing left to save. Trim a
          category on the Budget tab and this projection updates automatically.
        </InfoBox>
      )}

      <Section title="Assumptions">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SavingRow label="Starting balance">
            <MoneyInput
              value={startingBalance}
              onChange={(v) => api.setSavingsField("startingBalance", v)}
            />
          </SavingRow>
          <SavingRow label="Savings APY (%)">
            <input
              type="number"
              step="0.01"
              value={apyPercent}
              onChange={(e) => api.setSavingsField("apyPercent", Number(e.target.value))}
              style={numInput}
            />
          </SavingRow>
          <SavingRow label="Months to project">
            <input
              type="number"
              value={months}
              onChange={(e) =>
                api.setSavingsField("months", Math.max(1, Math.round(Number(e.target.value) || 1)))
              }
              style={numInput}
            />
          </SavingRow>
        </div>
      </Section>

      <Section title="Projection">
        {rows.map((r, i) => (
          <div
            key={r.month}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              background: i % 2 === 0 ? CARD_BG : "transparent",
              border: i % 2 === 0 ? `1px solid ${BORDER}` : "1px solid transparent",
              borderRadius: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}>
                Month {r.month}
              </div>
              <div style={{ fontSize: 11, color: MUTED }}>
                +{fmt(monthly)} saved
                {r.interest >= 1 ? ` + ${fmt(r.interest)} interest` : ""}
              </div>
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: GREEN,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmt(r.balance)}
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}

const numInput = {
  background: "transparent",
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  color: "#e2e8f0",
  fontFamily: "inherit",
  fontSize: 14,
  padding: "4px 8px",
  width: 100,
  textAlign: "right",
  outline: "none",
};

function SavingRow({ label, children }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px",
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
      }}
    >
      <span style={{ fontSize: 14, color: MUTED }}>{label}</span>
      {children}
    </div>
  );
}
