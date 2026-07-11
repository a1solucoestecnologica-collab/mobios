import { useMemo } from "react";
import { PORTAL_LAUNCHER_ICON_CLASS } from "../routes/iconStyles.js";

export default function PortalAppLauncher({ person, routes, onNavigate }) {
  const firstName = person?.name?.split(" ")[0] || "Colaborador";

  const apps = useMemo(
    () => routes.filter((route) => route.id !== "home" && route.id !== "profile"),
    [routes],
  );

  return (
    <div className="portal-launcher-view">
      <div className="launcher-inner portal-launcher-inner">
        <header className="launcher-head">
          <p className="launcher-eyebrow">MÖBI Portal</p>
          <h1>Olá, {firstName}</h1>
          <p className="launcher-sub">Toque em um aplicativo para abrir</p>
        </header>

        <div className="launcher-grid portal-launcher-grid">
          {apps.map((route) => {
            const label = route.shortLabel || route.label;
            return (
              <button
                key={route.id}
                type="button"
                className="launcher-app"
                onClick={() => onNavigate(route.id)}
                aria-label={`Abrir ${route.label}`}
              >
                <span
                  className={`launcher-icon ${PORTAL_LAUNCHER_ICON_CLASS[route.id] || "launcher-icon-portal"}`}
                  aria-hidden="true"
                >
                  <span className="portal-launcher-emoji">{route.icon}</span>
                </span>
                <span className="launcher-label">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
