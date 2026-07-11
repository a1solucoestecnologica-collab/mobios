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

export const pontoApi = {
  login: (email, password) =>
    request("/api/ponto/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request("/api/ponto/logout", { method: "POST" }),
  me: () => request("/api/ponto/me"),
  dashboard: () => request("/api/ponto/dashboard"),
  settings: {
    get: () => request("/api/ponto/settings"),
    save: (body) => request("/api/ponto/settings", { method: "PUT", body: JSON.stringify(body) }),
  },
  schedules: {
    list: () => request("/api/ponto/schedules"),
    create: (body) => request("/api/ponto/schedules", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/api/ponto/schedules/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id) => request(`/api/ponto/schedules/${id}`, { method: "DELETE" }),
  },
  employees: {
    list: () => request("/api/ponto/employees"),
    get: (id) => request(`/api/ponto/employees/${id}`),
    update: (id, body) => request(`/api/ponto/employees/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  },
  timeEmployees: {
    list: () => request("/api/ponto/time-employees"),
    link: (body) => request("/api/ponto/time-employees", { method: "POST", body: JSON.stringify(body) }),
    update: (personId, body) =>
      request(`/api/ponto/time-employees/${personId}`, { method: "PUT", body: JSON.stringify(body) }),
    getByPerson: (personId) => request(`/api/ponto/time-employees/by-person/${personId}`),
  },
  punch: {
    status: () => request("/api/ponto/punch/status"),
    register: (photoData) =>
      request("/api/ponto/punch", { method: "POST", body: JSON.stringify({ photoData }) }),
  },
  records: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/api/ponto/records${q ? `?${q}` : ""}`);
    },
    adjust: (id, body) =>
      request(`/api/ponto/records/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    createManual: (body) =>
      request("/api/ponto/records/manual", { method: "POST", body: JSON.stringify(body) }),
  },
  timesheet: (params) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/ponto/timesheet?${q}`);
  },
  hourBank: (employeeId) => {
    const q = employeeId ? `?employeeId=${employeeId}` : "";
    return request(`/api/ponto/hour-bank${q}`);
  },
  reports: (type, params) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/ponto/reports/${type}?${q}`);
  },
  shiftPlans: {
    list: () => request("/api/ponto/shift-plans"),
    get: (id) => request(`/api/ponto/shift-plans/${id}`),
    create: (body) => request("/api/ponto/shift-plans", { method: "POST", body: JSON.stringify(body) }),
  },
  onboarding: () => Promise.reject(new Error("Depreciado. Use o Wizard Novo Colaborador na Platform (Admin → Pessoas).")),
  readiness: (employeeId) => request(`/api/ponto/employees/${employeeId}/readiness`),
  adjustments: {
    list: (status) => {
      const q = status ? `?status=${encodeURIComponent(status)}` : "";
      return request(`/api/ponto/adjustment-requests${q}`);
    },
    approve: (id, adminNote) =>
      request(`/api/ponto/adjustment-requests/${id}/approve`, { method: "POST", body: JSON.stringify({ adminNote }) }),
    reject: (id, adminNote) =>
      request(`/api/ponto/adjustment-requests/${id}/reject`, { method: "POST", body: JSON.stringify({ adminNote }) }),
  },
  competences: {
    list: () => request("/api/ponto/competences"),
    create: (body) => request("/api/ponto/competences", { method: "POST", body: JSON.stringify(body) }),
    close: (id) => request(`/api/ponto/competences/${id}/close`, { method: "POST", body: "{}" }),
    reopen: (id) => request(`/api/ponto/competences/${id}/reopen`, { method: "POST", body: "{}" }),
  },
  notices: {
    list: () => request("/api/ponto/notices"),
    create: (body) => request("/api/ponto/notices", { method: "POST", body: JSON.stringify(body) }),
  },
  documents: {
    list: (employeeId) => {
      const q = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : "";
      return request(`/api/ponto/documents${q}`);
    },
    upload: (body) => request("/api/ponto/documents", { method: "POST", body: JSON.stringify(body) }),
  },
  operationalDashboard: () => request("/api/ponto/operational-dashboard"),
  profile: {
    get: () => request("/api/ponto/profile"),
    changePassword: (body) =>
      request("/api/ponto/profile/password", { method: "PUT", body: JSON.stringify(body) }),
  },
};
