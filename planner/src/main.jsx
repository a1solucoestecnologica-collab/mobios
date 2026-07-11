// MÖBI WorkMaps — ponto de integração com o Shell (window.MooblePlanner).
// Arquitetura oficial: /docs/BIBLIA_MOBI_OS.md
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@xyflow/react/dist/style.css";
import "./planner.css";
import AdminApp from "./interface/AdminApp.jsx";
import CollaboratorApp from "./interface/CollaboratorApp.jsx";

// Ponto de integracao com a pagina existente (app vanilla).
// O shell chama window.MooblePlanner.mount(...) quando a aba Planner abre.
const roots = new WeakMap();

function mount(element, Component) {
  if (!element) return;
  let root = roots.get(element);
  if (!root) {
    root = createRoot(element);
    roots.set(element, root);
  }
  root.render(
    <StrictMode>
      <Component />
    </StrictMode>,
  );
}

window.MooblePlanner = {
  mountAdmin: (element) => mount(element, AdminApp),
  mountCollaborator: (element) => mount(element, CollaboratorApp),
  unmount: (element) => {
    const root = roots.get(element);
    if (root) {
      root.unmount();
      roots.delete(element);
    }
  },
};
