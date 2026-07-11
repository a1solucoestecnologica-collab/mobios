async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error(data.error || "Sessão expirada.");
  if (!response.ok) throw new Error(data.error || "Erro na API.");
  return data;
}

/** Platform — identidade e autorização (fonte única). */
export const platformApi = {
  identity: () => request("/api/platform/identity"),
  permissions: (personId) => {
    const q = personId ? `?personId=${encodeURIComponent(personId)}` : "";
    return request(`/api/platform/authorization/permissions${q}`);
  },
  accessibleApps: (personId) => {
    const q = personId ? `?personId=${encodeURIComponent(personId)}` : "";
    return request(`/api/platform/authorization/accessible-apps${q}`);
  },
  person: (id) => request(`/api/platform/people/${id}`),
  sessions: () => request("/api/platform/sessions"),
};

/** MÖBI Time — regras de ponto permanecem no Time. */
export const timeApi = {
  punchStatus: () => request("/api/ponto/punch/status"),
  punch: () => request("/api/ponto/punch", { method: "POST", body: "{}" }),
  timesheet: (month) => {
    const q = month ? `?month=${encodeURIComponent(month)}` : "";
    return request(`/api/ponto/timesheet${q}`);
  },
  hourBank: () => request("/api/ponto/hour-bank"),
  profile: () => request("/api/ponto/profile"),
  scheduleToday: () => request("/api/ponto/schedule/today"),
  scheduleRange: (startDate, endDate) => {
    const q = new URLSearchParams({ startDate, endDate }).toString();
    return request(`/api/ponto/schedule/range?${q}`);
  },
  adjustments: {
    list: () => request("/api/ponto/adjustment-requests"),
    create: (body) => request("/api/ponto/adjustment-requests", { method: "POST", body: JSON.stringify(body) }),
    cancel: (id) => request(`/api/ponto/adjustment-requests/${id}/cancel`, { method: "POST", body: "{}" }),
  },
  notices: {
    list: () => request("/api/ponto/notices"),
    read: (id) => request(`/api/ponto/notices/${id}/read`, { method: "POST", body: "{}" }),
  },
  documents: {
    list: () => request("/api/ponto/documents"),
    read: (id) => request(`/api/ponto/documents/${id}/read`, { method: "POST", body: "{}" }),
  },
};

/** MÖBI WorkMaps — tarefas e execução permanecem no WorkMaps. */
export const workmapsApi = {
  collaborators: () => request("/api/planner/collaborators"),
  portalSummary: () => request("/api/planner/portal/summary"),
};

export const portalApi = {
  health: () => request("/api/portal/health"),
};
