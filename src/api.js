// Frontend client for the Quarterbyte API (the seam to the backend).
//
// Backend base URL comes from Vite env files (VITE_API_URL):
//   .env.development → http://localhost:8000  (npm run dev)
//   .env.production  → "" (empty)             → same-origin: calls /api/... on
//     whatever domain serves the page (quarterbyte.net / CloudFront), since
//     CloudFront routes /api/* to the backend. Same-origin means no CORS.
//
// Note: we check `undefined`, not truthiness, so an intentional empty string
// (same-origin) is respected and only a missing var falls back to localhost.
//
// Auth uses a short-lived access token + a long-lived refresh token, both kept
// in localStorage. On a 401 we transparently refresh once and retry, so the
// user isn't logged out every hour.
const BASE =
  import.meta.env.VITE_API_URL !== undefined
    ? import.meta.env.VITE_API_URL
    : "http://localhost:8000";
const ACCESS_KEY = "quarterbyte-access-token";
const REFRESH_KEY = "quarterbyte-refresh-token";

// One-time migration from the old "ledger-*" key names so existing sessions
// aren't dropped on the rename. Safe to remove after a release or two.
(function migrateLegacyTokens() {
  try {
    const pairs = [
      ["ledger-access-token", ACCESS_KEY],
      ["ledger-refresh-token", REFRESH_KEY],
    ];
    for (const [oldKey, newKey] of pairs) {
      const v = localStorage.getItem(oldKey);
      if (v && !localStorage.getItem(newKey)) localStorage.setItem(newKey, v);
      if (v) localStorage.removeItem(oldKey);
    }
  } catch {
    /* private mode / blocked storage: ignore */
  }
})();

export const getToken = () => localStorage.getItem(ACCESS_KEY);
const getRefresh = () => localStorage.getItem(REFRESH_KEY);
export const isLoggedIn = () => !!getToken();

function setTokens(access, refresh) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  else localStorage.removeItem(ACCESS_KEY);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  else if (refresh === null) localStorage.removeItem(REFRESH_KEY);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// Low-level fetch. `auth` attaches the bearer token; `retry` guards the
// refresh-then-retry from looping.
async function raw(path, { method = "GET", body, form, auth = true } = {}) {
  const headers = {};
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  let payload;
  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    payload = new URLSearchParams(form).toString();
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  return fetch(`${BASE}${path}`, { method, headers, body: payload });
}

async function tryRefresh() {
  const rt = getRefresh();
  if (!rt) return false;
  const res = await raw("/api/auth/refresh", { method: "POST", auth: false, body: { refresh_token: rt } });
  if (!res.ok) {
    clearTokens();
    return false;
  }
  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return true;
}

async function req(path, opts = {}) {
  let res = await raw(path, opts);
  // One transparent refresh-and-retry on an expired access token.
  if (res.status === 401 && opts.auth !== false && getRefresh()) {
    if (await tryRefresh()) res = await raw(path, opts);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.status === 204 ? null : res.json();
}

// --- health ---
export const health = () => req("/api/health", { auth: false });

// --- auth ---
// register no longer returns tokens - it emails a code. Returns { detail }.
export const register = (email, password) =>
  req("/api/auth/register", { method: "POST", auth: false, body: { email, password } });

// verify the emailed code -> issues tokens and logs the user in.
export async function verifyEmail(email, code) {
  const t = await req("/api/auth/verify", { method: "POST", auth: false, body: { email, code } });
  setTokens(t.access_token, t.refresh_token);
  return t;
}

export const resendCode = (email) =>
  req("/api/auth/resend", { method: "POST", auth: false, body: { email } });

export async function login(email, password) {
  // OAuth2 password form expects "username"
  const t = await req("/api/auth/login", { method: "POST", auth: false, form: { username: email, password } });
  setTokens(t.access_token, t.refresh_token);
  return t;
}
export const me = () => req("/api/auth/me");
export async function logout() {
  const rt = getRefresh();
  if (rt) {
    try {
      await raw("/api/auth/logout", { method: "POST", auth: false, body: { refresh_token: rt } });
    } catch {
      /* best-effort server revoke */
    }
  }
  clearTokens();
}

// --- account management ---
// Change password (logs out everywhere; caller should re-auth). 204 on success.
export const changePassword = (currentPassword, newPassword) =>
  req("/api/auth/change-password", { method: "POST", body: { current_password: currentPassword, new_password: newPassword } });

// Permanently delete the account; clears local tokens after.
export async function deleteAccount(password) {
  await req("/api/auth/delete-account", { method: "POST", body: { password } });
  clearTokens();
}

// --- settings (per-user AI key) ---  returns { provider, has_key, key_hint }
export const getSettings = () => req("/api/settings");
export const saveSettings = ({ provider, apiKey }) =>
  req("/api/settings", { method: "PUT", body: { provider, api_key: apiKey } });
export const deleteKey = () => req("/api/settings", { method: "DELETE" });
export const testKey = () => req("/api/settings/test-key", { method: "POST" }); // { ok, detail }

// --- budget sync (signed-in users) ---
export const getBudget = () => req("/api/budget");
export const saveBudget = (budget) => req("/api/budget", { method: "PUT", body: budget });

// --- assistant ---  returns { reply, edits, configured }
export const chat = (message, budget, history = []) =>
  req("/api/ai/chat", { method: "POST", body: { message, budget, history } });

// --- admin (role-gated; 403 for non-admins) ---
export const adminStats = () => req("/api/admin/stats");
export const adminUsers = (limit = 100, offset = 0) =>
  req(`/api/admin/users?limit=${limit}&offset=${offset}`);
export const adminSetRole = (userId, role) =>
  req(`/api/admin/users/${userId}/role`, { method: "PUT", body: { role } });

// --- market / portfolio (stubs) ---
export const quote = (symbol) => req(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`, { auth: false });
export const getPortfolio = () => req("/api/portfolio");
export const setPortfolio = (holdings) => req("/api/portfolio", { method: "PUT", body: holdings });
