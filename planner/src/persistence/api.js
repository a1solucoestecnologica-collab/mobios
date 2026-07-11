// Camada de persistencia. Unico ponto que fala com o backend.
// A engine e a interface nunca chamam fetch diretamente.

const BASE = "/api/planner";

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    ...options,
  });
  if (!response.ok) {
    let message = `Erro ${response.status}`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      /* mantem mensagem padrao */
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const plannerApi = {
  listMaps: (collaboratorId) =>
    request(collaboratorId ? `/maps?collaboratorId=${encodeURIComponent(collaboratorId)}` : "/maps"),
  createMap: (payload) => request("/maps", { method: "POST", body: JSON.stringify(payload) }),
  getMap: (id) => request(`/maps/${id}`),
  saveMap: (id, payload) => request(`/maps/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteMap: (id) => request(`/maps/${id}`, { method: "DELETE" }),

  listCollaborators: () => request("/collaborators"),
  getCollaboratorExecution: (collaboratorId) => request(`/collaborators/${collaboratorId}/execution`),

  createExecution: (payload) => request("/executions", { method: "POST", body: JSON.stringify(payload) }),
  getExecution: (id) => request(`/executions/${id}`),
  updateExecutionBlock: (executionBlockId, status) =>
    request(`/execution-blocks/${executionBlockId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  listComments: (blockId) => request(`/blocks/${blockId}/comments`),
  addComment: (blockId, payload) =>
    request(`/blocks/${blockId}/comments`, { method: "POST", body: JSON.stringify(payload) }),
};
