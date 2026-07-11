import { useEffect, useState } from "react";
import { PageHeader, PlaceholderCard, MockNotice } from "../components/PageParts.jsx";
import { MOCK_TASKS } from "../assets/mockData.js";
import { workmapsApi } from "../services/api.js";

export default function TasksPage() {
  const [apiOk, setApiOk] = useState(false);

  useEffect(() => {
    workmapsApi.collaborators().then(() => setApiOk(true)).catch(() => setApiOk(false));
  }, []);

  return (
    <div className="portal-page">
      <PageHeader title="Minhas Tarefas" subtitle="Execução via MÖBI WorkMaps" />
      {!apiOk && <MockNotice>Lista simulada — consumo via /api/planner/*</MockNotice>}
      <PlaceholderCard>
        <ul className="portal-list portal-list--cards">
          {MOCK_TASKS.map((task) => (
            <li key={task.id}>
              <strong>{task.title}</strong>
              <span className="portal-pill">{task.status}</span>
            </li>
          ))}
        </ul>
      </PlaceholderCard>
    </div>
  );
}
