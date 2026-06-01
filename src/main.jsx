import React from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "./auth.jsx";
import Landing from "./Landing.jsx";
import App from "./App.jsx";

// Decide between the login landing and the app. Guests skip login (budget tool
// works locally; AI features prompt to sign in).
function Root() {
  const { user, guest, ready } = useAuth();
  if (!ready) return null; // brief: checking session
  if (!user && !guest) return <Landing />;
  return <App />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
);
