// Login / create-account / verify-email flow. Reached from the public landing
// page. Three steps:
//   "login"    - email + password sign in
//   "register" - create account -> sends a 6-digit code -> step becomes "verify"
//   "verify"   - enter the emailed code to finish and sign in
// An unverified login attempt (403 email_not_verified) also routes to "verify".
// Offers a guest path so the budget tool works without an account.
import { useState } from "react";
import { BG, BORDER, FONT, PRIMARY, SURFACE, TEXT, TEXT_2, TEXT_3 } from "./theme.js";
import { useAuth } from "./auth.jsx";

export default function AuthScreen({ initialMode = "login", onBack }) {
  const { login, register, verifyEmail, resendCode, continueAsGuest, backendUp } = useAuth();
  const [step, setStep] = useState(initialMode); // "login" | "register" | "verify"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setNotice("");
    setBusy(true);
    try {
      if (step === "login") {
        await login(email, password);
      } else if (step === "register") {
        await register(email, password);
        setNotice("We sent a 6-digit code to your email.");
        setStep("verify");
      } else if (step === "verify") {
        await verifyEmail(email, code);
      }
    } catch (ex) {
      const msg = ex.message || "Something went wrong.";
      if (msg === "email_not_verified") {
        try {
          await resendCode(email);
        } catch {
          /* ignore */
        }
        setNotice("Please verify your email. We sent you a new code.");
        setStep("verify");
      } else {
        setErr(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setErr("");
    setNotice("");
    try {
      await resendCode(email);
      setNotice("A new code is on its way.");
    } catch (ex) {
      setErr(ex.message || "Could not resend.");
    }
  };

  const titles = {
    login: "Welcome back",
    register: "Create your account",
    verify: "Verify your email",
  };
  const subtitles = {
    login: "Sign in to sync settings and use the AI assistant.",
    register: "Free. We'll email you a code to confirm it's you.",
    verify: `Enter the 6-digit code we sent to ${email || "your email"}.`,
  };

  return (
    <div
      style={{
        minHeight: "100vh", background: BG, fontFamily: FONT,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        {onBack && (
          <button
            className="link-btn"
            onClick={() => (step === "verify" ? setStep("login") : onBack())}
            style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_3, fontSize: 13, marginBottom: 16 }}
          >
            {"<- Back"}
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 22 }}>
          <Logo />
          <div style={{ fontSize: 19, fontWeight: 700, color: TEXT, letterSpacing: -0.3 }}>Ledger</div>
        </div>

        <div className="panel" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "26px 24px" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>{titles[step]}</h1>
          <p style={{ fontSize: 13, color: TEXT_2, margin: "0 0 20px" }}>{subtitles[step]}</p>

          {!backendUp && (
            <Banner color="#92400e" bg="#fffbeb" border="#fde68a">
              Can't reach the server. You can still use the budget tool as a guest.
            </Banner>
          )}
          {notice && <Banner color="#065f46" bg="#ecfdf5" border="#a7f3d0">{notice}</Banner>}

          <form onSubmit={submit}>
            {step !== "verify" && (
              <>
                <Field label="Email">
                  <input type="email" value={email} required autoFocus
                    onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="you@example.com" />
                </Field>
                <Field label="Password">
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPw ? "text" : "password"} value={password} required minLength={8}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ ...inputStyle, paddingRight: 52 }}
                      placeholder={step === "register" ? "At least 8 characters" : "Your password"}
                    />
                    <button type="button" className="link-btn" onClick={() => setShowPw((s) => !s)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: TEXT_3, fontSize: 12, fontWeight: 600 }}>
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </Field>
              </>
            )}

            {step === "verify" && (
              <Field label="Verification code">
                <input
                  type="text" inputMode="numeric" autoComplete="one-time-code" value={code} required autoFocus
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  style={{ ...inputStyle, letterSpacing: 8, fontSize: 20, textAlign: "center", fontWeight: 600 }}
                  placeholder="000000"
                />
              </Field>
            )}

            {err && <div style={{ fontSize: 12.5, color: "#b91c1c", marginBottom: 12 }}>{err}</div>}

            <button type="submit" disabled={busy || !backendUp} className="btn btn-primary"
              style={{ width: "100%", padding: "11px", borderRadius: 9, fontSize: 14, fontWeight: 600, color: "#fff", background: PRIMARY, border: `1px solid ${PRIMARY}`, opacity: busy || !backendUp ? 0.6 : 1 }}>
              {busy ? "..." : step === "login" ? "Sign in" : step === "register" ? "Create account" : "Verify & continue"}
            </button>
          </form>

          {step === "verify" ? (
            <div style={{ fontSize: 13, color: TEXT_2, marginTop: 16, textAlign: "center" }}>
              Didn't get it?{" "}
              <button className="link-btn" onClick={resend}
                style={{ background: "none", border: "none", cursor: "pointer", color: PRIMARY, fontWeight: 600, fontSize: 13 }}>
                Resend code
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: TEXT_2, marginTop: 16, textAlign: "center" }}>
              {step === "login" ? "New here? " : "Already have an account? "}
              <button className="link-btn"
                onClick={() => { setErr(""); setNotice(""); setStep(step === "login" ? "register" : "login"); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: PRIMARY, fontWeight: 600, fontSize: 13 }}>
                {step === "login" ? "Create an account" : "Sign in"}
              </button>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button className="link-btn" onClick={continueAsGuest}
            style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_3, fontSize: 13 }}>
            {"Continue as guest ->"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", font: "inherit", fontSize: 14, color: "#111827",
  background: "#fff", border: "1px solid #e5e7eb", borderRadius: 9, padding: "10px 12px", outline: "none",
};

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT_3, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

function Banner({ color, bg, border, children }) {
  return (
    <div style={{ fontSize: 12.5, color, background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 11px", marginBottom: 16 }}>
      {children}
    </div>
  );
}

function Logo() {
  return (
    <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${PRIMARY}, #4a57d8)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>
      L
    </div>
  );
}
