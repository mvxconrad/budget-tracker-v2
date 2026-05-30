/*
 * Your current working dashboard, saved as-is for reference.
 * This is the "v4" static report we're turning into a real app — see ../ROADMAP.md.
 * Nothing here is wired up to build yet; it's the source artifact for Milestone 1.
 */
import { useState } from "react";

const ACCENT = "#2E75B6";
const GREEN = "#22c55e";
const RED = "#ef4444";
const AMBER = "#f59e0b";
const MUTED = "#94a3b8";
const BORDER = "#1e293b";
const CARD_BG = "#0f172a";
const BG = "#060c18";
const PURPLE = "#a78bfa";

const fmt = (n) => {
  if (typeof n === "string") return n;
  const neg = n < 0;
  const abs = Math.abs(n);
  const s = abs >= 1000 ? "$" + abs.toLocaleString() : "$" + abs;
  return neg ? `-${s}` : s;
};

const Section = ({ title, children, color }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: color || ACCENT, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 }}>{title}</div>
    {children}
  </div>
);

const Row = ({ label, value, isSub, isTotal, isGrand, color, changed }) => {
  const c = color || (isTotal || isGrand ? "#e2e8f0" : "#cbd5e1");
  const weight = isTotal || isGrand ? 600 : 400;
  const size = isGrand ? 18 : isSub ? 13 : 14;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: `${isGrand ? 14 : 6}px 0`, paddingLeft: isSub ? 18 : 0,
      borderTop: isTotal ? `1px solid ${BORDER}` : isGrand ? `2px solid ${ACCENT}` : "none",
      marginTop: isTotal ? 6 : isGrand ? 10 : 0,
      background: changed ? "rgba(34,197,94,0.06)" : "transparent",
      borderRadius: changed ? 6 : 0, paddingRight: changed ? 8 : 0,
    }}>
      <span style={{ fontSize: size, color: MUTED, fontWeight: isTotal || isGrand ? 500 : 400, display: "flex", alignItems: "center", gap: 6 }}>
        {label}
        {changed && <span style={{ fontSize: 9, color: GREEN, background: "rgba(34,197,94,0.15)", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>UPDATED</span>}
      </span>
      <span style={{ fontSize: size, fontWeight: weight, color: c, fontVariantNumeric: "tabular-nums" }}>
        {typeof value === "number" ? fmt(value) : value}
      </span>
    </div>
  );
};

const MetricCard = ({ label, value, accent, sub }) => (
  <div style={{ background: CARD_BG, borderRadius: 10, padding: "16px 18px", border: `1px solid ${BORDER}`, flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 600, color: accent || "#e2e8f0", fontVariantNumeric: "tabular-nums" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{sub}</div>}
  </div>
);

const Bar = ({ segments, total }) => (
  <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", background: BORDER, margin: "16px 0 8px" }}>
    {segments.map((s, i) => <div key={i} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />)}
  </div>
);

const Legend = ({ items }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
    {items.map((it, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED }}>
        <div style={{ width: 10, height: 10, borderRadius: 3, background: it.color, flexShrink: 0 }} />
        {it.label}
      </div>
    ))}
  </div>
);

const InfoBox = ({ color, title, children }) => (
  <div style={{ marginBottom: 12, padding: "12px 14px", background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 8, fontSize: 12, color: "#cbd5e1", lineHeight: 1.7 }}>
    {title && <strong style={{ color }}>{title}</strong>} {children}
  </div>
);

const TimelineItem = ({ date, title, desc, color, done }) => (
  <div style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 12, paddingTop: 4 }}>
      <div style={{ width: 10, height: 10, borderRadius: 5, background: done ? GREEN : color || ACCENT, border: done ? "none" : `2px solid ${color || ACCENT}`, flexShrink: 0 }} />
      <div style={{ width: 1, flex: 1, background: BORDER, marginTop: 4 }} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: done ? GREEN : AMBER, fontWeight: 600, marginBottom: 2 }}>{date}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{desc}</div>
    </div>
  </div>
);

/* ── Month data ── */
const months = [
  { month: "Jun", income: 3950, signOn: 18563, momLoan: 12000, repayMom: 12000, rentVal: 5350, otherExp: 6650, isMoveIn: true, rentLabel: "Rent + deposit", juneItems: true,
    note: "Already in LA. Move in Jun 1. Start work Jun 15. Sign-on lands ~Jul 1, repay mom + $13K paydowns." },
  { month: "Jul", income: 7900, rent: 0, otherExp: 2875, isFree: true, rentLabel: "Rent (free)", rentVal: 0,
    note: "Free rent month 1. Stacking cash." },
  { month: "Aug", income: 7900, rent: 0, otherExp: 2875, isFree: true, rentLabel: "Rent (free)", rentVal: 0,
    note: "Free rent month 2. ~$20K+ liquid after this." },
  { month: "Sep", income: 7900, rent: 4600, otherExp: 2875, note: "$425/mo savings begins." },
  { month: "Oct", income: 7900, rent: 4600, otherExp: 2875, note: "Steady state." },
  { month: "Nov", income: 7900, rent: 4600, otherExp: 2875, note: "Month 6." },
];

const ALLY_MO = 0.00255;
function compute() {
  let cash = 0;
  return months.map((m) => {
    const totalExp = (m.rentVal ?? m.rent) + m.otherExp;
    const momNet = (m.momLoan || 0) - (m.repayMom || 0);
    const net = m.income - totalExp + (m.signOn || 0) + momNet;
    const interest = Math.round(cash * ALLY_MO);
    cash += net + interest;
    return { ...m, totalExp, net, interest, cumulative: cash };
  });
}
const proj = compute();

const endJune = proj[0]?.cumulative || 0;

const tabs = ["Budget", "Savings", "Emergency Fund", "June", "Action Plan"];

export default function BudgetV4() {
  const [tab, setTab] = useState(0);

  const segments = [
    { label: "Housing $4,895", value: 4895, color: "#E24B4A" },
    { label: "Transport $1,220", value: 1220, color: ACCENT },
    { label: "Living $1,160", value: 1160, color: "#1D9E75" },
    { label: "Emergency Fund $200", value: 200, color: "#7F77DD" },
    { label: "Savings $425", value: 425, color: "#4ade80" },
  ];

  // EF projection: $200/mo into separate Ally bucket @ 3.10%
  let ef = 0;
  const efProj = months.map((m, i) => {
    if (i === 0) { ef += 0; return { ...m, efAdd: 0, efInterest: 0, efTotal: 0 }; } // no EF contribution in June chaos
    const interest = Math.round(ef * ALLY_MO);
    ef += 200 + interest;
    return { ...m, efAdd: 200, efInterest: interest, efTotal: ef };
  });

  return (
    <div style={{ background: BG, color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", padding: "32px 24px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#f8fafc", margin: 0, marginBottom: 4 }}>LA Budget — 6 Month View</h1>
        <p style={{ fontSize: 13, color: MUTED, margin: 0, marginBottom: 6 }}>Amazon SDE I — $129K base — Culver City, CA</p>
        <p style={{ fontSize: 12, color: GREEN, margin: 0, marginBottom: 28, fontWeight: 500 }}>v4 — GEICO $430 bundle | Ally 3.10% | Amex Gold + Venture X</p>

        <div style={{ display: "flex", gap: 0, marginBottom: 28, background: CARD_BG, borderRadius: 10, padding: 4, border: `1px solid ${BORDER}`, overflowX: "auto" }}>
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{
              flex: 1, padding: "10px 6px", fontSize: 11, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
              color: tab === i ? "#f8fafc" : MUTED, background: tab === i ? ACCENT : "transparent",
              border: "none", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap",
            }}>{t}</button>
          ))}
        </div>

        {/* TAB 0: Monthly Budget */}
        {tab === 0 && (<div>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <MetricCard label="Net monthly" value="$7,900" />
            <MetricCard label="Savings" value="+$425" accent={GREEN} sub="into Ally HYSA" />
            <MetricCard label="Emergency fund" value="+$200" accent={PURPLE} sub="separate bucket" />
          </div>
          <Legend items={segments} />
          <Bar segments={segments} total={7900} />
          <div style={{ height: 20 }} />

          <Section title="Housing — $4,895/mo">
            <Row label="Rent (parking included)" value={4600} />
            <Row label="Utilities (electric/water/trash)" value={225} />
            <Row label="WiFi" value={70} />
            <Row label="Renter's insurance" value="$0 (GEICO bundle)" changed />
            <Row label="Housing total" value={4895} isTotal />
          </Section>
          <Section title="Transportation — $1,220/mo">
            <Row label="Car payment (fixed)" value={550} />
            <Row label="Insurance (GEICO auto+renters)" value={430} changed />
            <Row label="Gas" value={120} />
            <Row label="Car maintenance fund" value={120} />
            <Row label="Transport total" value={1220} isTotal />
          </Section>
          <Section title="Living — $1,160/mo">
            <Row label="Groceries" value={300} />
            <Row label="Entertainment" value={700} />
            <Row label="Subscriptions" value={100} />
            <Row label="Mobile" value={60} />
            <Row label="Living total" value={1160} isTotal />
          </Section>
          <Section title="Emergency Fund — $200/mo" color={PURPLE}>
            <Row label="Separate Ally savings bucket" value={200} />
          </Section>
          <Section title="Sophia's Contributions">
            <Row label="Groceries (+$200)" value="+$200" color={GREEN} />
            <Row label="Entertainment (+$200)" value="+$200" color={GREEN} />
          </Section>
          <Row label="Your total monthly expenses" value={7475} isGrand />
          <Row label="Monthly savings" value="+$425" color={GREEN} />
          <InfoBox color={GREEN} title="Insurance update:">GEICO bundle $430/mo replaces USAA ($672 auto + $27 renters = $699). Saves $269/mo / $3,228/yr. Coverage: 100/300/100 liability, comp+collision $1,500 ded, UMBI 100/300, renters 100K/15K.</InfoBox>
        </div>)}

        {/* TAB 1: 6-Month Savings Projection */}
        {tab === 1 && (<div>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <MetricCard label="End of Aug" value={fmt(proj[2]?.cumulative)} accent={GREEN} sub="Free rent over" />
            <MetricCard label="End of Nov (mo 6)" value={fmt(proj[5]?.cumulative)} accent={GREEN} sub="Steady state" />
          </div>
          {proj.map((row, i) => (
            <div key={i} style={{ background: CARD_BG, borderRadius: 10, padding: "16px 18px", border: `1px solid ${BORDER}`, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#f8fafc" }}>{row.month} 2026</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: row.isFree ? GREEN : row.isMoveIn ? AMBER : MUTED,
                  background: row.isFree ? "rgba(34,197,94,0.1)" : row.isMoveIn ? "rgba(245,158,11,0.1)" : "transparent",
                  padding: "2px 8px", borderRadius: 4 }}>
                  {row.isFree ? "FREE RENT" : row.isMoveIn ? "MOVE-IN" : "NORMAL"}
                </span>
              </div>
              <Row label="Take-home" value={row.income} />
              {row.momLoan && <Row label="Mom bridge" value={`+${fmt(row.momLoan)}`} color={ACCENT} />}
              {row.signOn && <Row label="Sign-on (after paydowns)" value={row.signOn} color={GREEN} />}
              {row.repayMom && <Row label="Repay mom" value={`-${fmt(row.repayMom)}`} color={RED} />}
              <Row label={row.rentLabel || "Rent"} value={row.rentVal ?? row.rent} color={row.isFree ? GREEN : undefined} />
              {row.juneItems ? (<>
                <Row label="Hotel (May 28 – Jun 1)" value={1600} isSub />
                <Row label="Flights FL → LA (done)" value={400} isSub />
                <Row label="Sophia's birthday" value={300} isSub />
                <Row label="Groceries / gas / misc" value={4350} isSub />
              </>) : <Row label="Expenses + EF" value={row.otherExp} />}
              {row.interest > 0 && <Row label="Ally interest" value={`+${fmt(row.interest)}`} color={GREEN} />}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: ACCENT }}>Total savings</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: GREEN, fontVariantNumeric: "tabular-nums" }}>{fmt(row.cumulative)}</span>
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 6, fontStyle: "italic" }}>{row.note}</div>
            </div>
          ))}
        </div>)}

        {/* TAB 2: Emergency Fund Projection */}
        {tab === 2 && (<div>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <MetricCard label="Monthly contribution" value="$200" accent={PURPLE} sub="Separate Ally bucket" />
            <MetricCard label="EF after 6 months" value={fmt(efProj[5]?.efTotal)} accent={PURPLE} sub="+ Ally interest" />
          </div>
          <InfoBox color={PURPLE} title="Setup:">Create a savings bucket in Ally called "Emergency Fund." Set up $200 auto-transfer on payday. Same 3.10% APY as your main savings. Don't touch it.</InfoBox>

          {efProj.map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px",
              background: i % 2 === 0 ? CARD_BG : "transparent", borderRadius: 8, border: i % 2 === 0 ? `1px solid ${BORDER}` : "none" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}>{row.month} 2026</div>
                <div style={{ fontSize: 11, color: MUTED }}>{i === 0 ? "Move-in month — no EF contribution" : `+$200 deposit${row.efInterest > 0 ? ` + $${row.efInterest} interest` : ""}`}</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: PURPLE, fontVariantNumeric: "tabular-nums" }}>{fmt(row.efTotal)}</div>
            </div>
          ))}

          <div style={{ marginTop: 16 }}>
            <Row label="6-month EF balance" value={fmt(efProj[5]?.efTotal)} isGrand color={PURPLE} />
            <div style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
              Your real emergency coverage is bigger than this — by November you'll have ~${(proj[5]?.cumulative || 0).toLocaleString()} total liquid across all accounts. The $200/mo bucket is the untouchable floor.
            </div>
          </div>
        </div>)}

        {/* TAB 3: June Breakdown */}
        {tab === 3 && (<div>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <MetricCard label="Mom bridge" value="$12,000" accent={AMBER} sub="Repaid from sign-on" />
            <MetricCard label="End of June" value={fmt(endJune)} accent={GREEN} sub="After everything" />
          </div>

          <Section title="Pre-paycheck (mom's $12K covers this)">
            <Row label="Rent June 1 (first month)" value={4600} />
            <Row label="Security deposit" value={750} />
            <Row label="Hotel (May 28 – Jun 1)" value={1600} />
            <Row label="Flights FL → LA (already done)" value={400} />
            <Row label="Sophia's birthday" value={300} />
            <Row label="Groceries / gas / misc (pre-paycheck)" value={4350} />
            <Row label="Total (= mom loan)" value={12000} isTotal />
          </Section>
          <Section title="First paycheck + sign-on (~Jul 1)">
            <Row label="Half paycheck (Jun 15-30)" value={3950} />
            <Row label="Sign-on net (~37% tax)" value={31563} color={GREEN} />
            <Row label="Repay mom" value="-$12,000" color={RED} />
            <Row label="Car paydown ($27K → $17K)" value="-$10,000" color={RED} />
            <Row label="Credit card (zeroed)" value="-$3,000" color={RED} />
            <Row label="End of June cash" value={fmt(endJune)} isTotal color={GREEN} />
          </Section>
          <Section title="Furniture budget">
            <Row label="End of June cash" value={endJune} />
            <Row label="Furniture / setup spend" value="-$5,000" color={AMBER} />
            <Row label="Cushion after furniture" value={fmt(endJune - 5000)} isTotal color={GREEN} />
            <Row label="Jul paycheck (rent free)" value="+$5,025 net" color={GREEN} />
            <Row label="End of July after furniture" value={fmt(endJune - 5000 + 5025)} isTotal color={GREEN} />
            <InfoBox color={AMBER} title="Bottom line:">$5K on furniture is safe. By end of July you're back to ~${(endJune - 5000 + 5025).toLocaleString()} even after the spend. Put it all on the Amex Gold to hit your $8K welcome bonus.</InfoBox>
          </Section>
          <Section title="Relocation (separate)">
            <Row label="Amazon relocation benefit" value="$7,800" color={ACCENT} />
            <Row label="Graebel (car + stuff FL → CA)" value="-~$7,000" color={RED} />
            <Row label="Remaining" value="~$800" isTotal />
          </Section>
        </div>)}

        {/* TAB 4: Action Plan */}
        {tab === 4 && (<div>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <MetricCard label="Days to start" value="17" accent={AMBER} sub="Jun 15, 2026" />
            <MetricCard label="Total setup items" value="10" accent={ACCENT} />
          </div>

          <Section title="Timeline — What to do and when" color={AMBER}>
            <TimelineItem date="DONE" title="Flew to LA" done={true} color={GREEN}
              desc="Already here. In hotel until June 1 move-in. Mom's $12K bridge covering hotel, living expenses, rent + deposit." />
            <TimelineItem date="NOW (May 29-31)" title="Apply for Amex Gold" done={false} color={RED}
              desc="Get the card before move-in so you have it for furniture + setup spending. Welcome bonus: up to 100K points after $8K spend in 6 months. Furniture ($5K) + normal food spending hits that easy. 4x on groceries + dining. $325/yr fee but $424 in credits (Uber $10/mo, dining $10/mo, Resy $100/yr, Dunkin $7/mo) = net free." />
            <TimelineItem date="NOW (May 29-31)" title="Open Ally checking + savings" done={false} color={RED}
              desc="Takes 5 minutes online. Create two savings buckets: 'Emergency Fund' and 'General Savings.' 3.10% APY on savings, 0.10% checking. No fees, no minimums. Any ATM with $10/mo rebate. Have it ready before first paycheck." />
            <TimelineItem date="June 1" title="Move into apartment" done={false} color={AMBER}
              desc="Rent $4,600 + deposit $750 = $5,350 due. Covered by mom's bridge loan. Start settling in." />
            <TimelineItem date="June 1-7" title="Bind GEICO insurance policy" done={false} color={AMBER}
              desc="$430/mo bundle: auto (100/300/100 liability, comp+collision $1,500 ded, UMBI 100/300, no UMPD) + renters (100K liability, 15K personal property). Set policy start date June 1. Still need to price earthquake + tech/spill-drop protection separately." />
            <TimelineItem date="June 1-14" title="Furniture shopping — put on Amex Gold" done={false} color={AMBER}
              desc="~$5K budget. Desk, chair, bed frame, couch, essentials. All on Amex Gold to stack toward $8K welcome bonus. You'll have ~$3K of the $8K requirement from furniture alone." />
            <TimelineItem date="June 15" title="Day 1 — Amazon Prime Video, Culver City" done={false} color={GREEN}
              desc="Wenbin Lin, PV Catalog Rights & Offers. Set up direct deposit to Ally on Workday portal. Set up auto-transfer: $200/payday → EF bucket. Half paycheck for Jun 15-30." />
            <TimelineItem date="~July 1" title="Sign-on + first paycheck land" done={false} color={GREEN}
              desc="~$35,513 incoming. Immediately: repay mom $12K, car paydown $10K, zero CC $3K. Remaining ~$10,513 = starting savings." />
            <TimelineItem date="August" title="Apply for Capital One Venture X" done={false} color={ACCENT}
              desc="Wait for 1-2 Amazon paystubs. $395/yr but $300 travel credit + 10K anniversary miles = ~$95 real cost. 75K mile bonus after $4K/3mo. Use for all non-food spending (2x everything). Free Global Entry + TSA Pre. Priority Pass lounges for flights home." />
            <TimelineItem date="Ongoing" title="Monthly auto-pilot" done={false} color={GREEN}
              desc="$200/mo → EF bucket (auto). $425/mo savings to Ally HYSA. Groceries + dining → Amex Gold (4x). Everything else → Venture X (2x). Don't transfer points until you're ready to book." />
          </Section>

          <Section title="Insurance — GEICO bundle" color={GREEN}>
            <Row label="Monthly premium" value="$430" />
            <Row label="Auto liability" value="100/300/100" />
            <Row label="Comp + collision deductible" value="$1,500" />
            <Row label="UMBI" value="100/300" />
            <Row label="UMPD" value="none" />
            <Row label="Renters liability" value="$100K" />
            <Row label="Renters personal property" value="$15K" />
            <InfoBox color={AMBER} title="Still open:">Earthquake coverage (not included, price via CEA). Tech/spill-drop protection for electronics (GEICO doesn't offer, look into Worth Ave Group or Asurion standalone). USAA had both but at $699/mo it wasn't worth the $269/mo premium.</InfoBox>
          </Section>

          <Section title="Banking — Ally" color={ACCENT}>
            <Row label="Savings APY" value="3.10%" />
            <Row label="Checking APY" value="0.10%" />
            <Row label="Monthly fee" value="$0" />
            <Row label="Min balance" value="$0" />
            <Row label="ATM" value="Any ATM, $10/mo rebate" />
            <InfoBox color={ACCENT} title="Buckets to create:">1) "Emergency Fund" — $200/mo auto-deposit, don't touch. 2) "General Savings" — $425/mo surplus lands here. Both earn 3.10% APY. Buckets are just labels within one account, same interest rate on everything.</InfoBox>
          </Section>

          <Section title="Credit Cards" color={PURPLE}>
            <InfoBox color={PURPLE} title="Amex Gold ($325/yr):">4x dining + groceries. $424/yr in credits = net free. Welcome bonus up to 100K MR points after $8K/6mo. Points transfer 1:1 to airlines (Aeroplan for United flights home). Don't close the card or you lose points — transfer to airline miles first if ever canceling.</InfoBox>
            <InfoBox color={PURPLE} title="Venture X ($395/yr):">2x on everything (catch-all card). $300 travel credit + 10K anniversary miles = ~$95 real cost. 75K mile bonus after $4K/3mo. Free Global Entry + TSA Pre. Priority Pass lounges. Capital One miles never expire even if you close the card.</InfoBox>
            <InfoBox color={GREEN} title="The play:">Amex Gold for food ($1,000/mo at 4x = 4,000 pts/mo). Venture X for everything else. Combined welcome bonuses worth ~$3,500 in travel. Hit Amex $8K spend with furniture + first 6 months of food spending. Hit Venture X $4K with 3 months of non-food spending. Stack points → free flights home to FL.</InfoBox>
          </Section>

          <Section title="Key reminders">
            <InfoBox color={RED} title="Don't forget:">Car insurance old estimate was $210 — actual quotes came in way higher. Budget is built on real GEICO quote ($430), not estimates. Surplus is $425 not $615.</InfoBox>
            <InfoBox color={AMBER} title="Sophia at SMC:">Her $400/mo (groceries + entertainment) expands household budget but isn't counted in your numbers. If she contributes to rent eventually, surplus jumps significantly.</InfoBox>
            <InfoBox color={GREEN} title="Year 2 changes everything:">Sign-on #2 ($33K gross, ~$803/paycheck boost) + 15% RSU vest. Monthly surplus roughly quadruples. The tight months are only the first year.</InfoBox>
          </Section>
        </div>)}

        <div style={{ marginTop: 28, padding: 16, background: CARD_BG, borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 11, color: MUTED, lineHeight: 1.7 }}>
          <strong style={{ color: "#cbd5e1" }}>Assumptions:</strong> Take-home ~$7,900/mo on $129K. Jun half-month ~$3,950. Mom $12K bridge, repaid sign-on. Sign-on/RSU ~37% tax. Car $550/mo, $10K paydown, pays off May 2029. GEICO $430/mo. Ally 3.10% APY. No 401(k) or investment returns modeled. Sophia's $400/mo not deducted.
        </div>
      </div>
    </div>
  );
}
