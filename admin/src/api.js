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

export const adminApi = {
  me: () => request("/api/admin/me"),
  dashboard: () => request("/api/admin/dashboard"),
  settings: {
    get: () => request("/api/admin/settings"),
    save: (body) => request("/api/admin/settings", { method: "PUT", body: JSON.stringify(body) }),
  },
  applications: () => request("/api/admin/applications"),
  users: {
    list: () => request("/api/admin/users"),
    create: (body) => request("/api/admin/users", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id) => request(`/api/admin/users/${id}`, { method: "DELETE" }),
  },
  roles: {
    list: () => request("/api/admin/roles"),
    create: (body) => request("/api/admin/roles", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/api/admin/roles/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id) => request(`/api/admin/roles/${id}`, { method: "DELETE" }),
  },
  permissions: {
    list: () => request("/api/admin/permissions"),
  },
  platformRoles: {
    list: () => request("/api/admin/platform/roles"),
    create: (body) => request("/api/admin/platform/roles", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/api/admin/platform/roles/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id) => request(`/api/admin/platform/roles/${id}`, { method: "DELETE" }),
    getPermissions: (id) => request(`/api/admin/platform/roles/${id}/permissions`),
    savePermissions: (id, permissionIds) =>
      request(`/api/admin/platform/roles/${id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissionIds }),
      }),
  },
  departments: {
    list: () => request("/api/admin/departments"),
    create: (body) => request("/api/admin/departments", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/api/admin/departments/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id) => request(`/api/admin/departments/${id}`, { method: "DELETE" }),
  },
  auditLogs: () => request("/api/admin/audit-logs"),
  sessions: () => request("/api/admin/sessions"),
  platform: {
    person: () => request("/api/admin/platform/person"),
    accessibleApps: (personId) => {
      const q = personId ? `?personId=${encodeURIComponent(personId)}` : "";
      return request(`/api/admin/platform/accessible-apps${q}`);
    },
    architecture: () => request("/api/admin/platform/architecture"),
  },
  people: {
    list: () => request("/api/admin/platform/people"),
    get: (id) => request(`/api/admin/platform/people/${id}`),
    create: (body) => request("/api/admin/platform/people", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/api/admin/platform/people/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id) => request(`/api/admin/platform/people/${id}`, { method: "DELETE" }),
    addAttachment: (id, body) =>
      request(`/api/admin/platform/people/${id}/attachments`, { method: "POST", body: JSON.stringify(body) }),
    removeAttachment: (personId, attachId) =>
      request(`/api/admin/platform/people/${personId}/attachments/${attachId}`, { method: "DELETE" }),
  },
  timeEmployees: {
    link: (body) => request("/api/ponto/time-employees", { method: "POST", body: JSON.stringify(body) }),
    update: (personId, body) =>
      request(`/api/ponto/time-employees/${personId}`, { method: "PUT", body: JSON.stringify(body) }),
    getByPerson: (personId) => request(`/api/ponto/time-employees/by-person/${personId}`),
  },
};
