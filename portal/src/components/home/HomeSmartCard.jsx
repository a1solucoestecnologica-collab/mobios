export default function HomeSmartCard({ icon, title, value, hint, onClick, variant = "default", badge }) {
  const Tag = onClick ? "button" : "article";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`portal-smart-card portal-smart-card--${variant}`}
      onClick={onClick}
    >
      <div className="portal-smart-card-top">
        <span className="portal-smart-card-icon" aria-hidden="true">{icon}</span>
        {badge != null && badge > 0 && <span className="portal-smart-card-badge">{badge}</span>}
      </div>
      <strong className="portal-smart-card-title">{title}</strong>
      {value && <span className="portal-smart-card-value">{value}</span>}
      {hint && <small className="portal-smart-card-hint">{hint}</small>}
    </Tag>
  );
}
