import { useEffect, useState } from "react";
import { PageHeader, PlaceholderCard } from "../components/PageParts.jsx";
import { labelPermission, labelStatus } from "../../../shared/ui-pt.js";
import { platformApi } from "../services/api.js";

export default function ProfilePage({ person, permissions, standalone }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  async function handleLogout() {
    await fetch("/api/platform/logout", { method: "POST", credentials: "same-origin" }).catch(() => null);
    window.location.reload();
  }

  useEffect(() => {
    if (!person?.id) return;
    platformApi.person(person.id).then((res) => setProfile(res.person)).catch((err) => setError(err.message));
  }, [person?.id]);

  const p = profile || person;

  return (
    <div className="portal-page">
      <PageHeader title="Meu Perfil" subtitle="Dados oficiais da Plataforma" />
      {error && <p className="portal-error">{error}</p>}
      <PlaceholderCard>
        <dl className="portal-dl">
          <div><dt>Nome</dt><dd>{p?.name || "—"}</dd></div>
          <div><dt>E-mail</dt><dd>{p?.email || "—"}</dd></div>
          <div><dt>Telefone</dt><dd>{p?.phone || p?.mobile || "—"}</dd></div>
          <div><dt>Situação</dt><dd>{labelStatus(p?.status)}</dd></div>
        </dl>
      </PlaceholderCard>
      <PlaceholderCard title="Permissões ativas">
        <ul className="portal-tag-list">
          {(permissions || []).slice(0, 12).map((perm) => (
            <li key={perm.id || perm.code}>{labelPermission(perm.name) || perm.code}</li>
          ))}
          {(permissions || []).length === 0 && <li className="portal-muted">Nenhuma permissão carregada.</li>}
        </ul>
      </PlaceholderCard>
      {standalone && (
        <div className="portal-page-actions">
          <button type="button" className="button ghost" onClick={handleLogout}>
            Sair do Portal
          </button>
        </div>
      )}
    </div>
  );
}
