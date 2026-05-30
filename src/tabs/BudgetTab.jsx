// The main tab: edit income, categories, and line items. Everything is live.
import { ACCENT, BORDER, CARD_BG, GREEN, MUTED, RED, colorForIndex, fmt } from "../theme.js";
import { summarize } from "../useBudget.js";
import {
  Bar,
  Btn,
  IconBtn,
  InfoBox,
  Legend,
  MetricCard,
  MoneyInput,
  Section,
  TextInput,
} from "../components.jsx";

export default function BudgetTab({ budget, api }) {
  const { categories, totalExpenses, income, leftover } = summarize(budget);

  const segments = categories
    .filter((c) => c.total > 0)
    .map((c, i) => ({ label: c.name, value: c.total, color: colorForIndex(i) }));

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <MetricCard label="Monthly income" value={income} />
        <MetricCard label="Total expenses" value={totalExpenses} accent="#e2e8f0" />
        <MetricCard
          label="Leftover"
          value={(leftover >= 0 ? "+" : "") + fmt(leftover)}
          accent={leftover >= 0 ? GREEN : RED}
          sub={leftover >= 0 ? "available to save" : "over budget"}
        />
      </div>

      {segments.length > 0 && (
        <>
          <Legend items={segments} />
          <Bar segments={segments} total={totalExpenses} />
          <div style={{ height: 16 }} />
        </>
      )}

      <Section title="Income">
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
          <span style={{ fontSize: 14, color: MUTED }}>Monthly take-home</span>
          <MoneyInput value={budget.income} onChange={api.setIncome} />
        </div>
      </Section>

      {categories.map((cat) => (
        <CategoryCard key={cat.id} cat={cat} api={api} />
      ))}

      <Btn ghost onClick={api.addCategory} style={{ marginTop: 4 }}>
        + Add category
      </Btn>

      {categories.length === 0 && (
        <InfoBox color={ACCENT} title="Empty budget.">
          Add a category to get started, or hit “Reset to example” up top to load a
          sample budget you can edit.
        </InfoBox>
      )}
    </div>
  );
}

function CategoryCard({ cat, api }) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <TextInput
          value={cat.name}
          onChange={(v) => api.renameCategory(cat.id, v)}
          placeholder="Category name"
          style={{ fontSize: 15, fontWeight: 600, color: "#f8fafc", flex: 1 }}
        />
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#e2e8f0",
            fontVariantNumeric: "tabular-nums",
            marginRight: 8,
          }}
        >
          {fmt(cat.total)}
        </span>
        <IconBtn title="Delete category" onClick={() => api.removeCategory(cat.id)}>
          ✕
        </IconBtn>
      </div>

      {cat.items.map((it) => (
        <div
          key={it.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "2px 0",
          }}
        >
          <TextInput
            value={it.label}
            onChange={(v) => api.updateItem(cat.id, it.id, "label", v)}
            placeholder="Item"
            style={{ flex: 1, fontSize: 14, color: "#cbd5e1" }}
          />
          <MoneyInput
            value={it.amount}
            onChange={(v) => api.updateItem(cat.id, it.id, "amount", v)}
          />
          <IconBtn title="Delete item" onClick={() => api.removeItem(cat.id, it.id)}>
            ✕
          </IconBtn>
        </div>
      ))}

      <button
        onClick={() => api.addItem(cat.id)}
        style={{
          marginTop: 8,
          fontFamily: "inherit",
          fontSize: 12,
          color: ACCENT,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "2px 0",
        }}
      >
        + Add item
      </button>
    </div>
  );
}
