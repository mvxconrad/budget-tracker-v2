import React from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "./auth.jsx";
import Landing from "./Landing.jsx";
import AuthScreen from "./AuthScreen.jsx";
import App from "./App.jsx";

// Routing (no router lib, just the auth context's view state):
//   signed in OR guest          → the app
//   otherwise, "home"           → public marketing landing
//              "login"/"signup" → auth form (back returns to landing)
function Root() {
  const { user, guest, ready, authView, setAuthView } = useAuth();

  if (!ready) return null; // brief: checking session
  if (user || guest) return <App />;

  if (authView === "login" || authView === "signup") {
    return (
      <AuthScreen
        initialMode={authView === "signup" ? "register" : "login"}
        onBack={() => setAuthView("home")}
      />
    );
  }
  return <Landing onLogin={() => setAuthView("login")} onSignup={() => setAuthView("signup")} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
);
