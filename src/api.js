// Frontend client for the Ledger API (the seam to the backend).
//
// Backend base URL comes from Vite env files:
//   .env.development → http://localhost:8000   (npm run dev)
//   .env.production  → CloudFront origin        (npm run build)
//
// Auth uses a short-lived access token + a long-lived refresh token, both kept
// in localStorage. On a 401 we transparently refresh once and retry, so the
// user isn't logged out every hour.
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const ACCESS_KEY = "ledger-access-token";
const REFRESH_KEY = "ledger-refresh-token";

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
export async function register(email, password) {
  const t = await req("/api/auth/register", { method: "POST", auth: false, body: { email, password } });
  setTokens(t.access_token, t.refresh_token);
  return t;
}
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

// --- market / portfolio (stubs) ---
export const quote = (symbol) => req(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`, { auth: false });
export const getPortfolio = () => req("/api/portfolio");
export const setPortfolio = (holdings) => req("/api/portfolio", { method: "PUT", body: holdings });
