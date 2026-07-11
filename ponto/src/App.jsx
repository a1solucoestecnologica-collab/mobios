import { useEffect, useState } from "react";
import Layout from "./Layout.jsx";
import { TopbarActionsContext } from "./topbar.js";
import {
  DashboardView,
  EmployeesView,
  RecordsView,
  ReportsView,
  SchedulesView,
  SettingsView,
  TimesheetView,
} from "./AdminViews.jsx";
import {
  AdjustmentsView,
  CompetencesView,
  DocumentsView,
  EmployeeStatusView,
  NoticesView,
  ShiftPlansView,
} from "./OperationalViews.jsx";

const PAGE_META = {
  dashboard: {
    title: "Painel",
    subtitle: "Visão geral operacional do MÖBI Time.",
  },
  employees: {
    title: "Gestão operacional",
    subtitle: "Jornada, escala e status — cadastro de pessoa na Platform.",
  },
  employeeStatus: {
    title: "Status do colaborador",
    subtitle: "Verifique o que falta antes de liberar o Portal.",
  },
  shiftPlans: {
    title: "Escalas",
    subtitle: "Quando cada jornada será utilizada.",
  },
  adjustments: {
    title: "Solicitações",
    subtitle: "Aprovar ou rejeitar ajustes de ponto.",
  },
  competences: {
    title: "Competências",
    subtitle: "Abrir, fechar e reabrir períodos.",
  },
  notices: {
    title: "Comunicados",
    subtitle: "Avisos para colaboradores no Portal.",
  },
  documents: {
    title: "Documentos",
    subtitle: "Contratos, holerites e avisos.",
  },
  settings: {
    title: "Configurações",
    subtitle: "Dados da empresa e tolerância padrão.",
  },
  schedules: {
    title: "Jornadas",
    subtitle: "Horários de entrada, almoço e saída.",
  },
  records: {
    title: "Registros",
    subtitle: "Histórico e correções com auditoria.",
  },
  timesheet: {
    title: "Espelho de Ponto",
    subtitle: "Consulta por funcionário e período.",
  },
  reports: {
    title: "Relatórios",
    subtitle: "Atrasos, faltas, horas extras e exportação.",
  },
};

export default function App({ onRegisterNavigate }) {
  const [view, setView] = useState("dashboard");
  const [topbarActions, setTopbarActions] = useState(null);

  function navigate(nextView) {
    setView(nextView);
    document.querySelectorAll("[data-ponto-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.pontoView === nextView);
    });
  }

  useEffect(() => {
    onRegisterNavigate?.(navigate);
  }, [onRegisterNavigate]);

  const meta = PAGE_META[view] || PAGE_META.dashboard;

  return (
    <TopbarActionsContext.Provider value={setTopbarActions}>
      <Layout>
        <header className="topbar">
          <div>
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
          </div>
          {topbarActions && <div className="topbar-actions">{topbarActions}</div>}
        </header>

        {view === "dashboard" && <DashboardView onNavigate={navigate} />}
        {view === "employees" && <EmployeesView />}
        {view === "employeeStatus" && <EmployeeStatusView />}
        {view === "shiftPlans" && <ShiftPlansView />}
        {view === "adjustments" && <AdjustmentsView />}
        {view === "competences" && <CompetencesView />}
        {view === "notices" && <NoticesView />}
        {view === "documents" && <DocumentsView />}
        {view === "schedules" && <SchedulesView />}
        {view === "records" && <RecordsView />}
        {view === "timesheet" && <TimesheetView />}
        {view === "reports" && <ReportsView />}
        {view === "settings" && <SettingsView />}
      </Layout>
    </TopbarActionsContext.Provider>
  );
}
