import { useEffect, useState } from "react";
import Layout from "./Layout.jsx";
import { TopbarActionsContext } from "./topbar.js";
import {
  ApplicationsView,
  AuditView,
  DashboardView,
  DepartmentsView,
  PermissionsView,
  PlatformArchitectureView,
  RolesView,
  SessionsView,
  SettingsView,
  UsersView,
} from "./AdminViews.jsx";
import { PeopleView } from "./PeopleView.jsx";
import CollaboratorWizard from "./CollaboratorWizard.jsx";

const PAGE_META = {
  dashboard: {
    title: "Painel",
    subtitle: "Visão geral da administração da plataforma MÖBI OS.",
  },
  platform: {
    title: "Arquitetura da Plataforma",
    subtitle: "Componentes oficiais de identidade, autorização e governança.",
  },
  people: {
    title: "Pessoas",
    subtitle: "Cadastro oficial de pessoas do MÖBI OS — fonte única para todos os aplicativos.",
  },
  collaboratorWizard: {
    title: "Novo Colaborador",
    subtitle: "Wizard oficial da Plataforma — identidade e configuração dos aplicativos.",
  },
  users: {
    title: "Usuários (legado)",
    subtitle: "Cadastro temporário em admin_users — use Pessoas como fonte oficial.",
  },
  roles: {
    title: "Funções",
    subtitle: "Papéis oficiais da plataforma (quem é o quê no MÖBI OS).",
  },
  permissions: {
    title: "Permissões",
    subtitle: "Escolha a função e marque o que ela pode fazer.",
  },
  departments: {
    title: "Departamentos",
    subtitle: "Organização interna da plataforma.",
  },
  applications: {
    title: "Aplicativos",
    subtitle: "Módulos disponíveis no MÖBI OS.",
  },
  audit: {
    title: "Auditoria",
    subtitle: "Registro de ações na plataforma.",
  },
  sessions: {
    title: "Sessões",
    subtitle: "Sessões ativas do domínio Admin.",
  },
  settings: {
    title: "Configurações",
    subtitle: "Parâmetros gerais da plataforma.",
  },
};

export default function App({ onRegisterNavigate }) {
  const [view, setView] = useState("dashboard");
  const [topbarActions, setTopbarActions] = useState(null);
  const [personEditId, setPersonEditId] = useState(null);

  function navigate(nextView) {
    setView(nextView);
    document.querySelectorAll("[data-admin-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.adminView === nextView);
    });
  }

  useEffect(() => {
    onRegisterNavigate?.(navigate);
    const pending = sessionStorage.getItem("moble_admin_initial_view");
    if (pending) {
      navigate(pending);
      sessionStorage.removeItem("moble_admin_initial_view");
    }
    const pid = sessionStorage.getItem("moble_admin_person_edit");
    if (pid) {
      setPersonEditId(pid);
      sessionStorage.removeItem("moble_admin_person_edit");
    }
  }, [onRegisterNavigate]);

  const meta = PAGE_META[view] || PAGE_META.dashboard;

  return (
    <TopbarActionsContext.Provider value={setTopbarActions}>
      <Layout>
        {view !== "collaboratorWizard" ? (
          <header className="topbar">
            <div>
              <h1>{meta.title}</h1>
              <p>{meta.subtitle}</p>
            </div>
            {topbarActions && <div className="topbar-actions">{topbarActions}</div>}
          </header>
        ) : null}

        {view === "dashboard" && <DashboardView />}
        {view === "platform" && <PlatformArchitectureView />}
        {view === "people" && (
          <PeopleView
            onOpenWizard={() => navigate("collaboratorWizard")}
            initialPersonId={personEditId}
          />
        )}
        {view === "collaboratorWizard" && (
          <CollaboratorWizard
            onCancel={() => navigate("people")}
            onDone={() => {
              const ret = sessionStorage.getItem("moble_wizard_return");
              if (ret) {
                try {
                  const { product, view: retView } = JSON.parse(ret);
                  sessionStorage.removeItem("moble_wizard_return");
                  if (product === "ponto") {
                    window.openProduct?.("ponto");
                    setTimeout(() => window.MoobleTime?.navigate?.(retView || "employees"), 80);
                    return;
                  }
                } catch { /* ignore */ }
              }
              navigate("people");
            }}
          />
        )}
        {view === "users" && <UsersView />}
        {view === "roles" && <RolesView />}
        {view === "permissions" && <PermissionsView />}
        {view === "departments" && <DepartmentsView />}
        {view === "applications" && <ApplicationsView />}
        {view === "audit" && <AuditView />}
        {view === "sessions" && <SessionsView />}
        {view === "settings" && <SettingsView />}
      </Layout>
    </TopbarActionsContext.Provider>
  );
}
