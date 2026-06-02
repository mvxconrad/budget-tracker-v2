// Public marketing landing page: what visitors see first (before login).
// Navbar with Login / Sign up, a hero, feature highlights, and a copyright
// footer. The actual auth form lives in AuthScreen.jsx.
import { BG, BORDER_SOFT, BRAND_AMBER, BRAND_BLUE, BRAND_GREEN, FONT, PRIMARY, PRIMARY_SOFT, PRIMARY_TEXT, SURFACE, TEXT, TEXT_2, TEXT_3, POSITIVE } from "./theme.js";
import { useAuth } from "./auth.jsx";
import Logo from "./Logo.jsx";

const YEAR = 2026; // build-time constant; bump if you regenerate yearly

export default function Landing({ onLogin, onSignup }) {
  const { continueAsGuest } = useAuth();

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, display: "flex", flexDirection: "column" }}>
      {/* Navbar */}
      <nav
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 28px", borderBottom: `1px solid ${BORDER_SOFT}`,
          maxWidth: 1100, margin: "0 auto", width: "100%",
        }}
      >
        <Logo wordmark height={26} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="btn btn-ghost"
            onClick={onLogin}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: TEXT_2, background: "transparent", border: `1px solid ${BORDER_SOFT}` }}
          >
            Log in
          </button>
          <button
            className="btn btn-primary"
            onClick={onSignup}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: "#fff", background: PRIMARY, border: `1px solid ${PRIMARY}` }}
          >
            Sign up
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "72px 24px 40px", maxWidth: 720, margin: "0 auto" }}>
        <span
          style={{
            fontSize: 12, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase",
            color: PRIMARY_TEXT, background: PRIMARY_SOFT, padding: "5px 12px", borderRadius: 999, marginBottom: 22,
          }}
        >
          Free AI-powered personal finance
        </span>
        <h1 style={{ fontSize: 42, lineHeight: 1.1, fontWeight: 700, color: TEXT, letterSpacing: -1, margin: "0 0 18px" }}>
          Make your money work as hard as you do.{" "}
          <span style={{ color: PRIMARY }}>Meet your free AI financial advisor.</span>
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: TEXT_2, maxWidth: 540, margin: "0 0 32px" }}>
          <strong style={{ color: TEXT, fontWeight: 700 }}>AI that understands your money.</strong>{" "}
          Budget, forecast, and benchmark your spending in seconds. Free to start.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            className="btn btn-primary"
            onClick={onSignup}
            style={{ padding: "13px 26px", borderRadius: 10, fontSize: 15, fontWeight: 600, color: "#fff", background: PRIMARY, border: `1px solid ${PRIMARY}` }}
          >
            Get started for free
          </button>
          <button
            className="btn btn-ghost"
            onClick={continueAsGuest}
            style={{ padding: "13px 26px", borderRadius: 10, fontSize: 15, fontWeight: 600, color: TEXT_2, background: "transparent", border: `1px solid ${BORDER_SOFT}` }}
          >
            Try it as a guest
          </button>
        </div>

        {/* Feature row */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginTop: 56, width: "100%" }}>
          <Feature accent={BRAND_BLUE} title="AI advisor" body="Tell it what you earn and spend in plain English. It builds your budget and answers money questions on the spot, like texting a financial expert." />
          <Feature accent={BRAND_GREEN} title="Savings forecasts" body="Watch your surplus compound month over month, with every month editable and a clean growth chart that shows where you're headed." />
          <Feature accent={BRAND_AMBER} title="Local benchmarks" body="See how your rent and savings rate stack up against the real cost of living in your city, so you always know if you're ahead." />
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${BORDER_SOFT}`, padding: "20px 28px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 12.5, color: TEXT_3 }}>© {YEAR} Quarterbyte. All rights reserved.</span>
          <span style={{ fontSize: 12, color: TEXT_3, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: POSITIVE, display: "inline-block" }} />
            Your data stays private, used only to power your finances.
          </span>
        </div>
      </footer>
    </div>
  );
}

function Feature({ title, body, accent = PRIMARY }) {
  return (
    <div
      className="card"
      style={{
        flex: "1 1 200px", minWidth: 0, maxWidth: 300, textAlign: "left",
        background: SURFACE, border: `1px solid ${BORDER_SOFT}`, borderRadius: 12,
        padding: "18px 18px", borderTop: `3px solid ${accent}`,
      }}
    >
      <div style={{ fontSize: 14.5, fontWeight: 700, color: TEXT, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: TEXT_2 }}>{body}</div>
    </div>
  );
}
