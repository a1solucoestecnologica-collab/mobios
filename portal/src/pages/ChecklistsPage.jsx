import { PageHeader, PlaceholderCard, MockNotice } from "../components/PageParts.jsx";
import { MOCK_CHECKLISTS } from "../assets/mockData.js";

export default function ChecklistsPage() {
  return (
    <div className="portal-page">
      <PageHeader title="Meus Checklists" subtitle="Execução via MÖBI WorkMaps" />
      <MockNotice>Checklists simulados — o Portal apenas executa via API do WorkMaps.</MockNotice>
      <PlaceholderCard>
        <ul className="portal-list portal-list--cards">
          {MOCK_CHECKLISTS.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <span className="portal-pill">{item.progress}</span>
            </li>
          ))}
        </ul>
      </PlaceholderCard>
    </div>
  );
}
