// A plain-language walkthrough for first-time users.
import { ACCENT, AMBER, GREEN, PURPLE } from "../theme.js";
import { InfoBox, Section } from "../components.jsx";

export default function HelpTab() {
  return (
    <div>
      <Section title="What this is" color={ACCENT}>
        <InfoBox color={ACCENT}>
          A simple monthly budget tracker. You set your income, list what you spend
          across categories, and it shows what's left over and how your savings grow.
          It starts with an example budget — change anything you like, or clear it and
          build your own.
        </InfoBox>
      </Section>

      <Section title="The Budget tab" color={ACCENT}>
        <InfoBox color={ACCENT} title="1. Set your income.">
          Click the dollar amount next to “Monthly take-home” and type your real number.
        </InfoBox>
        <InfoBox color={ACCENT} title="2. Edit categories &amp; items.">
          Each card is a category (Housing, Living, etc.). Click any name or amount to
          edit it. Use “+ Add item” inside a card for a new line, or the ✕ to remove
          one.
        </InfoBox>
        <InfoBox color={ACCENT} title="3. Add your own categories.">
          Hit “+ Add category” at the bottom for anything that's missing — pets, gym,
          daycare, whatever fits your life.
        </InfoBox>
        <InfoBox color={GREEN} title="Leftover.">
          The green “Leftover” card is income minus all expenses — your monthly savings.
          If it turns red, you're spending more than you make.
        </InfoBox>
      </Section>

      <Section title="The Savings tab" color={GREEN}>
        <InfoBox color={GREEN}>
          This projects your leftover forward month by month, with interest. Set your
          starting balance, your account's APY (e.g. a high-yield savings rate like
          3.10%), and how many months to look ahead. The table updates instantly.
        </InfoBox>
      </Section>

      <Section title="Saving &amp; resetting" color={AMBER}>
        <InfoBox color={AMBER} title="Auto-saved.">
          Everything you type is saved automatically in this browser — no account, no
          login. Close the tab and come back; it'll be here.
        </InfoBox>
        <InfoBox color={AMBER} title="Reset / Clear.">
          “Reset to example” reloads the sample budget. “Clear all” wipes everything for
          a blank start. Both are at the top of the page.
        </InfoBox>
        <InfoBox color={AMBER} title="One browser for now.">
          Because data lives in this browser, it won't follow you to another device yet.
          Syncing across devices is on the roadmap.
        </InfoBox>
      </Section>

      <Section title="Coming later" color={PURPLE}>
        <InfoBox color={PURPLE}>
          Tracking what you actually spent vs. planned, importing bank statements, and
          AI helpers like “what if my rent went up $200?” or auto-sorting transactions
          into categories. For now, this is the simple, solid core.
        </InfoBox>
      </Section>
    </div>
  );
}
