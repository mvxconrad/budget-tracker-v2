// Frontend client for the Ledger API (the seam to the backend).
// Auth token is kept in localStorage; the assistant call returns { reply, edits }
// where `edits` is a partial budget you merge into the on-screen state.

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "ledger-auth-token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));
export const isLoggedIn = () => !!getToken();

async function req(path, { method = "GET", body, form, auth = true } = {}) {
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
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
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
  const { access_token } = await req("/api/auth/register", { method: "POST", auth: false, body: { email, password } });
  setToken(access_token);
  return access_token;
}
export async function login(email, password) {
  // OAuth2 password form expects "username"
  const { access_token } = await req("/api/auth/login", { method: "POST", auth: false, form: { username: email, password } });
  setToken(access_token);
  return access_token;
}
export const me = () => req("/api/auth/me");
export const logout = () => setToken(null);

// --- assistant ---
// budget: the current budget object; history: [{role, content}, ...]
// returns { reply, edits, configured }
export const chat = (message, budget, history = []) =>
  req("/api/ai/chat", { method: "POST", body: { message, budget, history } });

// --- market / portfolio (stubs) ---
export const quote = (symbol) => req(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`, { auth: false });
export const getPortfolio = () => req("/api/portfolio");
export const setPortfolio = (holdings) => req("/api/portfolio", { method: "PUT", body: holdings });
