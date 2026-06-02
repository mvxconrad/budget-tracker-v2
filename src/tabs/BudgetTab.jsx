// Budget - an editable, spreadsheet-style breakdown of income and spending.
import {
  BG,
  BORDER,
  BORDER_SOFT,
  BRAND_AMBER,
  BRAND_BLUE,
  POSITIVE,
  NEGATIVE,
  PRIMARY,
  SURFACE,
  TEXT,
  TEXT_2,
  TEXT_3,
  WARNING,
  colorForIndex,
  fmt,
  fmtSigned,
  pct,
} from "../theme.js";
import { summarize } from "../useBudget.js";
import { resolveRegion, targetsFor, detectHousing } from "../benchmarks.js";
import LocationAutocomplete from "../LocationAutocomplete.jsx";
import { Btn, IconBtn, InfoBox, Legend, MoneyInput, Pill, SectionLabel, StackBar, Stat, TextInput, Th } from "../components.jsx";

const COLS = "1fr 132px 60px 28px";

export default function BudgetTab({ budget, api }) {
  const { categories, totalExpenses, income, leftover } = summarize(budget);
  const segments = categories
    .filter((c) => c.total > 0)
    .map((c, i) => ({ label: c.name, value: c.total, color: colorForIndex(i), share: totalExpenses ? (c.total / totalExpenses) * 100 : 0 }));
  const savingsRate = income > 0 ? (leftover / income) * 100 : 0;

  return (
    <div>
      {/* Budget identity (read-only; set when the budget is created) */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, letterSpacing: -0.3, margin: 0 }}>
          {budget.title || "My Budget"}
        </h1>
        {budget.subtitle && (
          <p style={{ fontSize: 13, color: TEXT_2, margin: "4px 0 0" }}>{budget.subtitle}</p>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <Stat label="Monthly income" value={income} tint={BRAND_BLUE} />
        <Stat label="Total expenses" value={totalExpenses} tint={BRAND_AMBER} />
        <Stat
          label="Net / month"
          value={fmtSigned(leftover)}
          accent={leftover >= 0 ? POSITIVE : NEGATIVE}
          tint={leftover >= 0 ? POSITIVE : NEGATIVE}
          sub={income > 0 ? `${pct(savingsRate)} savings rate` : "set income to see rate"}
        />
      </div>

      {/* Allocation */}
      {segments.length > 0 && (
        <div className="panel" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 18px", marginBottom: 22 }}>
          <SectionLabel dot={PRIMARY}>Allocation</SectionLabel>
          <StackBar segments={segments} total={totalExpenses} />
          <Legend items={segments.map((s) => ({ label: s.label, color: s.color, value: pct(s.share) }))} />
        </div>
      )}

      {/* Location benchmark */}
      <BenchmarkPanel
        income={income}
        savingsRate={savingsRate}
        categories={categories}
        location={budget.location || ""}
        onLocation={api.setLocation}
      />

      {/* Spreadsheet */}
      <div className="panel" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, alignItems: "center", padding: "11px 16px", borderBottom: `1px solid ${BORDER}`, background: BG }}>
          <Th>Category</Th>
          <Th right>Amount</Th>
          <Th right>Share</Th>
          <span />
        </div>

        {/* Income */}
        <div className="row-hover" style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, alignItems: "center", padding: "8px 16px", borderBottom: `1px solid ${BORDER_SOFT}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: POSITIVE, flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: TEXT }}>Income</span>
          </div>
          <div style={{ justifySelf: "end" }}>
            <MoneyInput value={budget.income} onChange={api.setIncome} />
          </div>
          <span />
          <span />
        </div>

        {categories.map((cat, ci) => (
          <CategoryBlock
            key={cat.id}
            cat={cat}
            color={colorForIndex(ci)}
            share={totalExpenses ? (cat.total / totalExpenses) * 100 : 0}
            api={api}
          />
        ))}

        {/* Totals */}
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, alignItems: "center", padding: "13px 16px", borderTop: `2px solid ${BORDER}`, background: BG }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: TEXT, textTransform: "uppercase", letterSpacing: 0.5 }}>Total expenses</span>
          <span className="tnum" style={{ justifySelf: "end", fontSize: 14, fontWeight: 700, color: TEXT }}>{fmt(totalExpenses)}</span>
          <span className="tnum" style={{ justifySelf: "end", fontSize: 12, color: TEXT_3 }}>100%</span>
          <span />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, alignItems: "center", padding: "13px 16px", borderTop: `1px solid ${BORDER_SOFT}`, background: BG }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_2 }}>Left to save</span>
          <span className="tnum" style={{ justifySelf: "end", fontSize: 14, fontWeight: 700, color: leftover >= 0 ? POSITIVE : NEGATIVE }}>{fmtSigned(leftover)}</span>
          <span />
          <span />
        </div>
      </div>

      <Btn onClick={api.addCategory}>+ Add category</Btn>

      {categories.length === 0 && (
        <div style={{ marginTop: 14 }}>
          <InfoBox title="Start your budget.">
            Set your income above and add a category, or let the AI advisor build it for you: tell
            it what you earn and spend in plain English.
          </InfoBox>
        </div>
      )}
    </div>
  );
}

function CategoryBlock({ cat, color, share, api }) {
  return (
    <div style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}>
      {/* Category header with a subtle data bar along the bottom edge */}
      <div className="row-hover" style={{ position: "relative", display: "grid", gridTemplateColumns: COLS, gap: 8, alignItems: "center", padding: "10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />
          <TextInput
            value={cat.name}
            onChange={(v) => api.renameCategory(cat.id, v)}
            placeholder="Category"
            style={{ fontSize: 13.5, fontWeight: 600, color: TEXT, flex: 1, minWidth: 0 }}
          />
        </div>
        <span className="tnum" style={{ justifySelf: "end", fontSize: 13.5, fontWeight: 600, color: TEXT }}>{fmt(cat.total)}</span>
        <span className="tnum" style={{ justifySelf: "end", fontSize: 12, color: TEXT_3 }}>{pct(share)}</span>
        <IconBtn title="Delete category" onClick={() => api.removeCategory(cat.id)}>✕</IconBtn>
        <div
          style={{
            position: "absolute",
            left: 16,
            bottom: 0,
            height: 2,
            width: `calc((100% - 32px) * ${Math.min(share, 100) / 100})`,
            background: color,
            opacity: 0.5,
          }}
        />
      </div>

      {/* Line items */}
      {cat.items.map((it) => (
        <div key={it.id} className="row-hover" style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, alignItems: "center", padding: "4px 16px 4px 34px" }}>
          <TextInput
            value={it.label}
            onChange={(v) => api.updateItem(cat.id, it.id, "label", v)}
            placeholder="Item"
            style={{ fontSize: 13, color: TEXT_2, width: "100%" }}
          />
          <div style={{ justifySelf: "end" }}>
            <MoneyInput value={it.amount} onChange={(v) => api.updateItem(cat.id, it.id, "amount", v)} />
          </div>
          <span />
          <IconBtn title="Delete item" onClick={() => api.removeItem(cat.id, it.id)}>✕</IconBtn>
        </div>
      ))}

      <div style={{ padding: "3px 16px 11px 34px" }}>
        <button
          className="link-btn"
          onClick={() => api.addItem(cat.id)}
          style={{ background: "none", border: "none", padding: 0, fontSize: 12, fontWeight: 500, color: PRIMARY }}
        >
          + Add item
        </button>
      </div>
    </div>
  );
}

// Maps a status to a bar color and verdict copy.
const STATUS = {
  good: { color: POSITIVE },
  ok: { color: WARNING },
  bad: { color: NEGATIVE },
  none: { color: TEXT_3 },
};

function BenchmarkPanel({ income, savingsRate, categories, location, onLocation }) {
  const region = resolveRegion(location);
  const t = targetsFor(region);
  const housing = detectHousing(categories);
  const housingPct = income > 0 ? (housing.total / income) * 100 : 0;

  const housingStatus = !housing.found
    ? "none"
    : housingPct <= t.healthyHousing
    ? "good"
    : housingPct <= t.areaHousing
    ? "ok"
    : "bad";
  const housingVerdict = {
    none: "No housing category",
    good: "On track",
    ok: "Typical for area",
    bad: "Above area norm",
  }[housingStatus];

  const savingsStatus = savingsRate >= t.healthySavings ? "good" : savingsRate >= 10 ? "ok" : "bad";
  const savingsVerdict = { good: "Strong", ok: "Could be higher", bad: "Low" }[savingsStatus];

  return (
    <div className="panel" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 18px", marginBottom: 22 }}>
      <SectionLabel right={<Pill color={region.matched ? PRIMARY : TEXT_3}>{`COL index ${region.col}`}</Pill>}>
        Location benchmark
      </SectionLabel>

      {/* Location input with city autocomplete */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "2px 10px", background: BG, marginBottom: 4 }}>
        <PinIcon />
        <LocationAutocomplete
          value={location}
          onChange={onLocation}
          placeholder="Search your city, e.g. Culver City"
        />
        <span style={{ fontSize: 12, color: TEXT_3, whiteSpace: "nowrap" }}>{region.matched ? region.name : "National avg"}</span>
      </div>

      {income <= 0 ? (
        <div style={{ fontSize: 12.5, color: TEXT_2, padding: "12px 0 2px" }}>Set your income above to see how your budget compares.</div>
      ) : (
        <>
          <BenchmarkRow
            label="Housing"
            valueText={housing.found ? `${pct(housingPct)} of income` : "not detected"}
            verdict={housingVerdict}
            status={housingStatus}
            barPct={housingPct}
            target={t.areaHousing}
            caption={
              housing.found
                ? `Healthy ≤ ${t.healthyHousing}% · ${region.name} typical ~${t.areaHousing}%  ·  detected: ${housing.names.join(", ")}`
                : "Name a category “Housing”, “Rent”, or “Mortgage” to benchmark it."
            }
          />
          <BenchmarkRow
            label="Savings rate"
            valueText={`${pct(savingsRate)} of income`}
            verdict={savingsVerdict}
            status={savingsStatus}
            barPct={savingsRate}
            target={t.healthySavings}
            caption={`Target ≥ ${t.healthySavings}% of income`}
          />
        </>
      )}

      <div style={{ fontSize: 11, color: TEXT_3, marginTop: 12, lineHeight: 1.5 }}>
        Estimates from the 30% housing rule and a 20% savings target, adjusted by a built-in cost-of-living index - not live local data.
      </div>
    </div>
  );
}

function BenchmarkRow({ label, valueText, verdict, status, barPct, target, caption }) {
  const color = STATUS[status].color;
  const fill = Math.max(0, Math.min(100, barPct));
  const mark = Math.max(0, Math.min(100, target));
  return (
    <div style={{ padding: "13px 0", borderTop: `1px solid ${BORDER_SOFT}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: TEXT }}>
          {label} <span className="tnum" style={{ color: TEXT_2, fontWeight: 400 }}>· {valueText}</span>
        </span>
        <Pill color={color}>{verdict}</Pill>
      </div>
      {/* Track with the user's fill and a target marker */}
      <div style={{ position: "relative", height: 8, borderRadius: 5, background: BORDER_SOFT }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill}%`, background: color, borderRadius: 5, transition: "width 0.18s ease" }} />
        <div style={{ position: "absolute", left: `${mark}%`, top: -3, bottom: -3, width: 2, background: TEXT_2, opacity: 0.55 }} title={`Target ${target}%`} />
      </div>
      <div style={{ fontSize: 11, color: TEXT_3, marginTop: 7 }}>{caption}</div>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEXT_3} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}
