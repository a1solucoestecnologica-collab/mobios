import { useCallback, useEffect, useMemo, useState } from "react";
import PortalLayout from "./layouts/PortalLayout.jsx";
import { DEFAULT_VIEW, PORTAL_ROUTES, filterRoutesByPermissions } from "./routes/index.js";
import { PORTAL_DEMO_MODE } from "./config.js";
import { platformApi } from "./services/api.js";
import PortalAppLauncher from "./pages/PortalAppLauncher.jsx";
import PunchPage from "./pages/PunchPage.jsx";
import TimesheetPage from "./pages/TimesheetPage.jsx";
import HourBankPage from "./pages/HourBankPage.jsx";
import SchedulePage from "./pages/SchedulePage.jsx";
import TasksPage from "./pages/TasksPage.jsx";
import ChecklistsPage from "./pages/ChecklistsPage.jsx";
import DocumentsPage from "./pages/DocumentsPage.jsx";
import RequestsPage from "./pages/RequestsPage.jsx";
import NoticesPage from "./pages/NoticesPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

const PAGE_MAP = {
  home: PortalAppLauncher,
  punch: PunchPage,
  timesheet: TimesheetPage,
  "hour-bank": HourBankPage,
  schedule: SchedulePage,
  tasks: TasksPage,
  checklists: ChecklistsPage,
  documents: DocumentsPage,
  requests: RequestsPage,
  notices: NoticesPage,
  profile: ProfilePage,
};

export default function App({ onRegisterNavigate, standalone = false, onSessionExpired }) {
  const [view, setView] = useState(DEFAULT_VIEW);
  const [person, setPerson] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useCallback((next) => {
    setView(next);
  }, []);

  useEffect(() => {
    onRegisterNavigate?.(navigate);
  }, [onRegisterNavigate, navigate]);

  useEffect(() => {
    platformApi
      .identity()
      .then((identityRes) => {
        const p = identityRes.person;
        setPerson(p);
        setPermissions(identityRes.permissions || []);
      })
      .catch((err) => {
        setError(err.message);
        if (standalone && /sessão|expirad|401/i.test(err.message)) {
          onSessionExpired?.();
        }
      })
      .finally(() => setLoading(false));
  }, [standalone, onSessionExpired]);

  const allowedRoutes = useMemo(
    () => filterRoutesByPermissions(PORTAL_ROUTES, permissions.map((x) => x.code), { demoMode: PORTAL_DEMO_MODE }),
    [permissions],
  );

  const Page = PAGE_MAP[view] || PortalAppLauncher;
  const canView = allowedRoutes.some((r) => r.id === view);

  if (loading) {
    return <div className="portal-loading">Carregando Portal…</div>;
  }

  if (error && !person) {
    return (
      <div className="portal-error-screen">
        <h2>Portal indisponível</h2>
        <p>{error}</p>
        <p className="portal-muted">Verifique se você possui a permissão de acesso ao Portal na Plataforma.</p>
      </div>
    );
  }

  if (allowedRoutes.length === 0) {
    return (
      <div className="portal-error-screen">
        <h2>Sem acesso ao Portal</h2>
        <p>Solicite ao administrador a permissão <code>portal.access</code>.</p>
      </div>
    );
  }

  return (
    <PortalLayout
      view={view}
      onNavigate={navigate}
      allowedRoutes={allowedRoutes}
      person={person}
    >
      {PORTAL_DEMO_MODE && <div className="portal-demo-banner">Modo demonstração — dados podem ser simulados</div>}
      {canView ? (
        <Page
          person={person}
          permissions={permissions}
          routes={allowedRoutes}
          onNavigate={navigate}
          standalone={standalone}
        />
      ) : (
        <div className="portal-page">
          <p>Você não tem permissão para esta tela.</p>
        </div>
      )}
    </PortalLayout>
  );
}
