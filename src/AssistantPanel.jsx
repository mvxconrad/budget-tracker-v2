// Slide-out AI assistant panel. Sends the current budget + conversation to
// POST /api/ai/chat; when the assistant returns budget `edits`, they're applied
// to the live budget immediately (the user watches it fill in behind the panel).
//
// Requires an AI key (per-user in Settings, or the server fallback). If not
// configured, the backend returns { configured: false } and we surface a hint.
import { useEffect, useRef, useState } from "react";
import { BORDER, BORDER_SOFT, FONT, PRIMARY, PRIMARY_SOFT, PRIMARY_TEXT, SURFACE, TEXT, TEXT_2, TEXT_3, POSITIVE } from "./theme.js";
import * as api from "./api.js";

const GREETING = {
  role: "assistant",
  content:
    "Hi, I'm your Quarterbyte advisor. Tell me what you earn and spend in plain English " +
    "(e.g. \"I make $6,000 a month, rent is $2,000, groceries $400\") and I'll build your " +
    "budget. You can also ask what-if questions like \"how much to save $20k in a year?\"",
};

export default function AssistantPanel({ open, onClose, budget, applyEdits, onApplied }) {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Autoscroll to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Focus the input when the panel opens.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const history = messages.filter((m) => m.role === "user" || m.role === "assistant");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await api.chat(text, budget, history);
      if (res.edits && Object.keys(res.edits).length > 0) {
        applyEdits(res.edits);
        onApplied?.();
      }
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.reply || "Done.",
          applied: res.edits && Object.keys(res.edits).length > 0,
          configured: res.configured,
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Something went wrong: ${e.message || "request failed"}`, error: true },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(16,24,40,0.28)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}
      />
      {/* Panel */}
      <aside
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 51,
          width: "min(420px, 100vw)", background: SURFACE, fontFamily: FONT,
          borderLeft: `1px solid ${BORDER}`, boxShadow: "-16px 0 40px rgba(16,24,40,0.16)",
          display: "flex", flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.24s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${BORDER_SOFT}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: POSITIVE, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>AI advisor</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={iconBtn}>✕</button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} />
          ))}
          {busy && <Bubble msg={{ role: "assistant", content: "..." }} />}
        </div>

        {/* Input */}
        <div style={{ borderTop: `1px solid ${BORDER_SOFT}`, padding: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="Tell me about your money..."
              style={{
                flex: 1, resize: "none", maxHeight: 120, font: "inherit", fontSize: 13.5,
                color: TEXT, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10,
                padding: "10px 12px", outline: "none", lineHeight: 1.5,
              }}
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              className="btn btn-primary"
              style={{
                padding: "10px 14px", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                color: "#fff", background: PRIMARY, border: `1px solid ${PRIMARY}`,
                opacity: busy || !input.trim() ? 0.5 : 1, flexShrink: 0,
              }}
            >
              Send
            </button>
          </div>
          <div style={{ fontSize: 11, color: TEXT_3, marginTop: 7, textAlign: "center" }}>
            Changes apply live. Press Save to keep them.
          </div>
        </div>
      </aside>
    </>
  );
}

function Bubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "85%", fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap",
          padding: "9px 12px", borderRadius: 12,
          background: isUser ? PRIMARY : msg.error ? "#fef2f2" : "#f3f4f6",
          color: isUser ? "#fff" : msg.error ? "#b91c1c" : TEXT,
          border: isUser ? "none" : `1px solid ${BORDER_SOFT}`,
          borderBottomRightRadius: isUser ? 4 : 12,
          borderBottomLeftRadius: isUser ? 12 : 4,
        }}
      >
        {msg.content}
        {msg.applied && (
          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: POSITIVE, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: POSITIVE }} /> Applied to your budget
          </div>
        )}
        {msg.configured === false && (
          <div style={{ marginTop: 6, fontSize: 11, color: PRIMARY_TEXT, background: PRIMARY_SOFT, padding: "5px 8px", borderRadius: 6 }}>
            Add your AI key in Settings to turn this on.
          </div>
        )}
      </div>
    </div>
  );
}

const iconBtn = {
  width: 28, height: 28, borderRadius: 7, cursor: "pointer",
  color: "#9aa1ad", background: "transparent", border: `1px solid ${BORDER}`,
  fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center",
};
