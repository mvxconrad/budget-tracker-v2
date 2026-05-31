// Help — a concise, professional getting-started guide.
import { BORDER_SOFT, POSITIVE, PRIMARY, PRIMARY_SOFT, PRIMARY_TEXT, TEXT, TEXT_2, WARNING } from "../theme.js";
import { InfoBox, SectionLabel } from "../components.jsx";

export default function HelpTab() {
  return (
    <div>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.3, color: TEXT }}>Help &amp; guide</h1>
        <p style={{ fontSize: 13, color: TEXT_2, margin: "4px 0 0" }}>Set up your budget in a couple of minutes.</p>
      </div>

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Getting started</SectionLabel>
        <Step n="1" title="Set your income">
          On the Budget tab, click the income amount and enter your monthly take-home.
        </Step>
        <Step n="2" title="Edit your spending">
          Click any category name, line item, or amount to change it. Use “+ Add item” inside a card, or “+ Add category” at the bottom for anything that's missing.
        </Step>
        <Step n="3" title="Watch your net">
          The Net card is income minus expenses. Your savings rate updates live as you edit.
        </Step>
        <Step n="4" title="Project forward">
          The Savings tab compounds your surplus at your APY, with a chart and month-by-month schedule.
        </Step>
      </div>

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Good to know</SectionLabel>
        <InfoBox color={POSITIVE} title="Auto-saved.">
          Everything lives in this browser — no login required. Reset and Clear are in the top bar.
        </InfoBox>
        <InfoBox color={WARNING} title="One device for now.">
          Cross-device sync and connected accounts are on the way.
        </InfoBox>
      </div>

      <div>
        <SectionLabel>On the roadmap</SectionLabel>
        <InfoBox color={PRIMARY} title="Connect accounts.">Pull balances and transactions in automatically.</InfoBox>
        <InfoBox color={PRIMARY} title="Investments &amp; markets.">Track holdings against the S&amp;P 500 and model contributions.</InfoBox>
        <InfoBox color={PRIMARY} title="Hypotheticals.">Ask “what if rent went up $200?” and watch every projection adjust.</InfoBox>
      </div>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <div style={{ display: "flex", gap: 13, padding: "11px 0", borderBottom: `1px solid ${BORDER_SOFT}` }}>
      <div
        style={{
          width: 24,
          height: 24,
          flexShrink: 0,
          borderRadius: 7,
          background: PRIMARY_SOFT,
          color: PRIMARY_TEXT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {n}
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: TEXT, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 13, color: TEXT_2, lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );
}
