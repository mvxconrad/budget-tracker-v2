// Settings — connect your own AI provider key so the assistant runs on your
// account. Paste-key is the real flow (providers don't offer "authorize this
// site" OAuth for API access); we deep-link to the console to make it painless.
import { useEffect, useState } from "react";
import { BORDER, BORDER_SOFT, NEGATIVE, POSITIVE, PRIMARY, SURFACE, TEXT, TEXT_2, TEXT_3 } from "../theme.js";
import { Btn, InfoBox, SectionLabel } from "../components.jsx";
import { useAuth } from "../auth.jsx";
import * as api from "../api.js";

const PROVIDERS = [
  { id: "anthropic", label: "Claude (Anthropic)", keyUrl: "https://console.anthropic.com/settings/keys", prefix: "sk-ant-", live: true },
  { id: "openai", label: "ChatGPT (OpenAI)", keyUrl: "https://platform.openai.com/api-keys", prefix: "sk-", live: false },
];

export default function SettingsTab() {
  const { user } = useAuth();
  const [provider, setProvider] = useState("anthropic");
  const [keyInput, setKeyInput] = useState("");
  const [saved, setSaved] = useState(null); // { provider, has_key, key_hint }
  const [status, setStatus] = useState(null); // { ok, detail }
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user) return;
    api.getSettings().then((s) => {
      setSaved(s);
      if (s.provider) setProvider(s.provider);
    }).catch(() => {});
  }, [user]);

  const meta = PROVIDERS.find((p) => p.id === provider);

  if (!user) {
    return (
      <div>
        <Header />
        <InfoBox title="Sign in required.">
          Settings (including your AI key) are tied to your account. Sign in to connect the assistant.
        </InfoBox>
      </div>
    );
  }

  const save = async () => {
    setErr(""); setStatus(null); setBusy("save");
    try {
      const s = await api.saveSettings({ provider, apiKey: keyInput.trim() || undefined });
      // also persist provider even if key unchanged
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
    try {
      setStatus(await api.testKey());
    } catch (e) {
      setStatus({ ok: false, detail: e.message || "Couldn't test." });
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (!confirm("Remove your saved API key?")) return;
    setErr(""); setStatus(null); setBusy("del");
    try {
      setSaved(await api.deleteKey());
    } catch (e) {
      setErr(e.message || "Couldn't remove.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div>
      <Header />

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

      {/* Current key status */}
      <div
        className="panel"
        style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}
      >
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
            placeholder={saved?.has_key ? "Paste a new key to replace" : `Paste your key (${meta.prefix}…)`}
            style={{
              flex: 1, font: "inherit", fontSize: 13.5, color: TEXT, background: "#fff",
              border: `1px solid ${BORDER}`, borderRadius: 9, padding: "10px 12px", outline: "none",
            }}
          />
          <Btn variant="primary" onClick={save} disabled={busy === "save" || (!keyInput.trim() && provider === saved?.provider)}>
            {busy === "save" ? "Saving…" : "Save"}
          </Btn>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 12 }}>
          <a href={meta.keyUrl} target="_blank" rel="noreferrer" className="link-btn" style={{ fontSize: 12.5, color: PRIMARY, fontWeight: 500 }}>
            Get a key →
          </a>
          {saved?.has_key && meta.live && (
            <button className="link-btn" onClick={test} disabled={busy === "test"} style={linkBtn}>
              {busy === "test" ? "Testing…" : "Test connection"}
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
      </div>

      <InfoBox title="Why paste a key?">
        Providers don't offer a "sign in to authorize this site" flow for API access — your key
        is how the assistant runs on your account. It's stored on your Ledger account and only
        ever shown back to you as the last 4 characters.
      </InfoBox>
      <div style={{ fontSize: 11, color: TEXT_3, marginTop: 4, lineHeight: 1.5 }}>
        Signed in as {user.email}. Your key bills your own provider account; you control usage and can remove it anytime.
      </div>
    </div>
  );
}

const linkBtn = { background: "none", border: "none", cursor: "pointer", color: PRIMARY, fontSize: 12.5, fontWeight: 500, padding: 0 };

function Header() {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.3, color: TEXT }}>Settings</h1>
      <p style={{ fontSize: 13, color: TEXT_2, margin: "4px 0 0" }}>Connect your AI provider to use the assistant.</p>
    </div>
  );
}
