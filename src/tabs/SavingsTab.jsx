// Savings — projects the surplus forward with compounding interest.
// Each month auto-fills from the budget leftover, but any month can be edited
// (pinned) so month 1 can save a different amount than month 5.
import { BG, BORDER, BORDER_SOFT, NEGATIVE, POSITIVE, PRIMARY, SURFACE, TEXT, TEXT_2, TEXT_3, fmt } from "../theme.js";
import { summarize } from "../useBudget.js";
import { AreaChart, InfoBox, MoneyInput, NumField, SectionLabel, Stat, Th } from "../components.jsx";

const COLS = "48px 1fr 1fr 1fr";

const MAX_MONTHS = 600; // 50 years — guards against a runaway month count

function project(start, contribs, apyPercent) {
  const r = (Number(apyPercent) || 0) / 100 / 12;
  const rows = [];
  let balance = start;
  let contributed = 0;
  let interestTotal = 0;
  contribs.forEach((c, i) => {
    const interest = balance * r;
    balance = balance + interest + c;
    contributed += c;
    interestTotal += interest;
    rows.push({ month: i + 1, saved: c, interest, balance });
  });
  return { rows, contributed, interestTotal };
}

export default function SavingsTab({ budget, api }) {
  const { leftover } = summarize(budget);
  const { startingBalance, apyPercent, months } = budget.savings;
  const overrides = budget.savings.overrides || {};
  const m = Math.min(MAX_MONTHS, Math.max(1, months));
  const baseline = Math.max(0, leftover);
  const isPinned = (i) => Object.prototype.hasOwnProperty.call(overrides, i);
  const contribs = Array.from({ length: m }, (_, i) => (isPinned(i) ? Math.max(0, Number(overrides[i]) || 0) : baseline));
  const { rows, contributed, interestTotal } = project(startingBalance, contribs, apyPercent);
  const final = rows[rows.length - 1]?.balance ?? startingBalance;
  const series = [startingBalance, ...rows.map((r) => r.balance)];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.3, color: TEXT }}>Savings projection</h1>
        <p style={{ fontSize: 13, color: TEXT_2, margin: "4px 0 0" }}>Compounded at your savings rate. Edit any month below to vary it over time.</p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <Stat label="Total saved" value={contributed} accent={contributed > 0 ? POSITIVE : TEXT} sub={`auto-fills ${fmt(baseline)}/mo from budget`} />
        <Stat label={`Balance · ${m} mo`} value={final} />
        <Stat label="Interest earned" value={interestTotal} accent={POSITIVE} sub={`on ${fmt(contributed)} saved`} />
      </div>

      {leftover < 0 && (
        <InfoBox color={NEGATIVE} title="No surplus from your budget.">
          Months you haven't edited will fill in $0. Trim the budget, or pin specific months below.
        </InfoBox>
      )}

      {/* Assumptions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <InputCard label="Starting balance">
          <MoneyInput value={startingBalance} onChange={(v) => api.setSavingsField("startingBalance", v)} />
        </InputCard>
        <InputCard label="APY">
          <NumField value={apyPercent} step="0.01" suffix="%" onChange={(v) => api.setSavingsField("apyPercent", Number(v))} />
        </InputCard>
        <InputCard label="Months">
          <NumField value={months} onChange={(v) => api.setSavingsField("months", Math.min(MAX_MONTHS, Math.max(1, Math.round(Number(v) || 1))))} />
        </InputCard>
      </div>

      {/* Chart */}
      <div className="panel" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 18px 10px", marginBottom: 20 }}>
        <SectionLabel right={<span className="tnum" style={{ fontSize: 12, color: TEXT_3 }}>{fmt(startingBalance)} → {fmt(final)}</span>}>
          Projected balance
        </SectionLabel>
        <AreaChart values={series} />
      </div>

      {/* Schedule */}
      <div className="panel" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "11px 16px", borderBottom: `1px solid ${BORDER}`, background: BG }}>
          <Th>Mo</Th>
          <Th right>Saved</Th>
          <Th right>Interest</Th>
          <Th right>Balance</Th>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.month}
            className="row-hover"
            style={{
              display: "grid",
              gridTemplateColumns: COLS,
              gap: 8,
              alignItems: "center",
              padding: "7px 16px",
              borderBottom: i < rows.length - 1 ? `1px solid ${BORDER_SOFT}` : "none",
              background: i % 2 ? "transparent" : "#fafbfc",
            }}
          >
            <span style={{ fontSize: 13, color: TEXT_2 }}>{r.month}</span>

            {/* Editable saved amount */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
              {isPinned(i) && <span title="Edited — won't auto-update" style={{ width: 6, height: 6, borderRadius: 3, background: PRIMARY, flexShrink: 0 }} />}
              <MoneyInput value={contribs[i]} width={96} onChange={(v) => api.setSavingsOverride(i, v)} />
              {isPinned(i) && (
                <button className="link-btn" title="Reset to auto" onClick={() => api.clearSavingsOverride(i)} style={miniBtn}>
                  ↺
                </button>
              )}
            </div>

            <span className="tnum" style={{ justifySelf: "end", fontSize: 13, color: POSITIVE }}>{r.interest >= 1 ? fmt(r.interest) : "—"}</span>
            <span className="tnum" style={{ justifySelf: "end", fontSize: 13, fontWeight: 600, color: TEXT }}>{fmt(r.balance)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const miniBtn = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: TEXT_3,
  fontSize: 13,
  lineHeight: 1,
  padding: 0,
};

function InputCard({ label, children }) {
  return (
    <div className="card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 9, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7, minWidth: 152 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: TEXT_3 }}>{label}</span>
      {children}
    </div>
  );
}
