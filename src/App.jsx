import { useEffect, useRef, useState } from "react";
import {
  BG,
  BORDER,
  BORDER_SOFT,
  FONT,
  PRIMARY,
  PRIMARY_SOFT,
  PRIMARY_TEXT,
  SIDEBAR,
  SURFACE,
  TEXT,
  TEXT_2,
  TEXT_3,
} from "./theme.js";
import { useBudget } from "./useBudget.js";
import { useAuth } from "./auth.jsx";
import Logo from "./Logo.jsx";
import { Btn, Pill } from "./components.jsx";
import BudgetTab from "./tabs/BudgetTab.jsx";
import SavingsTab from "./tabs/SavingsTab.jsx";
import SettingsTab from "./tabs/SettingsTab.jsx";
import AdminTab from "./tabs/AdminTab.jsx";
import HelpTab from "./tabs/HelpTab.jsx";

const NAV = [
  { key: "budget", label: "Budget", icon: "budget" },
  { key: "savings", label: "Savings", icon: "savings" },
];
const SOON = [
  { key: "investments", label: "Investments", icon: "investments" },
  { key: "reports", label: "Reports", icon: "reports" },
];
const TITLES = { budget: "Budget", savings: "Savings", settings: "Settings", admin: "Admin", help: "Help" };

export default function App() {
  const { user, guest, logout, goToAuth } = useAuth();
  const [budget, api] = useBudget(user);
  const [active, setActive] = useState("budget");
  const isAdmin = user?.role === "admin";

  const onClear = () => {
    if (confirm("Clear everything and start from a blank budget?")) api.clearAll();
  };

  // Budget/Savings get the data toolbar; Settings/Help don't.
  const showDataToolbar = active === "budget" || active === "savings";

  return (
    <div style={{ display: "flex", height: "100vh", background: BG, color: TEXT, fontFamily: FONT }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 232,
          flexShrink: 0,
          background: SIDEBAR,
          borderRight: `1px solid ${BORDER_SOFT}`,
          display: "flex",
          flexDirection: "column",
          padding: "18px 14px",
        }}
      >
        <Brand />
        <NavGroup label="Workspace">
          {NAV.map((n) => (
            <NavItem key={n.key} {...n} active={active === n.key} onClick={() => setActive(n.key)} />
          ))}
        </NavGroup>
        <NavGroup label="Coming soon">
          {SOON.map((n) => (
            <NavItem key={n.key} {...n} soon />
          ))}
        </NavGroup>
        <div style={{ flex: 1 }} />
        {isAdmin && (
          <NavItem label="Admin" icon="admin" active={active === "admin"} onClick={() => setActive("admin")} />
        )}
        <NavItem label="Settings" icon="settings" active={active === "settings"} onClick={() => setActive("settings")} />
        <NavItem label="Help" icon="help" active={active === "help"} onClick={() => setActive("help")} />
        <AccountFooter user={user} guest={guest} logout={logout} goToAuth={goToAuth} />
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 60,
            flexShrink: 0,
            borderBottom: `1px solid ${BORDER_SOFT}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600 }}>{TITLES[active]}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {showDataToolbar && (
              <>
                <Btn onClick={onClear}>Clear all</Btn>
                {user ? (
                  <Btn variant="primary" onClick={api.save} disabled={api.saving || !api.dirty}
                    title={api.dirty ? "Save your budget" : "All changes saved"}>
                    {api.saving ? "Saving..." : api.dirty ? "Save" : "Saved"}
                  </Btn>
                ) : (
                  <Btn variant="primary" onClick={() => goToAuth("signup")} title="Sign up to save your budget">
                    Sign up to save
                  </Btn>
                )}
              </>
            )}
            <AuthArea user={user} guest={guest} logout={logout} goToAuth={goToAuth} />
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 880, margin: "0 auto", padding: "30px 28px 72px" }}>
            {active === "budget" && <BudgetTab budget={budget} api={api} />}
            {active === "savings" && <SavingsTab budget={budget} api={api} />}
            {active === "settings" && <SettingsTab />}
            {active === "admin" && isAdmin && <AdminTab />}
            {active === "help" && <HelpTab />}
          </div>
        </div>
      </main>
    </div>
  );
}

// Top-right navbar auth area: Log in / Sign up for guests; a profile avatar with
// a dropdown (email + sign out) when logged in.
function AuthArea({ user, guest, logout, goToAuth }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Guest (or not signed in): show Log in / Sign up.
  if (!user) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: guest ? 4 : 0, paddingLeft: 8, borderLeft: `1px solid ${BORDER_SOFT}` }}>
        <Btn onClick={() => goToAuth("login")}>Log in</Btn>
        <Btn variant="primary" onClick={() => goToAuth("signup")}>Sign up</Btn>
      </div>
    );
  }

  // Logged in: avatar + dropdown.
  const initial = (user.email || "?")[0].toUpperCase();
  return (
    <div ref={ref} style={{ position: "relative", marginLeft: 4, paddingLeft: 8, borderLeft: `1px solid ${BORDER_SOFT}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={user.email}
        aria-label="Account menu"
        style={{
          width: 32, height: 32, borderRadius: "50%", cursor: "pointer", flexShrink: 0,
          background: PRIMARY_SOFT, color: PRIMARY_TEXT, border: `1px solid ${BORDER}`,
          fontSize: 13, fontWeight: 700, fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {initial}
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 40, minWidth: 200,
            background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10,
            boxShadow: "0 12px 32px rgba(16,24,40,0.16)", overflow: "hidden",
          }}
        >
          <div style={{ padding: "11px 13px", borderBottom: `1px solid ${BORDER_SOFT}` }}>
            <div style={{ fontSize: 11, color: TEXT_3, marginBottom: 2 }}>Signed in as</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </div>
            {user.role === "admin" && (
              <div style={{ marginTop: 5 }}><Pill color={PRIMARY}>Admin</Pill></div>
            )}
          </div>
          <button
            className="nav-item"
            onClick={() => { setOpen(false); logout(); }}
            style={{
              display: "block", width: "100%", textAlign: "left", border: "none",
              background: "transparent", cursor: "pointer", padding: "10px 13px",
              fontSize: 13, fontWeight: 500, color: TEXT_2, fontFamily: "inherit",
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function AccountFooter({ user, guest, logout, goToAuth }) {
  return (
    <div style={{ marginTop: 10, paddingTop: 12, borderTop: `1px solid ${BORDER_SOFT}` }}>
      {user ? (
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px" }}>
          <div
            style={{
              width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
              background: PRIMARY_SOFT, color: PRIMARY_TEXT,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
            }}
          >
            {user.email[0].toUpperCase()}
          </div>
          <span style={{ flex: 1, fontSize: 12, color: TEXT_2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.email}
          </span>
          <button className="link-btn" onClick={logout} title="Sign out" style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_3, fontSize: 12 }}>
            Sign out
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
          <span style={{ fontSize: 12, color: TEXT_3 }}>Guest{guest ? " · local only" : ""}</span>
          <button className="link-btn" onClick={() => goToAuth("login")} style={{ background: "none", border: "none", cursor: "pointer", color: PRIMARY, fontSize: 12, fontWeight: 600 }}>
            Sign in
          </button>
        </div>
      )}
    </div>
  );
}

function Brand() {
  return (
    <div style={{ padding: "2px 8px 20px" }}>
      <Logo wordmark height={24} />
    </div>
  );
}

function NavGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: TEXT_3, padding: "0 10px 8px" }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
    </div>
  );
}

function NavItem({ label, icon, active, soon, onClick }) {
  return (
    <button
      className={`nav-item${active ? " active" : ""}`}
      onClick={onClick}
      disabled={soon}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        textAlign: "left",
        padding: "8px 10px",
        borderRadius: 7,
        border: "none",
        background: active ? PRIMARY_SOFT : "transparent",
        color: active ? PRIMARY_TEXT : soon ? TEXT_3 : TEXT_2,
        fontSize: 13.5,
        fontWeight: active ? 600 : 500,
        fontFamily: "inherit",
      }}
    >
      <Icon name={icon} />
      <span style={{ flex: 1 }}>{label}</span>
      {soon && <Pill>Soon</Pill>}
    </button>
  );
}

function Icon({ name, size = 17 }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "budget":
      return (
        <svg {...p}>
          <rect x="2.5" y="5" width="19" height="15" rx="2.5" />
          <path d="M2.5 9.5h19" />
          <circle cx="17" cy="14.5" r="1.4" />
        </svg>
      );
    case "savings":
      return (
        <svg {...p}>
          <path d="M3 16.5l6-6 4 4 7.5-7.5" />
          <path d="M16 7h4.5v4.5" />
        </svg>
      );
    case "investments":
      return (
        <svg {...p}>
          <path d="M4 20V11M9.3 20V6M14.6 20v-5M20 20V8" />
        </svg>
      );
    case "reports":
      return (
        <svg {...p}>
          <rect x="5" y="3" width="14" height="18" rx="2.5" />
          <path d="M9 8.5h6M9 12.5h6M9 16.5h4" />
        </svg>
      );
    case "admin":
      return (
        <svg {...p}>
          <path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3Z" />
          <path d="M9.5 12l1.8 1.8L15 10" />
        </svg>
      );
    case "settings":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.3-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );
    case "help":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.6 9.3a2.4 2.4 0 1 1 3.3 2.2c-.7.4-1.1.9-1.1 1.7" />
          <path d="M11.9 16.4h.01" />
        </svg>
      );
    case "plus":
      return (
        <svg {...p}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    default:
      return null;
  }
}
