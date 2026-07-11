export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="portal-page-header">
      <div>
        <h1 className="portal-page-header-title">{title}</h1>
        {subtitle && <p className="portal-page-header-sub">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function PlaceholderCard({ title, children, variant = "default" }) {
  return (
    <article className={`portal-card portal-card--${variant}`}>
      {title && <h2>{title}</h2>}
      {children}
    </article>
  );
}

export function MockNotice({ children }) {
  return <p className="portal-mock-notice">{children}</p>;
}

export function StatRow({ items }) {
  return (
    <div className="portal-stat-row">
      {items.map((item) => (
        <div key={item.label} className="portal-stat">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
