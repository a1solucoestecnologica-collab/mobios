import { useCallback, useEffect, useState } from "react";
import { useTopbarActions } from "./topbar.js";
import { adminApi } from "./api.js";

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function DashboardView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="admin-error">{error}</p>;
  if (!data) return <p>Carregando...</p>;

  return (
    <section className="metrics-grid" aria-label="Indicadores">
      <article className="metric-card"><span>Pessoas</span><strong>{data.users}</strong></article>
      <article className="metric-card"><span>Funções</span><strong>{data.roles}</strong></article>
      <article className="metric-card"><span>Departamentos</span><strong>{data.departments}</strong></article>
      <article className="metric-card warning"><span>Aplicativos</span><strong>{data.applications}</strong></article>
      <article className="metric-card muted"><span>Sessões</span><strong>{data.sessions}</strong></article>
      <article className="metric-card muted"><span>Auditoria</span><strong>{data.auditLogs}</strong></article>
    </section>
  );
}

const emptyUser = { name: "", email: "", password: "", roleId: "", departmentId: "", active: true };

// TODO: Migrar futuramente para a entidade única "people".
// Cadastro temporário em admin_users — compatibilidade com a plataforma atual.

export function UsersView() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    Promise.all([adminApi.users.list(), adminApi.roles.list(), adminApi.departments.list()])
      .then(([u, r, d]) => {
        setUsers(u.users);
        setRoles(r.roles);
        setDepartments(d.departments);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  useTopbarActions(
    <button type="button" className="button primary" onClick={() => setForm({ ...emptyUser })}>Novo usuário</button>,
    [],
  );

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        name: form.name,
        email: form.email,
        roleId: form.roleId || null,
        departmentId: form.departmentId || null,
        active: form.active,
      };
      if (form.password) payload.password = form.password;
      if (form.id) await adminApi.users.update(form.id, payload);
      else await adminApi.users.create(payload);
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeUser(id) {
    if (!window.confirm("Excluir este usuário?")) return;
    setError("");
    try {
      await adminApi.users.remove(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Panel title="Usuários" subtitle="Cadastro temporário (legado). Futura migração para a entidade única people.">
        {error && <p className="admin-error admin-panel-msg">{error}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Nome</th><th>E-mail</th><th>Função</th><th>Departamento</th><th>Status</th><th className="actions-col">Ações</th></tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6}>Nenhum usuário cadastrado.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.roleName}</td>
                    <td>{user.departmentName}</td>
                    <td><span className={`status-pill ${user.active ? "ok" : "muted"}`}>{user.active ? "Ativo" : "Inativo"}</span></td>
                    <td>
                      <button type="button" className="button ghost" onClick={() => setForm({ ...user, password: "" })}>Editar</button>
                      {" "}
                      <button type="button" className="button ghost" onClick={() => removeUser(user.id)}>Excluir</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {form && (
        <dialog className="modal" open>
          <form className="modal-card" onSubmit={save}>
            <div className="modal-header">
              <h2>{form.id ? "Editar usuário" : "Novo usuário"}</h2>
              <button type="button" className="icon-button" onClick={() => setForm(null)}>×</button>
            </div>
            <div className="form-grid">
              <label>Nome<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label>E-mail<input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
              <label>Senha<input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={form.id ? "Deixe em branco para manter" : "Opcional"} /></label>
              <label>Função
                <select className="input" value={form.roleId || ""} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                  <option value="">Selecionar</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
              <label>Departamento
                <select className="input" value={form.departmentId || ""} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                  <option value="">Selecionar</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              {form.id && (
                <label>Status
                  <select className="input" value={form.active ? "1" : "0"} onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}>
                    <option value="1">Ativo</option>
                    <option value="0">Inativo</option>
                  </select>
                </label>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="button primary">Salvar</button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}

const emptyRole = { name: "", description: "" };

const APP_LABELS = {
  launcher: "Dashboard",
  tools: "MÖBI Tools",
  planner: "MÖBI WorkMaps",
  time: "MÖBI Time",
  admin: "MÖBI Admin",
  portal: "Portal do Colaborador",
  crm: "CRM",
  finance: "Financeiro",
  ai: "IA",
};

function appLabel(slug) {
  return APP_LABELS[slug] || slug;
}

export function RolesView() {
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    adminApi.platformRoles.list().then((r) => setRoles(r.roles)).catch((err) => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  useTopbarActions(
    <button type="button" className="button primary" onClick={() => setForm({ ...emptyRole })}>Nova função</button>,
    [],
  );

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      if (form.id) await adminApi.platformRoles.update(form.id, form);
      else await adminApi.platformRoles.create(form);
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeRole(id, system) {
    if (system) {
      setError("Funções de sistema não podem ser excluídas.");
      return;
    }
    if (!window.confirm("Excluir esta função?")) return;
    try {
      await adminApi.platformRoles.remove(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Panel title="Funções da plataforma" subtitle="Cadastre papéis (ex.: Operador, Gestor, RH). Depois defina as permissões na tela Permissões.">
        {error && <p className="admin-error admin-panel-msg">{error}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Nome</th><th>Descrição</th><th>Tipo</th><th className="actions-col">Ações</th></tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr><td colSpan={4}>Nenhuma função cadastrada.</td></tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id}>
                    <td>{role.name}</td>
                    <td>{role.description || "—"}</td>
                    <td><span className={`status-pill ${role.system ? "warn" : "ok"}`}>{role.system ? "Sistema" : "Personalizada"}</span></td>
                    <td>
                      <button type="button" className="button ghost" onClick={() => setForm({ ...role })}>Editar</button>
                      {!role.system && (
                        <>
                          {" "}
                          <button type="button" className="button ghost" onClick={() => removeRole(role.id, role.system)}>Excluir</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {form && (
        <dialog className="modal" open>
          <form className="modal-card" onSubmit={save}>
            <div className="modal-header">
              <h2>{form.id ? "Editar função" : "Nova função"}</h2>
              <button type="button" className="icon-button" onClick={() => setForm(null)}>×</button>
            </div>
            <div className="form-grid">
              <label>Nome<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label>Descrição<input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            </div>
            <div className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="button primary">Salvar</button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}

export function PermissionsView() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [checked, setChecked] = useState(() => new Set());
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    Promise.all([adminApi.platformRoles.list(), adminApi.permissions.list()])
      .then(([rolesRes, permsRes]) => {
        setRoles(rolesRes.roles);
        setPermissions(permsRes.permissions);
        if (rolesRes.roles.length) setSelectedRoleId(rolesRes.roles[0].id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;
    setSaved("");
    adminApi.platformRoles
      .getPermissions(selectedRoleId)
      .then((res) => {
        const ids = res.permissionIds || [];
        setChecked(new Set(ids));
        setDirty(false);
        const byApp = permissions.reduce((acc, perm) => {
          if (!acc[perm.application]) acc[perm.application] = [];
          acc[perm.application].push(perm);
          return acc;
        }, {});
        const open = new Set();
        for (const appKey of Object.keys(byApp)) {
          if (byApp[appKey].some((p) => ids.includes(p.id))) open.add(appKey);
        }
        if (!open.size) {
          const first = Object.keys(byApp).sort()[0];
          if (first) open.add(first);
        }
        setExpanded(open);
      })
      .catch((e) => setError(e.message));
  }, [selectedRoleId, permissions]);

  const grouped = permissions.reduce((acc, perm) => {
    const key = perm.application;
    if (!acc[key]) acc[key] = [];
    acc[key].push(perm);
    return acc;
  }, {});

  const groups = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  function togglePermission(permissionId) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
    setDirty(true);
    setSaved("");
  }

  function toggleGroup(appKey, selectAll) {
    setChecked((prev) => {
      const next = new Set(prev);
      for (const perm of grouped[appKey]) {
        if (selectAll) next.add(perm.id);
        else next.delete(perm.id);
      }
      return next;
    });
    setDirty(true);
    setSaved("");
  }

  function toggleExpand(appKey) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(appKey)) next.delete(appKey);
      else next.add(appKey);
      return next;
    });
  }

  async function savePermissions() {
    if (!selectedRoleId) return;
    setError("");
    try {
      await adminApi.platformRoles.savePermissions(selectedRoleId, [...checked]);
      setDirty(false);
      setSaved("Permissões salvas com sucesso.");
    } catch (e) {
      setError(e.message);
    }
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  useTopbarActions(
    <button type="button" className="button primary" disabled={!dirty || !selectedRoleId} onClick={savePermissions}>
      Salvar permissões
    </button>,
    [dirty, selectedRoleId, checked],
  );

  if (loading) return <p>Carregando...</p>;

  return (
    <Panel title="Permissões por função" subtitle="Selecione a função e marque na checklist o que ela pode fazer.">
      {error && <p className="admin-error admin-panel-msg">{error}</p>}
      {saved && <p className="admin-saved admin-panel-msg">{saved}</p>}

      <div className="admin-perm-toolbar">
        <label className="admin-perm-role-select">
          Função
          <select
            className="input"
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
          >
            {roles.length === 0 ? (
              <option value="">Cadastre uma função primeiro</option>
            ) : (
              roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))
            )}
          </select>
        </label>
        {selectedRole?.description && (
          <p className="admin-perm-role-hint">{selectedRole.description}</p>
        )}
      </div>

      {roles.length === 0 ? (
        <p className="admin-panel-msg">Cadastre funções em <strong>Funções</strong> antes de definir permissões.</p>
      ) : (
        <div className="admin-perm-groups">
          {groups.map((appKey) => {
            const items = grouped[appKey];
            const allOn = items.every((p) => checked.has(p.id));
            const someOn = items.some((p) => checked.has(p.id));
            const isOpen = expanded.has(appKey);
            const selectedCount = items.filter((p) => checked.has(p.id)).length;
            return (
              <section key={appKey} className={`admin-perm-group${isOpen ? " is-open" : ""}`}>
                <div className="admin-perm-group-head">
                  <button type="button" className="admin-perm-group-toggle" onClick={() => toggleExpand(appKey)}>
                    <span className="admin-perm-chevron" aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
                    <h3>{appLabel(appKey)}</h3>
                    <span className="admin-perm-count">{selectedCount}/{items.length}</span>
                  </button>
                  <div className="admin-perm-group-actions">
                    <button type="button" className="button ghost" onClick={() => toggleGroup(appKey, true)}>Marcar todas</button>
                    <button type="button" className="button ghost" onClick={() => toggleGroup(appKey, false)}>Desmarcar</button>
                    <span className={`status-pill ${allOn ? "ok" : someOn ? "warn" : "muted"}`}>
                      {allOn ? "Todas" : someOn ? "Parcial" : "Nenhuma"}
                    </span>
                  </div>
                </div>
                <div className="admin-perm-body">
                  <ul className="admin-perm-list">
                    {items.map((perm) => (
                      <li key={perm.id}>
                        <label className="admin-perm-check">
                          <input
                            type="checkbox"
                            checked={checked.has(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                          />
                          <span className="admin-perm-check-text">
                            <strong>{perm.name}</strong>
                            <small>{perm.code}</small>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

const emptyDepartment = { name: "", description: "", active: true };

export function DepartmentsView() {
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    adminApi.departments.list().then((d) => setDepartments(d.departments)).catch((err) => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  useTopbarActions(
    <button type="button" className="button primary" onClick={() => setForm({ ...emptyDepartment })}>Novo departamento</button>,
    [],
  );

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      if (form.id) await adminApi.departments.update(form.id, form);
      else await adminApi.departments.create(form);
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeDepartment(id) {
    if (!window.confirm("Excluir este departamento?")) return;
    try {
      await adminApi.departments.remove(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Panel title="Departamentos" subtitle="Organização interna da plataforma">
        {error && <p className="admin-error admin-panel-msg">{error}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Nome</th><th>Descrição</th><th>Status</th><th className="actions-col">Ações</th></tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr><td colSpan={4}>Nenhum departamento cadastrado.</td></tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id}>
                    <td>{dept.name}</td>
                    <td>{dept.description || "—"}</td>
                    <td><span className={`status-pill ${dept.active ? "ok" : "muted"}`}>{dept.active ? "Ativo" : "Inativo"}</span></td>
                    <td>
                      <button type="button" className="button ghost" onClick={() => setForm({ ...dept })}>Editar</button>
                      {" "}
                      <button type="button" className="button ghost" onClick={() => removeDepartment(dept.id)}>Excluir</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {form && (
        <dialog className="modal" open>
          <form className="modal-card" onSubmit={save}>
            <div className="modal-header">
              <h2>{form.id ? "Editar departamento" : "Novo departamento"}</h2>
              <button type="button" className="icon-button" onClick={() => setForm(null)}>×</button>
            </div>
            <div className="form-grid">
              <label>Nome<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label>Descrição<input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              {form.id && (
                <label>Status
                  <select className="input" value={form.active ? "1" : "0"} onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}>
                    <option value="1">Ativo</option>
                    <option value="0">Inativo</option>
                  </select>
                </label>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="button primary">Salvar</button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}

export function ApplicationsView() {
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.applications().then((r) => setApplications(r.applications)).catch((e) => setError(e.message));
  }, []);

  return (
    <Panel title="Aplicativos" subtitle="Módulos registrados na plataforma (futuro controle do launcher)">
      {error && <p className="admin-error admin-panel-msg">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Ícone</th><th>Nome</th><th>Slug</th><th>Prefixo</th><th>Versão</th><th>Descrição</th><th>Status</th></tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr><td colSpan={7}>Nenhum aplicativo cadastrado.</td></tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id}>
                  <td>{app.icon || "—"}</td>
                  <td>{app.name}</td>
                  <td><code>{app.slug}</code></td>
                  <td><code>{app.permissionPrefix || "—"}</code></td>
                  <td>{app.version || "—"}</td>
                  <td>{app.description}</td>
                  <td><span className={`status-pill ${app.active ? "ok" : "muted"}`}>{app.active ? "Ativo" : "Inativo"}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function AuditView() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.auditLogs().then((r) => setLogs(r.logs)).catch((e) => setError(e.message));
  }, []);

  return (
    <Panel title="Auditoria" subtitle="Auditoria centralizada da plataforma (audit_logs)">
      {error && <p className="admin-error admin-panel-msg">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Data</th><th>Ação</th><th>Aplicativo</th><th>Módulo</th><th>Entidade</th><th>Pessoa</th><th>IP</th></tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={7}>Nenhum registro de auditoria.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.createdAt?.slice(0, 19).replace("T", " ")}</td>
                  <td>{log.action}</td>
                  <td>{log.application || "—"}</td>
                  <td>{log.module || "—"}</td>
                  <td>{log.entity || "—"} {log.entityId ? `(${log.entityId})` : ""}</td>
                  <td>{log.personName || "—"}</td>
                  <td>{log.ip || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function SessionsView() {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.sessions().then((r) => setSessions(r.sessions)).catch((e) => setError(e.message));
  }, []);

  return (
    <Panel title="Sessões" subtitle="Sessões unificadas da plataforma (platform_sessions)">
      {error && <p className="admin-error admin-panel-msg">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Pessoa</th><th>E-mail</th><th>Dispositivo</th><th>Navegador</th><th>IP</th><th>Início</th><th>Expira</th></tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr><td colSpan={7}>Nenhuma sessão ativa.</td></tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id}>
                  <td>{session.personName}</td>
                  <td>{session.personEmail || "—"}</td>
                  <td>{session.device || "—"}</td>
                  <td>{session.browser || "—"}</td>
                  <td>{session.ip || "—"}</td>
                  <td>{session.createdAt?.slice(0, 19).replace("T", " ")}</td>
                  <td>{session.expiresAt?.slice(0, 19).replace("T", " ")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function SettingsView() {
  const [form, setForm] = useState({ platformName: "", supportEmail: "" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.settings.get().then(setForm).catch((e) => setError(e.message));
  }, []);

  useTopbarActions(
    <button type="submit" form="admin-settings-form" className="button primary">Salvar</button>,
    [],
  );

  async function save(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    try {
      await adminApi.settings.save(form);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Panel title="Configurações" subtitle="Parâmetros gerais da plataforma (preparado)">
      {error && <p className="admin-error admin-panel-msg">{error}</p>}
      {saved && <p className="admin-saved admin-panel-msg">Configurações salvas.</p>}
      <form id="admin-settings-form" className="form-grid admin-panel-form" onSubmit={save}>
        <label>Nome da plataforma<input className="input" value={form.platformName} onChange={(e) => setForm({ ...form, platformName: e.target.value })} /></label>
        <label>E-mail de suporte<input className="input" type="email" value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} /></label>
      </form>
    </Panel>
  );
}

export function PlatformArchitectureView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.platform.architecture().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="admin-error">{error}</p>;
  if (!data) return <p>Carregando...</p>;

  const countFor = (id) => {
    if (id === "navigation") return data.counts.navigationItems;
    if (id === "audit") return data.counts.auditLogs;
    if (id === "sessions") return data.counts.platformSessions;
    return data.counts[id] ?? 0;
  };

  return (
    <>
      <Panel title="Modelo oficial de identidade" subtitle="Fluxo definitivo da Plataforma MÖBI OS">
        <div className="admin-arch-flow">
          {data.model.map((item, index) => (
            <div key={item.layer} className="admin-arch-step">
              <strong>{item.label}</strong>
              <span>{item.description}</span>
              {index < data.model.length - 1 && <span className="admin-arch-arrow" aria-hidden="true">↓</span>}
            </div>
          ))}
        </div>
      </Panel>

      <section className="metrics-grid" aria-label="Componentes da Plataforma">
        {data.components.map((item) => (
          <article key={item.id} className="metric-card">
            <span>{item.name}</span>
            <strong>{countFor(item.id)}</strong>
            <small className="admin-arch-meta">{item.table} · {item.status}</small>
          </article>
        ))}
      </section>

      <Panel title="Tabelas legadas (compatibilidade)" subtitle="Permanecem até a migração completa para people">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Tabela</th><th>Domínio</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.legacy.map((row) => (
                <tr key={row.table}>
                  <td><code>{row.table}</code></td>
                  <td>{row.domain}</td>
                  <td><span className="status-pill warn">{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted-text admin-panel-msg">Documentação: <code>/docs/IDENTITY_MIGRATION_PLAN.md</code></p>
      </Panel>
    </>
  );
}
