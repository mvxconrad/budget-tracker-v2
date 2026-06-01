// Auth context: tracks the logged-in user, exposes login/register/logout, and
// degrades gracefully when the backend is unreachable (guest mode) so the budget
// tool always works locally.
import { createContext, useContext, useEffect, useState } from "react";
import * as api from "./api.js";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { email } | null
  const [ready, setReady] = useState(false); // initial session check done
  const [guest, setGuest] = useState(false); // chose to skip login
  const [backendUp, setBackendUp] = useState(true);

  // On load: if we have a token, verify it; also probe the backend.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await api.health();
        if (api.isLoggedIn()) {
          const me = await api.me();
          if (alive) setUser(me);
        }
      } catch {
        if (alive) setBackendUp(false);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const login = async (email, password) => {
    await api.login(email, password);
    setUser(await api.me());
    setGuest(false);
  };
  const register = async (email, password) => {
    await api.register(email, password);
    setUser(await api.me());
    setGuest(false);
  };
  const logout = () => {
    api.logout();
    setUser(null);
    setGuest(false);
  };
  const continueAsGuest = () => setGuest(true);

  return (
    <AuthCtx.Provider
      value={{ user, ready, guest, backendUp, login, register, logout, continueAsGuest }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
