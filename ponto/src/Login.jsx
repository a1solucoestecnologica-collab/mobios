import { useState } from "react";
import { pontoApi } from "./api.js";

export default function Login({ onSuccess }) {
  const [email, setEmail] = useState("admin@a1ponto.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await pontoApi.login(email, password);
      onSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ponto-login">
      <form className="ponto-login-card" onSubmit={handleSubmit}>
        <p className="ponto-eyebrow">MÖBI Time</p>
        <h1>A1 Ponto</h1>
        <p>Sistema de registro de ponto com horário do servidor.</p>
        <label>
          E-mail
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="ponto-error">{error}</p>}
        <button className="button primary" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
