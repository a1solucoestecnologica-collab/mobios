export default function HomeHeroAction({ action, loading, onAction, disabled }) {
  if (!action) return null;

  return (
    <section className="portal-home-hero">
      <button
        type="button"
        className="portal-home-hero-btn"
        onClick={onAction}
        disabled={disabled || loading}
      >
        <span className="portal-home-hero-icon" aria-hidden="true">⏰</span>
        <span className="portal-home-hero-label">{loading ? "Registrando…" : action.label}</span>
      </button>
      <p className="portal-home-hero-hint">Ação enviada ao MÖBI Time</p>
    </section>
  );
}
