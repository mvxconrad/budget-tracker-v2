import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "./auth.jsx";
import Landing from "./Landing.jsx";
import AuthScreen from "./AuthScreen.jsx";
import App from "./App.jsx";

// Routing (no router lib - just view state):
//   signed in OR guest          → the app
//   otherwise, "home"           → public marketing landing
//              "login"/"signup" → auth form (back returns to landing)
function Root() {
  const { user, guest, ready } = useAuth();
  const [view, setView] = useState("home");

  if (!ready) return null; // brief: checking session
  if (user || guest) return <App />;

  if (view === "login" || view === "signup") {
    return <AuthScreen initialMode={view === "signup" ? "register" : "login"} onBack={() => setView("home")} />;
  }
  return <Landing onLogin={() => setView("login")} onSignup={() => setView("signup")} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
);
