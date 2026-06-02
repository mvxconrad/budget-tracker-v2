// Slide-out AI assistant panel. Sends the current budget + conversation to
// POST /api/ai/chat; when the assistant returns budget `edits`, they're applied
// to the live budget immediately (the user watches it fill in behind the panel).
//
// Requires an AI key (per-user in Settings, or the server fallback). If not
// configured, the backend returns { configured: false } and we surface a hint.
import { useEffect, useRef, useState } from "react";
import { BORDER, BORDER_SOFT, FONT, PRIMARY, PRIMARY_SOFT, PRIMARY_TEXT, SURFACE, TEXT, TEXT_2, TEXT_3, POSITIVE, fmt, pct } from "./theme.js";
import { summarize } from "./useBudget.js";
import * as api from "./api.js";

// The assistant's name. Used in the greeting, header, and launcher.
export const ASSISTANT_NAME = "Q";

// Chat persists for the browser SESSION only (survives refresh / tab navigation,
// cleared when the tab closes OR the user logs out), so a reload doesn't wipe the
// conversation but a different login never inherits the previous user's chat.
const CHAT_KEY = "quarterbyte-chat:v1";

// Wipe the stored conversation. Called on logout / account deletion so chat
// memory never crosses between users.
export function clearStoredChat() {
  try {
    sessionStorage.removeItem(CHAT_KEY);
  } catch {
    /* ignore */
  }
}

// Build the opening assistant message from the user's CURRENT budget:
//  - has data  -> a short, real summary (income, top expense, savings rate) and
//                 an offer to optimize. Numbers come from the live budget, not
//                 hardcoded.
//  - empty     -> high-level, choice-based questions to get started.
function buildGreeting(budget) {
  const { categories, totalExpenses, income, leftover } = summarize(budget || { categories: [] });
  const hasData = income > 0 || categories.length > 0;

  if (!hasData) {
    return {
      role: "assistant",
      content:
        `Hi, I'm ${ASSISTANT_NAME}, your AI financial advisor. Your budget's a blank slate, ` +
        "so let's fill it in. Want to:\n\n" +
        "- **Build a budget** - tell me what you earn and spend in plain English\n" +
        "- **Set a savings goal** - e.g. \"save $20k in a year\" and I'll work backward\n" +
        "- **Just explore** - ask me anything about planning your money\n\n" +
        "What sounds good?",
    };
  }

  const top = [...categories].sort((a, b) => b.total - a.total)[0];
  const rate = income > 0 ? pct((leftover / income) * 100) : "-";
  const bits = [];
  if (income > 0) bits.push(`income is **${fmt(income)}/mo**`);
  if (totalExpenses > 0) bits.push(`you're spending **${fmt(totalExpenses)}**`);
  if (top && top.total > 0) bits.push(`biggest category is **${top.name}** (${fmt(top.total)})`);

  return {
    role: "assistant",
    content:
      `Hi, I'm ${ASSISTANT_NAME}. Here's where you stand: ${bits.join(", ")}. ` +
      `That leaves **${fmt(leftover)}/mo** ` +
      (income > 0 ? `(a ${rate} savings rate). ` : ". ") +
      "Want me to look for ways to save more, set a savings goal, or adjust something?",
  };
}

function loadChat(budget) {
  try {
    const raw = sessionStorage.getItem(CHAT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    /* ignore */
  }
  return [buildGreeting(budget)];
}

// Build the history payload the API/Anthropic expects:
//  - only {role, content} (strip UI-only flags like applied/configured/error)
//  - drop error bubbles (never send a failed turn back as context)
//  - must START with a user message (Anthropic rejects a leading assistant turn),
//    so trim the synthetic greeting / any leading assistant messages
//  - cap to the last 20 turns so the payload can't balloon
function outboundHistory(messages) {
  let h = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && !m.error)
    .map((m) => ({ role: m.role, content: String(m.content || "") }));
  while (h.length && h[0].role !== "user") h.shift();
  return h.slice(-20);
}

// Minimal, safe markdown -> HTML for chat bubbles. HTML is escaped FIRST, then a
// small set of inline + block patterns are applied, so model output can never
// inject markup (no raw HTML passes through). Supports: headings, bold, italic,
// inline code, links, and unordered/ordered lists.
function renderMarkdown(src) {
  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  const lines = String(src || "").split(/\r?\n/);
  const out = [];
  let list = null; // "ul" | "ol" | null

  const closeList = () => {
    if (list) { out.push(`</${list}>`); list = null; }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const ul = line.match(/^[-*]\s+(.*)$/);
    const ol = line.match(/^\d+\.\s+(.*)$/);

    if (h) {
      closeList();
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
    } else if (ul) {
      if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; }
      out.push(`<li>${inline(ul[1])}</li>`);
    } else if (ol) {
      if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; }
      out.push(`<li>${inline(ol[1])}</li>`);
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join("");
}

// Animated "Q is thinking" bubble shown while a response is in flight.
function ThinkingBubble() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 14px", borderRadius: 12, borderBottomLeftRadius: 4,
          background: "#f3f4f6", border: `1px solid ${BORDER_SOFT}`,
          fontSize: 12.5, color: TEXT_3,
        }}
      >
        <span style={{ fontWeight: 600 }}>{ASSISTANT_NAME} is thinking</span>
        <span aria-hidden="true">
          <span className="think-dot" />
          <span className="think-dot" />
          <span className="think-dot" />
        </span>
      </div>
    </div>
  );
}

export default function AssistantPanel({ open, onClose, budget, applyEdits, onApplied }) {
  // Init from saved session chat; the greeting (if fresh) reflects the budget.
  const [messages, setMessages] = useState(() => loadChat(budget));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Persist the conversation for this session.
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages]);

  // If the only message is the greeting and it's still showing while the budget
  // changes (e.g. the user edited before chatting), keep the greeting current.
  useEffect(() => {
    setMessages((m) => (m.length === 1 && m[0].role === "assistant" ? [buildGreeting(budget)] : m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget]);

  const resetChat = () => setMessages([buildGreeting(budget)]);

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
    const history = outboundHistory(messages);
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${BORDER_SOFT}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <QAvatar size={28} />
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{ASSISTANT_NAME}</div>
              <div style={{ fontSize: 11, color: TEXT_3 }}>Your AI advisor</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={resetChat} title="New chat" style={iconBtn}>⟳</button>
            <button onClick={onClose} aria-label="Close" style={iconBtn}>✕</button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} />
          ))}
          {busy && <ThinkingBubble />}
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
          maxWidth: "85%", fontSize: 13.5, lineHeight: 1.55,
          padding: "9px 12px", borderRadius: 12,
          background: isUser ? PRIMARY : msg.error ? "#fef2f2" : "#f3f4f6",
          color: isUser ? "#fff" : msg.error ? "#b91c1c" : TEXT,
          border: isUser ? "none" : `1px solid ${BORDER_SOFT}`,
          borderBottomRightRadius: isUser ? 4 : 12,
          borderBottomLeftRadius: isUser ? 12 : 4,
        }}
      >
        {/* User text is plain (preserve newlines); assistant text renders markdown. */}
        {isUser ? (
          <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
        ) : (
          <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
        )}
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

// The "Q" avatar: a small gradient tile with the assistant's initial.
function QAvatar({ size = 28 }) {
  return (
    <span
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: `linear-gradient(135deg, ${PRIMARY}, #2563eb)`, color: "#fff",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: Math.round(size * 0.5), fontWeight: 700,
      }}
    >
      {ASSISTANT_NAME}
    </span>
  );
}

// Always-visible launcher when the panel is closed: a small docked pill on the
// right edge so Q is "present" without taking the full panel. Hides while open.
export function AssistantLauncher({ open, onOpen }) {
  if (open) return null;
  return (
    <button
      onClick={onOpen}
      title={`Ask ${ASSISTANT_NAME}, your AI advisor`}
      style={{
        position: "fixed", right: 20, bottom: 20, zIndex: 49,
        display: "inline-flex", alignItems: "center", gap: 9,
        padding: "10px 16px 10px 12px", borderRadius: 999, cursor: "pointer",
        fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: "#fff",
        background: `linear-gradient(135deg, ${PRIMARY}, #2563eb)`,
        border: "none", boxShadow: "0 8px 24px rgba(37,99,235,0.35)",
      }}
    >
      <QAvatar size={26} />
      Ask {ASSISTANT_NAME}
    </button>
  );
}
