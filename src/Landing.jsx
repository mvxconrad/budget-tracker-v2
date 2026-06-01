// Login / create-account landing screen. Matches the light theme. Offers a
// guest path so the budget tool works without an account (AI needs login).
import { useState } from "react";
import { BG, BORDER, FONT, PRIMARY, SURFACE, TEXT, TEXT_2, TEXT_3 } from "./theme.js";
import { useAuth } from "./auth.jsx";

export default function Landing() {
  const { login, register, continueAsGuest, backendUp } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
    } catch (ex) {
      setErr(ex.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        fontFamily: FONT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 22 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: `linear-gradient(135deg, ${PRIMARY}, #4a57d8)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 16,
            }}
          >
            L
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, color: TEXT, letterSpacing: -0.3 }}>Ledger</div>
        </div>

        <div
          className="panel"
          style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "26px 24px" }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p style={{ fontSize: 13, color: TEXT_2, margin: "0 0 20px" }}>
            {mode === "login"
              ? "Sign in to sync settings and use the AI assistant."
              : "Free — used to save your settings and AI key."}
          </p>

          {!backendUp && (
            <div style={{ fontSize: 12.5, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "9px 11px", marginBottom: 16 }}>
              Can't reach the server. You can still use the budget tool as a guest.
            </div>
          )}

          <form onSubmit={submit}>
            <Field label="Email">
              <input
                type="email" value={email} required autoFocus
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle} placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <input
                type="password" value={password} required minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle} placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
              />
            </Field>

            {err && <div style={{ fontSize: 12.5, color: "#b91c1c", marginBottom: 12 }}>{err}</div>}

            <button
              type="submit" disabled={busy || !backendUp}
              className="btn btn-primary"
              style={{
                width: "100%", padding: "11px", borderRadius: 9, fontSize: 14, fontWeight: 600,
                color: "#fff", background: PRIMARY, border: `1px solid ${PRIMARY}`,
                opacity: busy || !backendUp ? 0.6 : 1,
              }}
            >
              {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div style={{ fontSize: 13, color: TEXT_2, marginTop: 16, textAlign: "center" }}>
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button
              className="link-btn"
              onClick={() => { setErr(""); setMode(mode === "login" ? "register" : "login"); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: PRIMARY, fontWeight: 600, fontSize: 13 }}
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            className="link-btn"
            onClick={continueAsGuest}
            style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_3, fontSize: 13 }}
          >
            Continue as guest →
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  font: "inherit",
  fontSize: 14,
  color: "#111827",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 9,
  padding: "10px 12px",
  outline: "none",
};

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT_3, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}
