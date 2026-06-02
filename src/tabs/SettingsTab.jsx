// Settings, organized into sub-tabs: Account, AI provider, Security, Danger zone.
import { useEffect, useState } from "react";
import { BORDER, BORDER_SOFT, NEGATIVE, POSITIVE, PRIMARY, PRIMARY_SOFT, PRIMARY_TEXT, SURFACE, TEXT, TEXT_2, TEXT_3 } from "../theme.js";
import { Btn, InfoBox, Pill, SectionLabel } from "../components.jsx";
import { useAuth } from "../auth.jsx";
import * as api from "../api.js";

const TABS = [
  { id: "account", label: "Account" },
  { id: "ai", label: "AI provider" },
  { id: "security", label: "Security" },
  { id: "danger", label: "Danger zone" },
];

export default function SettingsTab() {
  const { user } = useAuth();
  const [tab, setTab] = useState("account");

  if (!user) {
    return (
      <div>
        <Header />
        <InfoBox title="Sign in required.">
          Settings are tied to your account. Sign in to manage your profile, AI key, and security.
        </InfoBox>
      </div>
    );
  }

  return (
    <div>
      <Header />
      {/* Sub-tab strip */}
      <div style={{ display: "flex", gap: 4, marginBottom: 22, borderBottom: `1px solid ${BORDER_SOFT}` }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: 13.5, fontWeight: 600, padding: "8px 12px",
              color: tab === t.id ? TEXT : TEXT_3,
              borderBottom: `2px solid ${tab === t.id ? PRIMARY : "transparent"}`,
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "account" && <AccountTab user={user} />}
      {tab === "ai" && <AiProviderTab user={user} />}
      {tab === "security" && <SecurityTab />}
      {tab === "danger" && <DangerTab />}
    </div>
  );
}

/* ---------------- Account ---------------- */
function AccountTab({ user }) {
  return (
    <div>
      <Panel>
        <SectionLabel>Profile</SectionLabel>
        <Row label="Email" value={user.email} />
        <Row label="Role" value={<Pill color={user.role === "admin" ? PRIMARY : TEXT_3}>{user.role}</Pill>} />
        <Row label="Email verified" value={user.email_verified ? <span style={{ color: POSITIVE }}>Verified</span> : <span style={{ color: NEGATIVE }}>No</span>} last />
      </Panel>
      <div style={{ fontSize: 11.5, color: TEXT_3, marginTop: 6 }}>
        Changing your email isn't supported yet. Reach out if you need it moved.
      </div>
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: last ? "none" : `1px solid ${BORDER_SOFT}` }}>
      <span style={{ fontSize: 13, color: TEXT_2 }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 500, color: TEXT }}>{value}</span>
    </div>
  );
}

/* ---------------- Security (password) ---------------- */
function SecurityTab() {
  const { changePassword, logout } = useAuth();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) return setMsg({ ok: false, text: "New password must be at least 8 characters." });
    if (next !== confirm) return setMsg({ ok: false, text: "New passwords don't match." });
    setBusy(true);
    try {
      await changePassword(cur, next);
      setMsg({ ok: true, text: "Password changed. Signing you out of other sessions..." });
      setCur(""); setNext(""); setConfirm("");
      // Current token is now revoked server-side; sign out so the user re-logs in.
      setTimeout(() => logout(), 1200);
    } catch (e) {
      setMsg({ ok: false, text: e.message || "Couldn't change password." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <SectionLabel>Change password</SectionLabel>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
        <Field label="Current password"><input type="password" value={cur} onChange={(e) => setCur(e.target.value)} required style={inputStyle} /></Field>
        <Field label="New password"><input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} placeholder="At least 8 characters" style={inputStyle} /></Field>
        <Field label="Confirm new password"><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required style={inputStyle} /></Field>
        {msg && <div style={{ fontSize: 12.5, color: msg.ok ? POSITIVE : NEGATIVE }}>{msg.text}</div>}
        <div>
          <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? "Saving..." : "Change password"}</Btn>
        </div>
      </form>
      <div style={{ fontSize: 11.5, color: TEXT_3, marginTop: 14 }}>
        For your safety, changing your password signs you out of all devices.
      </div>
    </Panel>
  );
}

/* ---------------- Danger zone (delete) ---------------- */
function DangerTab() {
  const { deleteAccount } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (confirmText !== "DELETE") return setErr('Type DELETE to confirm.');
    if (!confirm("This permanently deletes your account and all your data. Continue?")) return;
    setBusy(true);
    try {
      await deleteAccount(password); // clears tokens + routes home
    } catch (e) {
      setErr(e.message || "Couldn't delete account.");
      setBusy(false);
    }
  };

  return (
    <div className="panel" style={{ background: SURFACE, border: `1px solid ${NEGATIVE}55`, borderRadius: 10, padding: "16px 18px" }}>
      <SectionLabel>Delete account</SectionLabel>
      <p style={{ fontSize: 13, color: TEXT_2, lineHeight: 1.6, margin: "0 0 14px" }}>
        This permanently deletes your account, your saved budget, and your stored AI key. This cannot be undone.
      </p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
        <Field label="Your password"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} /></Field>
        <Field label={'Type "DELETE" to confirm'}><input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} required placeholder="DELETE" style={inputStyle} /></Field>
        {err && <div style={{ fontSize: 12.5, color: NEGATIVE }}>{err}</div>}
        <div>
          <button type="submit" disabled={busy} className="btn"
            style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", background: NEGATIVE, border: `1px solid ${NEGATIVE}`, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Deleting..." : "Delete my account"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- AI provider (existing key flow) ---------------- */
const PROVIDERS = [
  { id: "anthropic", label: "Claude (Anthropic)", keyUrl: "https://console.anthropic.com/settings/keys", prefix: "sk-ant-", live: true },
  { id: "openai", label: "ChatGPT (OpenAI)", keyUrl: "https://platform.openai.com/api-keys", prefix: "sk-", live: false },
];

function AiProviderTab() {
  const [provider, setProvider] = useState("anthropic");
  const [keyInput, setKeyInput] = useState("");
  const [saved, setSaved] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api.getSettings().then((s) => {
      setSaved(s);
      if (s.provider) setProvider(s.provider);
    }).catch(() => {});
  }, []);

  const meta = PROVIDERS.find((p) => p.id === provider);

  const save = async () => {
    setErr(""); setStatus(null); setBusy("save");
    try {
      const s = await api.saveSettings({ provider, apiKey: keyInput.trim() || undefined });
      const s2 = keyInput.trim() ? s : await api.saveSettings({ provider });
      setSaved(s2 || s);
      setKeyInput("");
    } catch (e) {
      setErr(e.message || "Couldn't save.");
    } finally {
      setBusy("");
    }
  };

  const test = async () => {
    setErr(""); setStatus(null); setBusy("test");
    try { setStatus(await api.testKey()); }
    catch (e) { setStatus({ ok: false, detail: e.message || "Couldn't test." }); }
    finally { setBusy(""); }
  };

  const remove = async () => {
    if (!confirm("Remove your saved API key?")) return;
    setErr(""); setStatus(null); setBusy("del");
    try { setSaved(await api.deleteKey()); }
    catch (e) { setErr(e.message || "Couldn't remove."); }
    finally { setBusy(""); }
  };

  return (
    <div>
      <SectionLabel>AI provider</SectionLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => setProvider(p.id)}
            className="card"
            style={{
              flex: 1, textAlign: "left", cursor: "pointer",
              background: SURFACE, borderRadius: 10, padding: "12px 14px",
              border: `1px solid ${provider === p.id ? PRIMARY : BORDER}`,
              boxShadow: provider === p.id ? `0 0 0 3px ${PRIMARY}22` : "none",
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 600, color: TEXT }}>{p.label}</div>
            <div style={{ fontSize: 11.5, color: p.live ? POSITIVE : TEXT_3, marginTop: 3 }}>
              {p.live ? "Supported" : "Coming soon"}
            </div>
          </button>
        ))}
      </div>

      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SectionLabel>API key</SectionLabel>
          <span style={{ fontSize: 12, color: saved?.has_key ? POSITIVE : TEXT_3 }}>
            {saved?.has_key ? `Connected · ${saved.key_hint}` : "Not connected"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={saved?.has_key ? "Paste a new key to replace" : `Paste your key (${meta.prefix}...)`}
            style={inputStyle}
          />
          <Btn variant="primary" onClick={save} disabled={busy === "save" || (!keyInput.trim() && provider === saved?.provider)}>
            {busy === "save" ? "Saving..." : "Save"}
          </Btn>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 12 }}>
          <a href={meta.keyUrl} target="_blank" rel="noreferrer" className="link-btn" style={{ fontSize: 12.5, color: PRIMARY, fontWeight: 500 }}>
            Get a key →
          </a>
          {saved?.has_key && meta.live && (
            <button className="link-btn" onClick={test} disabled={busy === "test"} style={linkBtn}>
              {busy === "test" ? "Testing..." : "Test connection"}
            </button>
          )}
          {saved?.has_key && (
            <button className="link-btn" onClick={remove} disabled={busy === "del"} style={{ ...linkBtn, color: NEGATIVE }}>
              Remove
            </button>
          )}
        </div>

        {status && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: status.ok ? POSITIVE : NEGATIVE }}>
            {status.ok ? "✓ " : "✕ "}{status.detail}
          </div>
        )}
        {err && <div style={{ marginTop: 12, fontSize: 12.5, color: NEGATIVE }}>{err}</div>}
      </Panel>

      <InfoBox title="Why paste a key?">
        Providers don't offer a "sign in to authorize this site" flow for API access, so your key
        is how the advisor runs on your account. It's stored encrypted and only ever shown back to
        you as the last 4 characters.
      </InfoBox>
    </div>
  );
}

/* ---------------- shared bits ---------------- */
const inputStyle = {
  flex: 1, width: "100%", font: "inherit", fontSize: 13.5, color: TEXT, background: "#fff",
  border: `1px solid ${BORDER}`, borderRadius: 9, padding: "10px 12px", outline: "none",
};
const linkBtn = { background: "none", border: "none", cursor: "pointer", color: PRIMARY, fontSize: 12.5, fontWeight: 500, padding: 0 };

function Panel({ children }) {
  return (
    <div className="panel" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT_3, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

function Header() {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.3, color: TEXT }}>Settings</h1>
      <p style={{ fontSize: 13, color: TEXT_2, margin: "4px 0 0" }}>Manage your account, AI provider, and security.</p>
    </div>
  );
}
