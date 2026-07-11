export default function PortalLayout({
  view,
  onNavigate,
  allowedRoutes,
  children,
  person,
}) {
  const initials = (person?.name || "C")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isHome = view === "home";
  const currentRoute = allowedRoutes.find((r) => r.id === view);
  const pageTitle = currentRoute?.label || "Portal";

  return (
    <div className="portal-device-shell">
      <div className={`portal-app ${isHome ? "portal-app--launcher" : "portal-app--screen"}`}>
        {isHome ? (
          <button
            type="button"
            className="portal-launcher-profile"
            onClick={() => onNavigate("profile")}
            aria-label="Meu perfil"
          >
            <span className="portal-avatar">{initials}</span>
          </button>
        ) : (
          <header className="portal-ios-navbar">
            <div className="portal-ios-navbar-start">
              <button
                type="button"
                className="portal-ios-back"
                onClick={() => onNavigate("home")}
                aria-label="Voltar para aplicativos"
              >
                ‹ Apps
              </button>
            </div>
            <div className="portal-ios-navbar-title">
              <span className="portal-ios-navbar-page">{pageTitle}</span>
            </div>
            <button
              type="button"
              className="portal-avatar-btn"
              onClick={() => onNavigate("profile")}
              aria-label="Meu perfil"
            >
              <span className="portal-avatar">{initials}</span>
            </button>
          </header>
        )}

        <main className="portal-main portal-ios-content">{children}</main>
      </div>
    </div>
  );
}
