// Admin panel. Only rendered for users whose role is 'admin' (the backend also
// enforces this - every call here 403s for non-admins). Shows usage stats and a
// user list, with a guarded role toggle.
import { useEffect, useState } from "react";
import { BG, BORDER, BORDER_SOFT, NEGATIVE, POSITIVE, PRIMARY, SURFACE, TEXT, TEXT_2, TEXT_3 } from "../theme.js";
import { Btn, SectionLabel, Stat, Th } from "../components.jsx";
import { useAuth } from "../auth.jsx";
import * as api from "../api.js";

const COLS = "1fr 90px 70px 120px";

export default function AdminTab() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    setErr("");
    try {
      const [s, u] = await Promise.all([api.adminStats(), api.adminUsers()]);
      setStats(s);
      setUsers(u);
    } catch (e) {
      setErr(e.message || "Could not load admin data.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleRole = async (u) => {
    const next = u.role === "admin" ? "user" : "admin";
    if (!confirm(`Set ${u.email} to ${next}?`)) return;
    setBusyId(u.id);
    setErr("");
    try {
      const updated = await api.adminSetRole(u.id, next);
      setUsers((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      setErr(e.message || "Could not update role.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.3, color: TEXT }}>Admin</h1>
        <p style={{ fontSize: 13, color: TEXT_2, margin: "4px 0 0" }}>Usage overview and user management.</p>
      </div>

      {err && (
        <div style={{ fontSize: 12.5, color: NEGATIVE, marginBottom: 16 }}>{err}</div>
      )}

      {stats && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <Stat label="Total users" value={String(stats.total_users)} />
          <Stat label="With AI key" value={String(stats.users_with_key)} accent={POSITIVE} />
          <Stat label="Saved budgets" value={String(stats.saved_budgets)} />
        </div>
      )}

      <div className="panel" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", borderBottom: `1px solid ${BORDER}`, background: BG }}>
          <SectionLabel>Users</SectionLabel>
          <Btn onClick={load}>Refresh</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "10px 16px", borderBottom: `1px solid ${BORDER_SOFT}` }}>
          <Th>Email</Th>
          <Th>Joined</Th>
          <Th>Role</Th>
          <Th right>Actions</Th>
        </div>
        {users.map((u, i) => (
          <div
            key={u.id}
            className="row-hover"
            style={{
              display: "grid", gridTemplateColumns: COLS, gap: 8, alignItems: "center",
              padding: "9px 16px",
              borderBottom: i < users.length - 1 ? `1px solid ${BORDER_SOFT}` : "none",
              background: i % 2 ? "transparent" : "#fafbfc",
            }}
          >
            <span style={{ fontSize: 13, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 7 }}>
              {u.email}
              {u.has_api_key && <span title="Has AI key" style={{ width: 6, height: 6, borderRadius: 3, background: POSITIVE, flexShrink: 0 }} />}
            </span>
            <span style={{ fontSize: 12, color: TEXT_3 }}>{(u.created_at || "").slice(0, 10)}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: u.role === "admin" ? PRIMARY : TEXT_2 }}>{u.role}</span>
            <div style={{ justifySelf: "end" }}>
              <button
                className="link-btn"
                onClick={() => toggleRole(u)}
                disabled={busyId === u.id || u.id === user?.id}
                title={u.id === user?.id ? "You can't change your own role here" : ""}
                style={{
                  background: "none", border: "none", cursor: u.id === user?.id ? "default" : "pointer",
                  color: u.id === user?.id ? TEXT_3 : PRIMARY, fontSize: 12, fontWeight: 600,
                  opacity: u.id === user?.id ? 0.5 : 1,
                }}
              >
                {u.role === "admin" ? "Make user" : "Make admin"}
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && !err && (
          <div style={{ padding: "16px", fontSize: 13, color: TEXT_3 }}>No users yet.</div>
        )}
      </div>
    </div>
  );
}
