import { useEffect, useState } from "react";
import { PageHeader, PlaceholderCard } from "../components/PageParts.jsx";
import { timeApi } from "../services/api.js";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");

  function load() {
    timeApi.documents.list().then((d) => setDocuments(d.documents || [])).catch((e) => setError(e.message));
  }

  useEffect(() => { load(); }, []);

  async function confirmRead(id) {
    try {
      await timeApi.documents.read(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="portal-page">
      <PageHeader title="Meus Documentos" subtitle="Contratos, holerites e avisos" />
      {error && <p className="portal-error">{error}</p>}
      <PlaceholderCard>
        <ul className="portal-list portal-list--cards">
          {documents.length === 0 ? <li>Nenhum documento disponível.</li> : documents.map((doc) => (
            <li key={doc.id}>
              <strong>{doc.label || doc.fileName}</strong>
              <span className="portal-pill">{doc.category}</span>
              {doc.filePath && (
                <a className="portal-link" href={doc.filePath} target="_blank" rel="noreferrer">Baixar</a>
              )}
              {doc.requiresAck && !doc.read && (
                <button type="button" className="button ghost portal-action-btn--compact" onClick={() => confirmRead(doc.id)}>Confirmar leitura</button>
              )}
              {doc.read && <em className="portal-pill">Lido</em>}
            </li>
          ))}
        </ul>
      </PlaceholderCard>
    </div>
  );
}
