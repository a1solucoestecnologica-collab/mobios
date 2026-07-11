import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./portal.css";
import App from "./App.jsx";
import { platformApi } from "./services/api.js";

window.__MOBI_PORTAL_STANDALONE__ = true;

async function platformLogin(email, password) {
  const response = await fetch("/api/platform/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Não foi possível entrar.");
  return data;
}

async function platformLogout() {
  await fetch("/api/platform/logout", { method: "POST", credentials: "same-origin" }).catch(() => null);
}

function hasPortalAccess(permissions = []) {
  return permissions.some((perm) => perm.code === "portal.access");
}

function PortalLogin({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await platformLogin(email.trim(), password);
      const identity = await platformApi.identity();
      if (!hasPortalAccess(identity.permissions)) {
        await platformLogout();
        throw new Error("Sua conta não possui acesso ao Portal do Colaborador.");
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="portal-login-brand">
          <p className="portal-login-eyebrow">MÖBI Portal</p>
          <p>Entre com o e-mail e a senha fornecidos pela sua empresa.</p>
        </div>
        <label>
          E-mail
          <input
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Senha
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="button primary" type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Entrar no Portal"}
        </button>
        {error && <p className="login-error">{error}</p>}
      </form>
    </section>
  );
}

function PortalStandalone() {
  const [phase, setPhase] = useState("checking");

  const checkSession = useCallback(async () => {
    try {
      const identity = await platformApi.identity();
      if (!hasPortalAccess(identity.permissions)) {
        await platformLogout();
        setPhase("login");
        return;
      }
      setPhase("app");
    } catch {
      setPhase("login");
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const auth = phase === "checking" || phase === "login";
    document.documentElement.classList.toggle("portal-auth-screen", auth);
    document.body.classList.toggle("portal-auth-screen", auth);
    document.body.classList.toggle("portal-app-open", phase === "app");
    return () => {
      document.documentElement.classList.remove("portal-auth-screen");
      document.body.classList.remove("portal-auth-screen", "portal-app-open");
    };
  }, [phase]);

  if (phase === "checking") {
    return (
      <section className="login-screen">
        <div className="login-card portal-login-brand">
          <p className="portal-login-eyebrow">MÖBI Portal</p>
          <h1>Carregando…</h1>
          <p>Aguarde um instante.</p>
        </div>
      </section>
    );
  }

  if (phase === "login") {
    return <PortalLogin onSuccess={() => setPhase("app")} />;
  }

  return <App standalone onSessionExpired={() => setPhase("login")} />;
}

const rootEl = document.getElementById("portalRoot");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <PortalStandalone />
    </StrictMode>,
  );
}
