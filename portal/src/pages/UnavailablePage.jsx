export default function UnavailablePage({ title = "Em preparação", message }) {
  return (
    <div className="portal-page portal-unavailable">
      <h2>{title}</h2>
      <p>{message || "Este recurso ainda não possui API oficial integrada ao Portal."}</p>
      <p className="portal-muted">Os dados exibidos aqui não estão disponíveis em produção.</p>
    </div>
  );
}
