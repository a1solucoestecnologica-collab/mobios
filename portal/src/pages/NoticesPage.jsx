import { useEffect, useState } from "react";
import { PageHeader, PlaceholderCard } from "../components/PageParts.jsx";
import { timeApi } from "../services/api.js";

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [error, setError] = useState("");

  function load() {
    timeApi.notices.list().then((d) => setNotices(d.notices || [])).catch((e) => setError(e.message));
  }

  useEffect(() => { load(); }, []);

  async function markRead(id) {
    try {
      await timeApi.notices.read(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="portal-page">
      <PageHeader title="Avisos" subtitle="Comunicados da empresa" />
      {error && <p className="portal-error">{error}</p>}
      <PlaceholderCard>
        <ul className="portal-list portal-list--cards">
          {notices.length === 0 ? <li>Nenhum comunicado ativo.</li> : notices.map((notice) => (
            <li key={notice.id} className={!notice.read ? "is-unread" : ""}>
              <strong>{notice.title}</strong>
              <p>{notice.message}</p>
              {!notice.read && (
                <button type="button" className="button ghost portal-action-btn--compact" onClick={() => markRead(notice.id)}>Marcar como lido</button>
              )}
              {notice.pinned && <em className="portal-pill portal-pill--accent">Fixado</em>}
            </li>
          ))}
        </ul>
      </PlaceholderCard>
    </div>
  );
}
