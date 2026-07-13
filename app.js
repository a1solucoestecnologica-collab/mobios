// MÖBI OS — Shell (orquestração de UI, launcher e troca de aplicativos).
// Arquitetura oficial: /docs/BIBLIA_MOBI_OS.md
let state = { categories: [], tools: [], jobs: [], users: [], workBoxes: [], separationTemplates: [] };
let currentUser = null;
let sessionContext = { permissions: [], accessibleApplications: [] };

const APP_PERMISSION_PREFIX = {
  tools: ["tools.", "dashboard."],
  planner: ["planner."],
  ponto: ["time."],
  time: ["time."],
  admin: ["admin."],
  portal: ["portal."],
};

const statusLabels = {
  active: "Disponivel",
  in_work: "Em obra",
  loaned: "Emprestada",
  maintenance: "Em manutencao",
  inactive: "Inativa",
  broken: "Quebrado",
  lost: "Perdida",
};

const controlLabels = {
  individual: "Unitário",
  quantity: "Por quantidade",
};

const roleLabels = {
  owner: "Dono / Diretor",
  manager: "Gestor",
  supervisor: "Supervisor",
  operator: "Operador",
  viewer: "Visualizador",
};

const permissionLabels = {
  tools: "Cadastro",
  required: "Lista requerida",
  categories: "Categorias",
  users: "Colaboradores",
  reports: "Relatorios",
};

const els = {
  navItems: document.querySelectorAll("#toolsNavList .nav-item"),
  menuToggleBtn: document.querySelector("#menuToggleBtn"),
  loginScreen: document.querySelector("#loginScreen"),
  launcherScreen: document.querySelector("#launcherScreen"),
  brandHome: document.querySelector("#brandHome"),
  backToApps: document.querySelector("#backToApps"),
  loginForm: document.querySelector("#loginForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  loginError: document.querySelector("#loginError"),
  logoutBtn: document.querySelector("#logoutBtn"),
  headerLogoutBtn: document.querySelector("#headerLogoutBtn"),
  userChipBtn: document.querySelector("#userChipBtn"),
  launcherLogout: document.querySelector("#launcherLogout"),
  currentUserAvatar: document.querySelector("#currentUserAvatar"),
  currentUserName: document.querySelector("#currentUserName"),
  currentUserRole: document.querySelector("#currentUserRole"),
  toolsView: document.querySelector("#toolsView"),
  categoriesView: document.querySelector("#categoriesView"),
  requiredView: document.querySelector("#requiredView"),
  templatesView: document.querySelector("#templatesView"),
  workBoxesView: document.querySelector("#workBoxesView"),
  usersView: document.querySelector("#usersView"),
  newToolBtn: document.querySelector("#newToolBtn"),
  openRequiredViewBtn: document.querySelector("#openRequiredViewBtn"),
  openWorkBoxesViewBtn: document.querySelector("#openWorkBoxesViewBtn"),
  openUsersViewBtn: document.querySelector("#openUsersViewBtn"),
  mobileNewToolBtn: document.querySelector("#mobileNewToolBtn"),
  mobileTabs: document.querySelectorAll(".mobile-tab"),
  emptyNewToolBtn: document.querySelector("#emptyNewToolBtn"),
  newCategoryBtn: document.querySelector("#newCategoryBtn"),
  exportJsonBtn: document.querySelector("#exportJsonBtn"),
  seedBtn: document.querySelector("#seedBtn"),
  toolDialog: document.querySelector("#toolDialog"),
  categoryDialog: document.querySelector("#categoryDialog"),
  requiredDialog: document.querySelector("#requiredDialog"),
  templateDialog: document.querySelector("#templateDialog"),
  workBoxDialog: document.querySelector("#workBoxDialog"),
  workBoxCheckDialog: document.querySelector("#workBoxCheckDialog"),
  userDialog: document.querySelector("#userDialog"),
  toolForm: document.querySelector("#toolForm"),
  toolSteps: document.querySelectorAll(".tool-step"),
  toolStepButtons: document.querySelectorAll("[data-tool-step]"),
  prevToolStepBtn: document.querySelector("#prevToolStepBtn"),
  nextToolStepBtn: document.querySelector("#nextToolStepBtn"),
  saveToolBtn: document.querySelector("#saveToolBtn"),
  categoryForm: document.querySelector("#categoryForm"),
  requiredForm: document.querySelector("#requiredForm"),
  templateForm: document.querySelector("#templateForm"),
  workBoxForm: document.querySelector("#workBoxForm"),
  workBoxCheckForm: document.querySelector("#workBoxCheckForm"),
  userForm: document.querySelector("#userForm"),
  toolsTableBody: document.querySelector("#toolsTableBody"),
  toolsEmpty: document.querySelector("#toolsEmpty"),
  requiredList: document.querySelector("#requiredList"),
  requiredEmpty: document.querySelector("#requiredEmpty"),
  newRequiredListBtn: document.querySelector("#newRequiredListBtn"),
  emptyRequiredListBtn: document.querySelector("#emptyRequiredListBtn"),
  requiredToolSearch: document.querySelector("#requiredToolSearch"),
  requiredToolList: document.querySelector("#requiredToolList"),
  requiredBoxList: document.querySelector("#requiredBoxList"),
  requiredTabButtons: document.querySelectorAll("[data-required-tab]"),
  requiredTabPanels: document.querySelectorAll("[data-required-tab-panel]"),
  requiredDialogTitle: document.querySelector("#requiredDialogTitle"),
  requiredTemplateSelect: document.querySelector("#requiredTemplateSelect"),
  requiredTemplateField: document.querySelector("#requiredTemplateField"),
  templateList: document.querySelector("#templateList"),
  templatesEmpty: document.querySelector("#templatesEmpty"),
  newTemplateBtn: document.querySelector("#newTemplateBtn"),
  templateDialogTitle: document.querySelector("#templateDialogTitle"),
  templateToolSearch: document.querySelector("#templateToolSearch"),
  templateToolList: document.querySelector("#templateToolList"),
  templateBoxList: document.querySelector("#templateBoxList"),
  templateTabButtons: document.querySelectorAll("[data-template-tab]"),
  templateTabPanels: document.querySelectorAll("[data-template-tab-panel]"),
  workBoxList: document.querySelector("#workBoxList"),
  workBoxesEmpty: document.querySelector("#workBoxesEmpty"),
  newWorkBoxBtn: document.querySelector("#newWorkBoxBtn"),
  emptyNewWorkBoxBtn: document.querySelector("#emptyNewWorkBoxBtn"),
  workBoxDialogTitle: document.querySelector("#workBoxDialogTitle"),
  workBoxToolSearch: document.querySelector("#workBoxToolSearch"),
  workBoxToolList: document.querySelector("#workBoxToolList"),
  workBoxCheckTitle: document.querySelector("#workBoxCheckTitle"),
  workBoxCheckList: document.querySelector("#workBoxCheckList"),
  usersList: document.querySelector("#usersList"),
  usersEmpty: document.querySelector("#usersEmpty"),
  newUserBtn: document.querySelector("#newUserBtn"),
  emptyNewUserBtn: document.querySelector("#emptyNewUserBtn"),
  userDialogTitle: document.querySelector("#userDialogTitle"),
  userManager: document.querySelector("#userManager"),
  categoryGrid: document.querySelector("#categoryGrid"),
  toolSearch: document.querySelector("#toolSearch"),
  statusFilter: document.querySelector("#statusFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  metricTotal: document.querySelector("#metricTotal"),
  metricActive: document.querySelector("#metricActive"),
  metricMaintenance: document.querySelector("#metricMaintenance"),
  metricInactive: document.querySelector("#metricInactive"),
  toast: document.querySelector("#toast"),
  toolPhoto: document.querySelector("#toolPhoto"),
  toolCameraPhoto: document.querySelector("#toolCameraPhoto"),
  choosePhotoBtn: document.querySelector("#choosePhotoBtn"),
  cameraPhotoBtn: document.querySelector("#cameraPhotoBtn"),
  toolPhotoPreview: document.querySelector("#toolPhotoPreview"),
  removePhotoBtn: document.querySelector("#removePhotoBtn"),
  qrDialog: document.querySelector("#qrDialog"),
  qrToolName: document.querySelector("#qrToolName"),
  qrImage: document.querySelector("#qrImage"),
  qrInternalCode: document.querySelector("#qrInternalCode"),
  qrPayload: document.querySelector("#qrPayload"),
  downloadQrBtn: document.querySelector("#downloadQrBtn"),
  printQrBtn: document.querySelector("#printQrBtn"),
  photoDialog: document.querySelector("#photoDialog"),
  photoDialogTitle: document.querySelector("#photoDialogTitle"),
  photoDialogImage: document.querySelector("#photoDialogImage"),
  categoryGuideCards: document.querySelectorAll("[data-category-match]"),
  detailDialog: document.querySelector("#detailDialog"),
  detailToolName: document.querySelector("#detailToolName"),
  detailPhoto: document.querySelector("#detailPhoto"),
  detailPhotoPlaceholder: document.querySelector("#detailPhotoPlaceholder"),
  detailCode: document.querySelector("#detailCode"),
  detailStatus: document.querySelector("#detailStatus"),
  detailCategory: document.querySelector("#detailCategory"),
  detailOwner: document.querySelector("#detailOwner"),
  detailLocation: document.querySelector("#detailLocation"),
  detailControl: document.querySelector("#detailControl"),
  detailEditBtn: document.querySelector("#detailEditBtn"),
  detailQrBtn: document.querySelector("#detailQrBtn"),
  detailHistoryList: document.querySelector("#detailHistoryList"),
};

let currentPhotoData = "";
let currentQr = null;
let currentToolStep = 0;
let currentDetailToolId = null;
let currentRequiredEditJob = null;
let currentWorkBoxEdit = null;
let currentTemplateEdit = null;

function bindClick(el, handler) {
  if (el) el.addEventListener("click", handler);
}

function bindEvents() {
  els.loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await login();
  });

  els.logoutBtn?.addEventListener("click", async () => {
    await logout();
  });

  els.headerLogoutBtn?.addEventListener("click", async () => {
    await logout();
  });

  els.userChipBtn?.addEventListener("click", async () => {
    await logout();
  });

  els.launcherLogout?.addEventListener("click", async () => {
    await logout();
  });

  els.menuToggleBtn?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
  });

  els.navItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (item.disabled) return;
      if (!item.dataset.view) return;
      switchView(item.dataset.view);
      document.body.classList.remove("sidebar-open");
    });
  });

  els.mobileTabs.forEach((item) => {
    item.addEventListener("click", () => {
      if (!item.dataset.mobileView) return;
      switchView(item.dataset.mobileView);
    });
  });

  setupPlannerNavigation();

  els.requiredTabButtons.forEach((button) => {
    button.addEventListener("click", () => switchRequiredDialogTab(button.dataset.requiredTab));
  });

  els.templateTabButtons.forEach((button) => {
    button.addEventListener("click", () => switchTemplateDialogTab(button.dataset.templateTab));
  });

  bindClick(els.newToolBtn, () => openToolDialog());
  els.openRequiredViewBtn?.addEventListener("click", () => switchView("required"));
  els.openWorkBoxesViewBtn?.addEventListener("click", () => switchView("workBoxes"));
  els.openUsersViewBtn?.addEventListener("click", () => switchView("users"));
  bindClick(els.mobileNewToolBtn, () => openToolDialog());
  bindClick(els.emptyNewToolBtn, () => openToolDialog());
  bindClick(els.newCategoryBtn, () => openCategoryDialog());
  bindClick(els.newRequiredListBtn, () => openRequiredDialog());
  els.emptyRequiredListBtn?.addEventListener("click", () => openRequiredDialog());
  bindClick(els.newTemplateBtn, () => openTemplateDialog());
  bindClick(els.newWorkBoxBtn, () => openWorkBoxDialog());
  bindClick(els.emptyNewWorkBoxBtn, () => openWorkBoxDialog());
  bindClick(els.newUserBtn, () => openUserDialog());
  bindClick(els.emptyNewUserBtn, () => openUserDialog());
  bindClick(els.exportJsonBtn, exportJson);
  els.seedBtn?.addEventListener("click", seedExamples);
  bindClick(els.prevToolStepBtn, () => setToolStep(currentToolStep - 1));
  bindClick(els.nextToolStepBtn, () => {
    if (!validateToolStep(currentToolStep)) return;
    setToolStep(currentToolStep + 1);
  });

  els.toolStepButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextStep = Number(button.dataset.toolStep);
      if (!canMoveToToolStep(nextStep)) return;
      setToolStep(nextStep);
    });
  });

  els.categoryGuideCards.forEach((button) => {
    button.addEventListener("click", () => applyCategoryGuide(button.dataset.categoryMatch));
  });

  bindClick(els.detailEditBtn, async () => {
    const tool = currentDetailToolId ? await api(`/api/tools/${currentDetailToolId}`) : null;
    if (!tool) return;
    els.detailDialog.close();
    openToolDialog(tool);
  });

  bindClick(els.detailQrBtn, async () => {
    if (!currentDetailToolId) return;
    els.detailDialog.close();
    await openQrDialog(currentDetailToolId);
  });

  [els.toolSearch, els.statusFilter, els.categoryFilter].forEach((input) => {
    input?.addEventListener("input", renderTools);
  });
  els.requiredToolSearch?.addEventListener("input", renderRequiredToolPicker);
  els.templateToolSearch?.addEventListener("input", renderTemplateToolPicker);
  els.workBoxToolSearch?.addEventListener("input", renderWorkBoxToolPicker);
  els.requiredTemplateSelect?.addEventListener("change", applySelectedTemplateToRequiredDialog);

  document.querySelector("#toolCategory")?.addEventListener("change", () => {
    updateSubcategoryOptions();
    updateCategoryGuideSelection();
  });
  document.querySelector("#toolStatus")?.addEventListener("change", updateToolLocationFields);
  document.querySelector("#toolCurrentJobId")?.addEventListener("change", updateToolCurrentJobLabelFromSelect);
  bindClick(els.choosePhotoBtn, () => els.toolPhoto?.click());
  bindClick(els.cameraPhotoBtn, () => els.toolCameraPhoto?.click());
  els.toolPhoto?.addEventListener("change", handlePhotoSelection);
  els.toolCameraPhoto?.addEventListener("change", handlePhotoSelection);
  els.toolPhotoPreview?.addEventListener("click", () => {
    if (currentPhotoData) openPhotoDialog(currentPhotoData, document.querySelector("#toolName")?.value || "Ferramenta");
  });
  bindClick(els.removePhotoBtn, removeCurrentPhoto);
  bindClick(els.downloadQrBtn, downloadCurrentQr);
  bindClick(els.printQrBtn, () => window.print());

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector(`#${button.dataset.closeDialog}`).close();
    });
  });

  els.toolForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateToolForm()) return;
    await saveToolFromForm();
  });

  els.categoryForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveCategoryFromForm();
  });

  els.requiredForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveRequiredListFromForm();
  });

  els.templateForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveTemplateFromForm();
  });

  els.workBoxForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveWorkBoxFromForm();
  });

  els.workBoxCheckForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveWorkBoxCheckFromForm();
  });

  els.userForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveUserFromForm();
  });
}

async function refreshState() {
  state = await api("/api/state");
  currentUser = state.currentUser || currentUser;
  render();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    ...options,
  });

  const data = await response.json();
  if (response.status === 401) {
    throw new Error(data.error || "Acesso nao autorizado.");
  }
  if (!response.ok) throw new Error(data.error || "Erro na API.");
  return data;
}

function mapPersonToUser(person) {
  if (!person) return null;
  return {
    id: person.id,
    name: person.name || person.fullName || "Usuario",
    email: person.email || "",
    role: person.role || "owner",
    permissions: [],
  };
}

async function restoreSession() {
  const me = await api("/api/me");
  if (!me.authenticated) return null;
  sessionContext = {
    permissions: me.permissions || [],
    accessibleApplications: me.accessibleApplications || [],
  };
  return me.user || mapPersonToUser(me.person);
}

function permissionCodeList() {
  return (sessionContext.permissions || []).map((item) => (typeof item === "string" ? item : item.code)).filter(Boolean);
}

function normalizeAppSlug(slug) {
  return slug === "ponto" ? "time" : slug;
}

function hasPermissionForApp(slug) {
  const normalized = normalizeAppSlug(slug);
  const prefixes = APP_PERMISSION_PREFIX[slug] || APP_PERMISSION_PREFIX[normalized] || [`${normalized}.`];
  const codes = permissionCodeList();
  return prefixes.some((prefix) => codes.some((code) => code.startsWith(prefix)));
}

function sessionAppsLoaded() {
  return (sessionContext.accessibleApplications || []).length > 0 || permissionCodeList().length > 0;
}

function hasAppAccess(slug) {
  const normalized = normalizeAppSlug(slug);
  const listed = (sessionContext.accessibleApplications || []).some((app) => app.slug === normalized);
  if (listed) return true;
  if (!sessionAppsLoaded()) {
    return normalized !== "admin";
  }
  return hasPermissionForApp(slug);
}

function hasAdminAccess() {
  if (hasAppAccess("admin")) return true;
  return permissionCodeList().some((code) => code.startsWith("admin."));
}

function applyLauncherVisibility() {
  document.querySelectorAll(".launcher-app").forEach((button) => {
    const product = button.dataset.launch;
    const allowed = product === "admin" ? hasAdminAccess() : hasAppAccess(product);
    button.classList.toggle("hidden", !allowed);
    button.disabled = !allowed;
  });
}

async function boot() {
  try {
    const user = await restoreSession();
    if (user) {
      currentUser = user;
      showApp();
      await refreshState();
      return;
    }
  } catch {
    // sem sessao ativa
  }
  showLogin();
}

async function login() {
  els.loginError.classList.add("hidden");
  try {
    const result = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        email: els.loginEmail.value.trim(),
        password: els.loginPassword.value,
      }),
    });
    currentUser = result.user || mapPersonToUser(result.person);
    if (!currentUser) throw new Error("Nao foi possivel iniciar a sessao.");

    sessionContext = {
      permissions: result.permissions || [],
      accessibleApplications: result.accessibleApplications || [],
    };

    if (!sessionContext.accessibleApplications.length && !permissionCodeList().length) {
      try {
        const me = await api("/api/me");
        if (me.authenticated) {
          sessionContext = {
            permissions: me.permissions || [],
            accessibleApplications: me.accessibleApplications || [],
          };
        }
      } catch {
        // mantem contexto do login
      }
    }

    els.loginPassword.value = "";
    showApp();
    await refreshState();
  } catch (error) {
    showLogin(error.message);
  }
}

async function logout() {
  await api("/api/logout", { method: "POST" }).catch(() => null);
  currentUser = null;
  sessionContext = { permissions: [], accessibleApplications: [] };
  state = { categories: [], tools: [], jobs: [], users: [], workBoxes: [], separationTemplates: [] };
  showLogin();
}

function showLogin(message = "") {
  document.body.classList.add("auth-locked");
  els.launcherScreen?.classList.add("hidden");
  document.body.classList.remove("launcher-open");
  els.loginScreen.classList.remove("hidden");
  els.logoutBtn?.classList.add("hidden");
  els.headerLogoutBtn?.setAttribute("disabled", "disabled");
  els.userChipBtn?.setAttribute("disabled", "disabled");
  if (message) {
    els.loginError.textContent = message;
    els.loginError.classList.remove("hidden");
  } else {
    els.loginError.classList.add("hidden");
  }
}

function showApp() {
  document.body.classList.remove("auth-locked");
  els.loginScreen.classList.add("hidden");
  els.logoutBtn?.classList.remove("hidden");
  els.headerLogoutBtn?.removeAttribute("disabled");
  els.userChipBtn?.removeAttribute("disabled");
  renderCurrentUser();
  applyLauncherVisibility();
  showLauncher();
}

function renderCurrentUser() {
  const displayUser = currentUser || { name: "MÖBI", role: "Marcenaria" };
  els.currentUserAvatar.textContent = getInitials(displayUser.name);
  els.currentUserName.textContent = displayUser.name;
  els.currentUserRole.textContent = roleLabels[displayUser.role] || displayUser.role;
}

let plannerMounted = { admin: false, collaborator: false };
let activePlannerMode = "admin";
let pontoMounted = false;
let adminMounted = false;
let portalMounted = false;

function setupPlannerNavigation() {
  const modeButtons = document.querySelectorAll(".planner-mode");

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => switchPlannerMode(button.dataset.plannerMode));
  });

  document.querySelectorAll(".launcher-app").forEach((app) => {
    app.addEventListener("click", () => openProduct(app.dataset.launch));
  });

  document.querySelectorAll("[data-ponto-view]").forEach((button) => {
    button.addEventListener("click", () => switchPontoView(button.dataset.pontoView));
  });

  document.querySelectorAll("[data-admin-view]").forEach((button) => {
    button.addEventListener("click", () => switchAdminView(button.dataset.adminView));
  });

  document.getElementById("adminSystemMenuToggle")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleAdminSystemMenu();
  });

  els.brandHome?.addEventListener("click", showLauncher);
  els.backToApps?.addEventListener("click", showLauncher);
}

function switchPontoView(view) {
  document.querySelectorAll("[data-ponto-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.pontoView === view);
  });
  window.MoobleTime?.navigate?.(view);
}

function toggleAdminSystemMenu(forceOpen) {
  const wrap = document.getElementById("adminNavSystem");
  const submenu = document.getElementById("adminSystemSubmenu");
  const toggle = document.getElementById("adminSystemMenuToggle");
  if (!wrap || !submenu || !toggle) return;

  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !wrap.classList.contains("is-open");
  wrap.classList.toggle("is-open", shouldOpen);
  submenu.hidden = !shouldOpen;
  toggle.setAttribute("aria-expanded", String(shouldOpen));
}

const ADMIN_SYSTEM_VIEWS = new Set(["platform", "users"]);

function switchPortalView(view) {
  window.MooblePortal?.navigate?.(view);
}

function switchAdminView(view) {
  document.querySelectorAll("[data-admin-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.adminView === view);
  });
  toggleAdminSystemMenu(ADMIN_SYSTEM_VIEWS.has(view));
  window.MoobleAdmin?.navigate?.(view);
}

// Tela de aplicativos (estilo iCloud): primeira coisa apos o login.
function showLauncher() {
  els.launcherScreen?.classList.remove("hidden");
  document.body.classList.add("launcher-open");
  document.body.classList.remove("sidebar-open");
}

// Escolha de um app no launcher: entra no produto e fecha a tela de apps.
function openProduct(product) {
  const target = product || "tools";
  if (target === "admin" && !hasAdminAccess()) {
    window.alert("Você não tem permissão para acessar o MÖBI Admin.");
    showLauncher();
    return;
  }
  if (target !== "admin" && !hasAppAccess(target === "ponto" ? "time" : target)) {
    window.alert("Você não tem permissão para acessar este aplicativo.");
    showLauncher();
    return;
  }
  els.launcherScreen?.classList.add("hidden");
  document.body.classList.remove("launcher-open");
  switchProduct(target);
}

function switchProduct(product) {
  const isPlanner = product === "planner";
  const isPonto = product === "ponto";
  const isAdmin = product === "admin";
  const isPortal = product === "portal";
  const isTools = !isPlanner && !isPonto && !isAdmin && !isPortal;
  document.body.classList.toggle("product-planner", isPlanner);
  document.body.classList.toggle("product-ponto", isPonto);
  document.body.classList.toggle("product-admin", isAdmin);
  document.body.classList.toggle("product-portal", isPortal);
  document.body.classList.toggle("product-tools", isTools);

  const brandSuffix = document.querySelector("#brandSuffix");
  if (brandSuffix) {
    if (isPlanner) brandSuffix.textContent = "WorkMaps";
    else if (isPonto) brandSuffix.textContent = "Time";
    else if (isAdmin) brandSuffix.textContent = "Admin";
    else if (isPortal) brandSuffix.textContent = "Portal";
    else brandSuffix.textContent = "Tools";
  }

  const plannerShell = document.querySelector("#plannerShell");
  const pontoShell = document.querySelector("#pontoShell");
  const adminShell = document.querySelector("#adminShell");
  const portalShell = document.querySelector("#portalShell");
  plannerShell?.classList.toggle("hidden", !isPlanner);
  pontoShell?.classList.toggle("hidden", !isPonto);
  adminShell?.classList.toggle("hidden", !isAdmin);
  portalShell?.classList.toggle("hidden", !isPortal);
  document.querySelector("#toolsNavList")?.classList.toggle("hidden", !isTools);
  document.querySelector("#pontoNavList")?.classList.toggle("hidden", !isPonto);
  document.querySelector("#adminNavList")?.classList.toggle("hidden", !isAdmin);
  document.body.classList.remove("sidebar-open");

  if (isTools) {
    switchView("tools");
  }

  if (isPlanner) mountPlanner(activePlannerMode);
  if (isPonto) {
    switchPontoView("dashboard");
    mountPonto();
  }
  if (isAdmin) {
    toggleAdminSystemMenu(false);
    switchAdminView("dashboard");
    mountAdmin();
  }
  if (isPortal) {
    switchPortalView("home");
    mountPortal();
  }
}

function switchPlannerMode(mode) {
  activePlannerMode = mode;
  document.querySelectorAll(".planner-mode").forEach((button) => {
    button.classList.toggle("active", button.dataset.plannerMode === mode);
  });
  document.querySelector("#plannerAdminRoot")?.classList.toggle("hidden", mode !== "admin");
  document.querySelector("#plannerCollabRoot")?.classList.toggle("hidden", mode !== "collaborator");
  mountPlanner(mode);
}

function mountPlanner(mode) {
  const planner = window.MooblePlanner;
  if (!planner) return;

  if (mode === "admin" && !plannerMounted.admin) {
    const root = document.querySelector("#plannerAdminRoot");
    if (root) {
      planner.mountAdmin(root);
      plannerMounted.admin = true;
    }
  }

  if (mode === "collaborator" && !plannerMounted.collaborator) {
    const root = document.querySelector("#plannerCollabRoot");
    if (root) {
      planner.mountCollaborator(root);
      plannerMounted.collaborator = true;
    }
  }
}

function mountPonto() {
  const ponto = window.MoobleTime;
  if (!ponto || pontoMounted) return;
  const root = document.querySelector("#pontoRoot");
  if (root) {
    ponto.mount(root);
    pontoMounted = true;
  }
}

function mountAdmin() {
  const admin = window.MoobleAdmin;
  if (!admin || adminMounted) return;
  const root = document.querySelector("#adminRoot");
  if (root) {
    admin.mount(root);
    adminMounted = true;
  }
}

function mountPortal() {
  const portal = window.MooblePortal;
  if (!portal || portalMounted) return;
  const root = document.querySelector("#portalRoot");
  if (root) {
    portal.mount(root);
    portalMounted = true;
  }
}

function switchView(view) {
  els.navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  els.mobileTabs.forEach((item) => item.classList.toggle("active", item.dataset.mobileView === view));
  els.toolsView.classList.toggle("hidden", view !== "tools");
  els.categoriesView.classList.toggle("hidden", view !== "categories");
  els.requiredView.classList.toggle("hidden", view !== "required");
  els.templatesView.classList.toggle("hidden", view !== "templates");
  els.workBoxesView.classList.toggle("hidden", view !== "workBoxes");
  els.usersView.classList.toggle("hidden", view !== "users");
}

function render() {
  renderCurrentUser();
  renderCategoryOptions();
  renderToolOwnerOptions(document.querySelector("#toolOwner")?.value || "MÖBI");
  renderTools();
  renderCategories();
  renderRequiredLists();
  renderTemplates();
  renderWorkBoxes();
  renderUsers();
  renderMetrics();
}

function renderMetrics() {
  els.metricTotal.textContent = state.tools.length;
  els.metricActive.textContent = state.tools.filter((tool) => tool.status === "active").length;
  els.metricMaintenance.textContent = state.tools.filter((tool) => tool.status === "maintenance").length;
  els.metricInactive.textContent = state.tools.filter((tool) => tool.status === "inactive").length;
}

function renderCategoryOptions() {
  const categoryOptions = state.categories
    .map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
    .join("");

  document.querySelector("#toolCategory").innerHTML = categoryOptions;
  els.categoryFilter.innerHTML = `<option value="">Todas as categorias</option>${categoryOptions}`;
  updateSubcategoryOptions();
}

function renderToolOwnerOptions(selectedValue = "MÖBI") {
  const ownerSelect = document.querySelector("#toolOwner");
  if (!ownerSelect) return;

  const names = (state.users || [])
    .map((user) => user.name)
    .filter(Boolean);
  const owners = ["MÖBI", ...names.filter((name) => name !== "MÖBI")];
  const uniqueOwners = [...new Set(owners)];

  ownerSelect.innerHTML = uniqueOwners
    .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join("");
  ownerSelect.value = uniqueOwners.includes(selectedValue) ? selectedValue : "MÖBI";
}

function renderLoanedToOptions() {
  const datalist = document.querySelector("#toolOwnerOptions");
  if (!datalist) return;
  const names = (state.users || []).map((user) => user.name).filter(Boolean);
  datalist.innerHTML = [...new Set(names)].map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
}

function renderCurrentJobOptions(selectedId = "", selectedLabel = "") {
  const select = document.querySelector("#toolCurrentJobId");
  if (!select) return;

  const options = (state.jobs || [])
    .map((job) => {
      const label = `${job.clientName} - ${job.workName}`;
      return `<option value="${job.id}" data-label="${escapeHtml(label)}">${escapeHtml(label)}</option>`;
    })
    .join("");

  select.innerHTML = `<option value="">Selecionar lista/obra existente</option>${options}`;
  select.value = selectedId || "";
  if (!select.value && selectedLabel) document.querySelector("#toolCurrentJobLabel").value = selectedLabel;
}

function updateToolLocationFields() {
  const status = document.querySelector("#toolStatus").value;
  document.querySelector("#toolLoanedToField").classList.toggle("hidden", status !== "loaned");
  document.querySelector("#toolCurrentJobField").classList.toggle("hidden", status !== "in_work");
  document.querySelector("#toolCurrentJobManualField").classList.toggle("hidden", status !== "in_work");
}

function updateToolCurrentJobLabelFromSelect() {
  const select = document.querySelector("#toolCurrentJobId");
  const selected = select.options[select.selectedIndex];
  if (selected?.dataset.label) document.querySelector("#toolCurrentJobLabel").value = selected.dataset.label;
}

function updateSubcategoryOptions(selectedValue = "") {
  const categoryId = document.querySelector("#toolCategory").value || state.categories[0]?.id;
  const category = state.categories.find((item) => item.id === categoryId);
  const subcategorySelect = document.querySelector("#toolSubcategory");
  const options = (category?.subcategories || [])
    .map((subcategory) => `<option value="${escapeHtml(subcategory)}">${escapeHtml(subcategory)}</option>`)
    .join("");
  subcategorySelect.innerHTML = `<option value="">Sem subcategoria</option>${options}`;
  subcategorySelect.value = selectedValue;
}

function renderTools() {
  const query = els.toolSearch.value.trim().toLowerCase();
  const status = els.statusFilter.value;
  const categoryId = els.categoryFilter.value;

  const filtered = state.tools.filter((tool) => {
    const category = getCategory(tool.categoryId);
    const text = `${tool.name} ${tool.internalCode} ${tool.owner || ""} ${category?.name || ""}`.toLowerCase();
    return (!query || text.includes(query)) && (!status || tool.status === status) && (!categoryId || tool.categoryId === categoryId);
  });

  els.toolsTableBody.innerHTML = filtered
    .map((tool) => {
      const category = getCategory(tool.categoryId);
      return `
        <tr>
          <td data-label="Foto">${renderPhoto(tool)}</td>
          <td data-label="Codigo"><strong>${escapeHtml(tool.internalCode)}</strong></td>
          <td data-label="Ferramenta">
            <strong>${escapeHtml(tool.name)}</strong>
            <div class="muted-text">${escapeHtml(tool.subcategory || "Sem subcategoria")}</div>
          </td>
          <td data-label="Categoria">${escapeHtml(category?.name || "Sem categoria")}</td>
          <td data-label="Proprietario">${escapeHtml(tool.owner || "MÖBI")}</td>
          <td data-label="Controle">${controlLabels[tool.controlModel]}${tool.controlModel === "quantity" ? ` (${tool.quantity})` : ""}</td>
          <td data-label="Status">
            <span class="badge ${tool.status}">${statusLabels[tool.status]}</span>
            ${renderToolLocation(tool)}
          </td>
          <td data-label="Atualizado">${formatDate(tool.updatedAt)}</td>
          <td data-label="Acoes">
            <div class="row-actions">
              <button class="button ghost" type="button" data-action="edit" data-id="${tool.id}">Editar</button>
              <button class="button secondary" type="button" data-action="detail" data-id="${tool.id}">Detalhes</button>
              <button class="button secondary" type="button" data-action="history" data-id="${tool.id}">Historico</button>
              ${
                tool.controlModel === "individual"
                  ? `<button class="button secondary" type="button" data-action="qr" data-id="${tool.id}">QR Code</button>`
                  : ""
              }
              <button class="button secondary" type="button" data-action="duplicate" data-id="${tool.id}">Duplicar</button>
              <button class="button danger" type="button" data-action="inactive" data-id="${tool.id}">Inativar</button>
              <button class="button danger" type="button" data-action="delete" data-id="${tool.id}">Excluir</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  els.toolsEmpty.classList.toggle("hidden", filtered.length > 0);

  els.toolsTableBody.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleToolAction(button.dataset.action, button.dataset.id));
  });

  els.toolsTableBody.querySelectorAll("[data-action='view-photo']").forEach((button) => {
    button.addEventListener("click", () => {
      const tool = state.tools.find((item) => item.id === button.dataset.id);
      const photoSource = tool?.photoData || tool?.photoUrl;
      if (photoSource) openPhotoDialog(photoSource, tool.name);
    });
  });

  renderMetrics();
}

function renderToolLocation(tool) {
  if (tool.status === "loaned" && tool.loanedTo) {
    return `<div class="muted-text">Para: ${escapeHtml(tool.loanedTo)}</div>`;
  }

  if (tool.status === "in_work" && (tool.currentJobLabel || tool.currentJobId)) {
    return `<div class="muted-text">Obra: ${escapeHtml(tool.currentJobLabel || tool.currentJobId)}</div>`;
  }

  return "";
}

function renderCategories() {
  els.categoryGrid.innerHTML = state.categories
    .map(
      (category) => `
      <article class="category-card">
        <h3>${escapeHtml(category.name)}</h3>
        <ul class="subcategory-list">
          ${(category.subcategories || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>Sem subcategorias</li>"}
        </ul>
      </article>
    `,
    )
    .join("");
}

function renderWorkBoxes() {
  const boxes = state.workBoxes || [];
  els.workBoxesEmpty.classList.toggle("hidden", boxes.length > 0);
  els.workBoxList.innerHTML = boxes
    .map((box) => {
      const progress = getWorkBoxSummary(box);
      const lastCheck = box.checks?.[0];
      return `
        <article class="work-box-card ${box.status}">
          <div class="work-box-header">
            <div>
              <h3>${escapeHtml(box.name)}</h3>
              <p>${box.responsible ? `Responsavel: ${escapeHtml(box.responsible)}` : "Sem responsavel definido"}</p>
              ${lastCheck ? `<p>Ultima conferencia: ${formatDate(lastCheck.createdAt)} - ${lastCheck.status === "complete" ? "Completa" : "Com pendencias"}</p>` : `<p>Ainda sem conferencia registrada.</p>`}
            </div>
            <span class="access-badge ${box.status === "active" ? "enabled" : "disabled"}">${box.status === "active" ? "Ativa" : "Inativa"}</span>
          </div>

          <div class="work-box-summary">
            <span><strong>${progress.total}</strong><small>Itens esperados</small></span>
            <span><strong>${progress.required}</strong><small>Obrigatorios</small></span>
            <span><strong>${progress.optional}</strong><small>Opcionais</small></span>
          </div>

          <div class="work-box-item-preview">
            ${box.items.slice(0, 6).map((item) => `<span>${escapeHtml(item.toolName)}${item.quantity > 1 ? ` (${item.quantity})` : ""}</span>`).join("") || `<span>Nenhum item definido.</span>`}
            ${box.items.length > 6 ? `<span>+${box.items.length - 6} itens</span>` : ""}
          </div>

          <div class="required-card-actions">
            <button class="button primary" type="button" data-work-box-action="check" data-id="${box.id}" ${box.items.length === 0 ? "disabled" : ""}>Conferir caixa</button>
            <button class="button secondary" type="button" data-work-box-action="edit" data-id="${box.id}">Editar itens</button>
            <button class="button danger" type="button" data-work-box-action="delete" data-id="${box.id}">Excluir</button>
          </div>
        </article>
      `;
    })
    .join("");

  els.workBoxList.querySelectorAll("[data-work-box-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      await handleWorkBoxAction(button.dataset.workBoxAction, button.dataset.id);
    });
  });
}

function getWorkBoxSummary(box) {
  const items = box.items || [];
  return {
    total: items.length,
    required: items.filter((item) => item.required).length,
    optional: items.filter((item) => !item.required).length,
  };
}

function renderUsers() {
  const users = state.users || [];
  els.usersEmpty.classList.toggle("hidden", users.length > 0);
  els.usersList.innerHTML = users
    .map(
      (user) => `
        <article class="user-card">
          <div class="user-main">
            <div class="user-avatar">${getInitials(user.name)}</div>
            <div>
              <h3>${escapeHtml(user.name)}</h3>
              <p>${roleLabels[user.role] || user.role}${user.managerName ? ` · Gestor: ${escapeHtml(user.managerName)}` : ""}</p>
              ${user.email ? `<p>${escapeHtml(user.email)}</p>` : ""}
              ${user.phone ? `<p>${escapeHtml(user.phone)}</p>` : ""}
            </div>
          </div>

          <div class="user-actions">
            <button class="button secondary" type="button" data-user-action="edit" data-id="${user.id}">Editar</button>
          </div>
        </article>
      `,
    )
    .join("");

  els.usersList.querySelectorAll("[data-user-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      await handleUserAction(button.dataset.userAction, button.dataset.id);
    });
  });
}

function renderTemplates() {
  const templates = state.separationTemplates || [];
  els.templatesEmpty.classList.toggle("hidden", templates.length > 0);
  els.templateList.innerHTML = templates
    .map(
      (template) => `
        <article class="template-card">
          <div class="template-card-header">
            <div>
              <h3>${escapeHtml(template.name)}</h3>
              <p>${escapeHtml(template.notes || "Sem observacoes")}</p>
            </div>
            <span class="access-badge enabled">${template.items.length + template.boxes.length} itens</span>
          </div>

          <div class="template-summary">
            <span><strong>${template.items.length}</strong><small>Ferramentas</small></span>
            <span><strong>${template.boxes.length}</strong><small>Caixas</small></span>
          </div>

          <div class="work-box-item-preview">
            ${template.items.slice(0, 6).map((item) => `<span>${escapeHtml(item.toolName)}${item.quantity > 1 ? ` (${item.quantity})` : ""}</span>`).join("") || `<span>Nenhuma ferramenta definida.</span>`}
            ${template.items.length > 6 ? `<span>+${template.items.length - 6} ferramentas</span>` : ""}
            ${template.boxes.map((box) => `<span>Caixa: ${escapeHtml(box.name)}</span>`).join("")}
          </div>

          <div class="required-card-actions">
            <button class="button secondary" type="button" data-template-action="edit" data-id="${template.id}">Editar modelo</button>
            <button class="button danger" type="button" data-template-action="delete" data-id="${template.id}">Excluir modelo</button>
          </div>
        </article>
      `,
    )
    .join("");

  els.templateList.querySelectorAll("[data-template-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      await handleTemplateAction(button.dataset.templateAction, button.dataset.id);
    });
  });
}

function openTemplateDialog(template = null) {
  currentTemplateEdit = template;
  els.templateForm.reset();
  els.templateDialogTitle.textContent = template ? "Editar modelo" : "Novo modelo";
  document.querySelector("#templateId").value = template?.id || "";
  document.querySelector("#templateName").value = template?.name || "";
  document.querySelector("#templateNotes").value = template?.notes || "";
  els.templateToolSearch.value = "";
  renderTemplateToolPicker(template);
  renderTemplateBoxPicker(template);
  switchTemplateDialogTab("tools");
  els.templateDialog.showModal();
}

function switchTemplateDialogTab(tab) {
  els.templateTabButtons.forEach((button) => button.classList.toggle("active", button.dataset.templateTab === tab));
  els.templateTabPanels.forEach((panel) => panel.classList.toggle("hidden", panel.dataset.templateTabPanel !== tab));
}

function renderTemplateToolPicker(template = null) {
  const query = els.templateToolSearch.value.trim().toLowerCase();
  const baseTemplate = template || currentTemplateEdit;
  const selectedByTool = new Map((baseTemplate?.items || []).map((item) => [item.toolId, item]));
  const tools = state.tools.filter((tool) => {
    const category = getCategory(tool.categoryId);
    const text = `${tool.name} ${tool.internalCode} ${category?.name || ""}`.toLowerCase();
    return tool.status !== "inactive" && (!query || text.includes(query));
  });

  els.templateToolList.innerHTML = tools
    .map((tool) => {
      const category = getCategory(tool.categoryId);
      return `
        <label class="required-tool-option">
          <input type="checkbox" value="${tool.id}" data-template-tool ${selectedByTool.has(tool.id) ? "checked" : ""} />
          ${renderRequiredPickerPhoto(tool)}
          <span>
            <strong>${escapeHtml(tool.name)}</strong>
            <small>${escapeHtml(tool.internalCode)} - ${escapeHtml(category?.name || "Sem categoria")} - ${statusLabels[tool.status] || tool.status}</small>
          </span>
          ${
            tool.controlModel === "quantity"
              ? `<input class="input required-qty" type="number" min="1" value="${selectedByTool.get(tool.id)?.quantity || 1}" data-template-qty="${tool.id}" aria-label="Quantidade" />`
              : ""
          }
        </label>
      `;
    })
    .join("");

  bindRequiredPhotoButtons(els.templateToolList);
}

function renderTemplateBoxPicker(template = null) {
  const baseTemplate = template || currentTemplateEdit;
  const selectedIds = new Set((baseTemplate?.boxes || []).map((box) => box.boxId));
  const boxes = state.workBoxes || [];

  els.templateBoxList.innerHTML =
    boxes
      .map((box) => {
        const summary = getWorkBoxSummary(box);
        return `
          <label class="required-box-option">
            <input type="checkbox" value="${box.id}" data-template-box ${selectedIds.has(box.id) ? "checked" : ""} />
            <span>
              <strong>${escapeHtml(box.name)}</strong>
              <small>${box.responsible ? `Responsavel: ${escapeHtml(box.responsible)} - ` : ""}${summary.total} itens esperados</small>
            </span>
          </label>
        `;
      })
      .join("") || `<p class="muted-text">Nenhuma caixa cadastrada.</p>`;
}

async function handleTemplateAction(action, id) {
  const template = (state.separationTemplates || []).find((item) => item.id === id);
  if (!template) return;

  if (action === "edit") {
    openTemplateDialog(template);
    return;
  }

  if (action === "delete") {
    const confirmed = confirm(`Excluir definitivamente o modelo "${template.name}"?`);
    if (!confirmed) return;

    try {
      state = await api(`/api/separation-templates/${id}`, { method: "DELETE" });
      render();
      showToast("Modelo excluido.");
    } catch (error) {
      showToast(error.message);
    }
  }
}

async function saveTemplateFromForm() {
  const id = document.querySelector("#templateId").value;
  const selected = [...els.templateToolList.querySelectorAll("[data-template-tool]:checked")].map((input) => {
    const qtyInput = els.templateToolList.querySelector(`[data-template-qty="${input.value}"]`);
    return {
      toolId: input.value,
      quantity: Number(qtyInput?.value || 1),
    };
  });
  const selectedBoxes = [...els.templateBoxList.querySelectorAll("[data-template-box]:checked")].map((input) => ({ boxId: input.value }));

  const payload = {
    name: document.querySelector("#templateName").value.trim(),
    notes: document.querySelector("#templateNotes").value.trim(),
    items: selected,
    boxes: selectedBoxes,
  };

  try {
    state = await api(id ? `/api/separation-templates/${id}` : "/api/separation-templates", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    els.templateDialog.close();
    switchView("templates");
    render();
    showToast(id ? "Modelo atualizado." : "Modelo criado.");
  } catch (error) {
    showToast(error.message);
  }
}

function openUserDialog(user = null) {
  els.userForm.reset();
  els.userDialogTitle.textContent = user ? "Editar colaborador" : "Novo colaborador";
  document.querySelector("#userId").value = user?.id || "";
  document.querySelector("#userName").value = user?.name || "";
  document.querySelector("#userEmail").value = user?.email || "";
  document.querySelector("#userPhone").value = user?.phone || "";
  document.querySelector("#userPassword").value = "";
  document.querySelector("#userRole").value = user?.role || "operator";
  document.querySelector("#userAccessStatus").value = user?.accessStatus || "enabled";
  document.querySelector("#userNotes").value = user?.notes || "";
  renderManagerOptions(user);

  document.querySelectorAll("[data-user-permission]").forEach((input) => {
    input.checked = (user?.permissions || []).includes(input.value);
  });

  els.userDialog.showModal();
}

function renderManagerOptions(user = null) {
  const currentId = user?.id || "";
  const options = (state.users || [])
    .filter((item) => item.id !== currentId)
    .map((item) => `<option value="${item.id}">${escapeHtml(item.name)} - ${roleLabels[item.role] || item.role}</option>`)
    .join("");

  els.userManager.innerHTML = `<option value="">Sem gestor direto</option>${options}`;
  els.userManager.value = user?.managerId || "";
}

async function saveUserFromForm() {
  const id = document.querySelector("#userId").value;
  const payload = {
    name: document.querySelector("#userName").value.trim(),
    email: document.querySelector("#userEmail").value.trim(),
    phone: document.querySelector("#userPhone").value.trim(),
    password: document.querySelector("#userPassword").value,
    role: document.querySelector("#userRole").value,
    managerId: document.querySelector("#userManager").value,
    accessStatus: "enabled",
    permissions: ["tools", "required", "categories", "users", "reports"],
    notes: document.querySelector("#userNotes").value.trim(),
  };

  try {
    state = await api(id ? `/api/users/${id}` : "/api/users", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    els.userDialog.close();
    switchView("users");
    render();
    showToast(id ? "Colaborador atualizado." : "Colaborador cadastrado.");
  } catch (error) {
    showToast(error.message);
  }
}

async function handleUserAction(action, id) {
  const user = (state.users || []).find((item) => item.id === id);
  if (!user) return;

  if (action === "edit") {
    openUserDialog(user);
    return;
  }

}

async function handleWorkBoxAction(action, id) {
  const box = (state.workBoxes || []).find((item) => item.id === id);
  if (!box) return;

  if (action === "edit") {
    openWorkBoxDialog(box);
    return;
  }

  if (action === "check") {
    openWorkBoxCheckDialog(box);
    return;
  }

  if (action === "delete") {
    const confirmed = confirm(`Excluir definitivamente a caixa "${box.name}"?`);
    if (!confirmed) return;

    try {
      state = await api(`/api/work-boxes/${id}`, { method: "DELETE" });
      render();
      showToast("Caixa excluida.");
    } catch (error) {
      showToast(error.message);
    }
  }
}

function openWorkBoxDialog(box = null) {
  currentWorkBoxEdit = box;
  els.workBoxForm.reset();
  els.workBoxDialogTitle.textContent = box ? "Editar caixa" : "Nova caixa";
  document.querySelector("#workBoxId").value = box?.id || "";
  document.querySelector("#workBoxName").value = box?.name || "";
  document.querySelector("#workBoxResponsible").value = box?.responsible || "";
  document.querySelector("#workBoxStatus").value = box?.status || "active";
  document.querySelector("#workBoxNotes").value = box?.notes || "";
  els.workBoxToolSearch.value = "";
  renderWorkBoxToolPicker(box);
  els.workBoxDialog.showModal();
}

function renderWorkBoxToolPicker(box = null) {
  const query = els.workBoxToolSearch.value.trim().toLowerCase();
  const baseBox = box || currentWorkBoxEdit;
  const selectedByTool = new Map((baseBox?.items || []).map((item) => [item.toolId, item]));
  const tools = state.tools.filter((tool) => {
    const category = getCategory(tool.categoryId);
    const text = `${tool.name} ${tool.internalCode} ${category?.name || ""}`.toLowerCase();
    return tool.status !== "inactive" && (!query || text.includes(query));
  });

  els.workBoxToolList.innerHTML = tools
    .map((tool) => {
      const selected = selectedByTool.get(tool.id);
      const category = getCategory(tool.categoryId);
      return `
        <label class="required-tool-option work-box-tool-option">
          <input type="checkbox" value="${tool.id}" data-work-box-tool ${selected ? "checked" : ""} />
          ${renderRequiredPickerPhoto(tool)}
          <span>
            <strong>${escapeHtml(tool.name)}</strong>
            <small>${escapeHtml(tool.internalCode)} · ${escapeHtml(category?.name || "Sem categoria")}</small>
          </span>
          <input class="input required-qty" type="number" min="1" value="${selected?.quantity || 1}" data-work-box-qty="${tool.id}" aria-label="Quantidade esperada" />
          <select class="input work-box-required" data-work-box-required="${tool.id}" aria-label="Obrigatorio ou opcional">
            <option value="true" ${selected?.required === false ? "" : "selected"}>Obrigatorio</option>
            <option value="false" ${selected?.required === false ? "selected" : ""}>Opcional</option>
          </select>
        </label>
      `;
    })
    .join("");

  bindRequiredPhotoButtons(els.workBoxToolList);
}

async function saveWorkBoxFromForm() {
  const id = document.querySelector("#workBoxId").value;
  const selected = [...els.workBoxToolList.querySelectorAll("[data-work-box-tool]:checked")].map((input) => {
    const qtyInput = els.workBoxToolList.querySelector(`[data-work-box-qty="${input.value}"]`);
    const requiredInput = els.workBoxToolList.querySelector(`[data-work-box-required="${input.value}"]`);
    return {
      toolId: input.value,
      quantity: Number(qtyInput?.value || 1),
      required: requiredInput?.value !== "false",
    };
  });

  const payload = {
    name: document.querySelector("#workBoxName").value.trim(),
    responsible: document.querySelector("#workBoxResponsible").value.trim(),
    status: document.querySelector("#workBoxStatus").value,
    notes: document.querySelector("#workBoxNotes").value.trim(),
    items: selected,
  };

  try {
    state = await api(id ? `/api/work-boxes/${id}` : "/api/work-boxes", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    els.workBoxDialog.close();
    switchView("workBoxes");
    render();
    showToast(id ? "Caixa atualizada." : "Caixa criada.");
  } catch (error) {
    showToast(error.message);
  }
}

function openWorkBoxCheckDialog(box) {
  els.workBoxCheckForm.reset();
  document.querySelector("#workBoxCheckId").value = box.id;
  document.querySelector("#workBoxCheckedBy").value = currentUser?.name || box.responsible || "";
  document.querySelector("#workBoxCheckNotes").value = "";
  els.workBoxCheckTitle.textContent = box.name;
  els.workBoxCheckList.innerHTML = (box.items || [])
    .map((item) => renderWorkBoxCheckItem(item))
    .join("");
  bindRequiredPhotoButtons(els.workBoxCheckList);
  els.workBoxCheckDialog.showModal();
}

function renderWorkBoxCheckItem(item) {
  return `
    <article class="box-check-item">
      ${renderRequiredItemPhoto({ ...item, id: item.id })}
      <div>
        <strong>${escapeHtml(item.toolName)}</strong>
        <span>${escapeHtml(item.internalCode)} · ${escapeHtml(item.categoryName || "Sem categoria")}</span>
        <span>Quantidade esperada: ${item.quantity}${item.required ? " · Obrigatorio" : " · Opcional"}</span>
      </div>
      <div class="box-check-actions">
        <label><input type="radio" name="box-check-${item.id}" value="ok" data-box-check-item="${item.id}" checked /> OK</label>
        <label><input type="radio" name="box-check-${item.id}" value="missing" data-box-check-item="${item.id}" /> Faltando</label>
        <label><input type="radio" name="box-check-${item.id}" value="substituted" data-box-check-item="${item.id}" /> Substituido</label>
      </div>
    </article>
  `;
}

async function saveWorkBoxCheckFromForm() {
  const boxId = document.querySelector("#workBoxCheckId").value;
  const box = (state.workBoxes || []).find((item) => item.id === boxId);
  if (!box) return;

  const items = (box.items || []).map((item) => {
    const selected = els.workBoxCheckList.querySelector(`[name="box-check-${item.id}"]:checked`);
    return {
      boxItemId: item.id,
      status: selected?.value || "ok",
    };
  });

  try {
    state = await api(`/api/work-boxes/${boxId}/checks`, {
      method: "POST",
      body: JSON.stringify({
        checkedBy: document.querySelector("#workBoxCheckedBy").value.trim(),
        notes: document.querySelector("#workBoxCheckNotes").value.trim(),
        items,
      }),
    });
    els.workBoxCheckDialog.close();
    switchView("workBoxes");
    render();
    showToast("Conferencia registrada.");
  } catch (error) {
    showToast(error.message);
  }
}

function renderRequiredLists() {
  const jobs = state.jobs || [];
  els.requiredEmpty.classList.toggle("hidden", jobs.length > 0);
  els.requiredList.innerHTML = jobs
    .map((job) => {
      const progress = getRequiredProgress(job);
      return `
        <article class="required-card">
          <div class="required-card-header">
            <div>
              <h3>${escapeHtml(job.workName)}</h3>
              <p>${escapeHtml(job.clientName)}${job.scheduledDate ? ` · ${formatShortDate(job.scheduledDate)}` : ""}</p>
              ${job.responsible ? `<p>Responsavel: ${escapeHtml(job.responsible)}</p>` : ""}
            </div>
            <span class="required-status ${progress.statusClass}">${progress.statusLabel}</span>
          </div>

          <div class="required-card-actions">
            <button class="button secondary" type="button" data-required-list-action="edit" data-id="${job.id}">Editar lista</button>
            <button class="button primary" type="button" data-required-list-action="departure" data-id="${job.id}" ${canRegisterDeparture(job) ? "" : "disabled"}>
              ${job.departures?.length ? "Registrar nova saida" : "Registrar saida"}
            </button>
            <button class="button danger" type="button" data-required-list-action="delete" data-id="${job.id}">Excluir lista</button>
          </div>

          ${renderJobBoxes(job)}

          ${renderRequiredOverview(progress)}

          ${renderDepartureHistory(job)}

          <div class="required-progressbar" aria-label="Progresso da separacao">
            <span style="width: ${progress.percent}%"></span>
          </div>

          <button class="required-toggle" type="button" data-required-toggle="${job.id}">
            Ver itens da lista
          </button>

          <div class="required-items hidden" id="required-items-${job.id}">
            ${renderRequiredGroup("Ainda falta separar", job.items.filter((item) => item.status === "pending"))}
            ${renderRequiredGroup("Ja separado", job.items.filter((item) => item.status === "separated"))}
            ${renderRequiredGroup("Problemas / faltantes", job.items.filter((item) => item.status === "missing"))}
          </div>
        </article>
      `;
    })
    .join("");

  els.requiredList.querySelectorAll("button[data-required-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      await updateRequiredItemStatus(button.dataset.id, button.dataset.requiredAction);
    });
  });

  els.requiredList.querySelectorAll("[data-required-toggle]").forEach((button) => {
    button.addEventListener("click", () => toggleRequiredItems(button));
  });

  els.requiredList.querySelectorAll("[data-required-list-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      await handleRequiredListAction(button.dataset.requiredListAction, button.dataset.id);
    });
  });

  els.requiredList.querySelectorAll("[data-job-box-toggle]").forEach((button) => {
    button.addEventListener("click", () => toggleJobBoxItems(button));
  });

  els.requiredList.querySelectorAll("[data-job-box-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      await updateJobBoxItemStatus(button.dataset.id, button.dataset.jobBoxAction);
    });
  });

  bindRequiredPhotoButtons(els.requiredList);
}

function renderJobBoxes(job) {
  const boxes = job.boxes || [];
  if (boxes.length === 0) return "";

  return `
    <section class="job-boxes">
      <h4>Caixas que vao nesta obra</h4>
      <div class="job-box-list-expanded">
        ${boxes
          .map((box) => renderJobBox(box))
          .join("")}
      </div>
    </section>
  `;
}

function renderJobBox(box) {
  const progress = getJobBoxProgress(box);
  return `
    <article class="job-box-card">
      <div class="job-box-card-header">
        <div>
          <strong>${escapeHtml(box.name)}</strong>
          <small>${box.responsible ? `Responsavel: ${escapeHtml(box.responsible)}` : "Sem responsavel"}</small>
        </div>
        <span class="required-status ${progress.statusClass}">${progress.statusLabel}</span>
      </div>

      <div class="job-box-progress">
        <strong>${progress.done} de ${progress.total} itens conferidos</strong>
        <small>${progress.message}</small>
      </div>

      <button class="required-toggle" type="button" data-job-box-toggle="${box.id}">
        Ver itens da caixa
      </button>

      <div class="job-box-items hidden" id="job-box-items-${box.id}">
        ${box.items?.length ? box.items.map((item) => renderJobBoxItem(item)).join("") : `<p class="muted-text">Esta caixa nao possui itens definidos.</p>`}
      </div>
    </article>
  `;
}

function getJobBoxProgress(box) {
  const items = box.items || [];
  const total = items.length;
  const ok = items.filter((item) => item.status === "ok").length;
  const substituted = items.filter((item) => item.status === "substituted").length;
  const missing = items.filter((item) => item.status === "missing").length;
  const pending = items.filter((item) => item.status === "pending").length;
  const done = ok + substituted;

  if (missing > 0) {
    return { total, done, missing, pending, statusClass: "blocked", statusLabel: "Com pendencia", message: `${missing} item(ns) faltando.` };
  }

  if (total > 0 && done === total) {
    return { total, done, missing, pending, statusClass: "ready", statusLabel: "Conferida", message: "Todos os itens da caixa foram conferidos." };
  }

  return { total, done, missing, pending, statusClass: "preparing", statusLabel: "A conferir", message: `Faltam ${pending} item(ns) para conferir.` };
}

function renderJobBoxItem(item) {
  const statusLabel = {
    pending: "A conferir",
    ok: "OK",
    missing: "Faltando",
    substituted: "Substituido",
  }[item.status] || item.status;

  return `
    <article class="job-box-item ${item.status}">
      ${renderRequiredItemPhoto({ ...item, id: item.id })}
      <div>
        <div class="required-item-title">
          <strong>${escapeHtml(item.toolName)}</strong>
          <span class="required-item-status ${item.status}">${statusLabel}</span>
        </div>
        <span>${escapeHtml(item.internalCode)} · ${escapeHtml(item.categoryName || "Sem categoria")}</span>
        <span>Quantidade: ${item.quantity}${item.required ? " · Obrigatorio" : " · Opcional"}</span>
      </div>
      <div class="required-item-actions">
        <button class="required-action-button ok ${item.status === "ok" ? "active" : ""}" type="button" data-job-box-action="ok" data-id="${item.id}" aria-pressed="${item.status === "ok"}">OK</button>
        <button class="required-action-button danger ${item.status === "missing" ? "active" : ""}" type="button" data-job-box-action="missing" data-id="${item.id}" aria-pressed="${item.status === "missing"}">Faltando</button>
        <button class="required-action-button neutral ${item.status === "pending" ? "active" : ""}" type="button" data-job-box-action="pending" data-id="${item.id}" aria-pressed="${item.status === "pending"}">A conferir</button>
        <button class="required-action-button warn ${item.status === "substituted" ? "active" : ""}" type="button" data-job-box-action="substituted" data-id="${item.id}" aria-pressed="${item.status === "substituted"}">Substituido</button>
      </div>
    </article>
  `;
}

function toggleJobBoxItems(button) {
  const target = document.querySelector(`#job-box-items-${button.dataset.jobBoxToggle}`);
  if (!target) return;

  const willOpen = target.classList.contains("hidden");
  target.classList.toggle("hidden", !willOpen);
  button.textContent = willOpen ? "Ocultar itens da caixa" : "Ver itens da caixa";
}

function toggleRequiredItems(button) {
  const target = document.querySelector(`#required-items-${button.dataset.requiredToggle}`);
  if (!target) return;

  const willOpen = target.classList.contains("hidden");
  target.classList.toggle("hidden", !willOpen);
  button.textContent = willOpen ? "Ocultar itens da lista" : "Ver itens da lista";
}

function getRequiredProgress(job) {
  const total = job.items.length;
  const separated = job.items.filter((item) => item.status === "separated").length;
  const missing = job.items.filter((item) => item.status === "missing").length;
  const pending = job.items.filter((item) => item.status === "pending").length;
  const percent = total ? Math.round((separated / total) * 100) : 0;
  const remaining = pending + missing;

  if (missing > 0) {
    return {
      total,
      separated,
      missing,
      pending,
      remaining,
      percent,
      phase: "pendencias",
      statusClass: "blocked",
      statusLabel: "Tem problema",
      message: `${missing} item(ns) faltando. Resolva antes de liberar a saida.`,
    };
  }

  if (total > 0 && separated === total) {
    return {
      total,
      separated,
      missing,
      pending,
      remaining,
      percent,
      phase: "pronta",
      statusClass: "ready",
      statusLabel: "Pronta para sair",
      message: "Tudo separado. A equipe pode seguir para a obra.",
    };
  }

  if (separated > 0 || pending > 0) {
    return {
      total,
      separated,
      missing,
      pending,
      remaining,
      percent,
      phase: "separacao",
      statusClass: "preparing",
      statusLabel: "Separando",
      message: `Faltam ${pending} item(ns) para conferir.`,
    };
  }

  return {
    total,
    separated,
    missing,
    pending,
    remaining,
    percent,
    phase: "planejamento",
    statusClass: "draft",
    statusLabel: "Planejada",
    message: "Lista criada. Comece a separacao quando for preparar a obra.",
  };
}

function renderRequiredOverview(progress) {
  return `
    <div class="required-overview">
      <div class="required-overview-main">
        <span class="required-status ${progress.statusClass}">${progress.statusLabel}</span>
        <strong>${progress.separated} de ${progress.total} itens separados</strong>
        <p>${escapeHtml(progress.message)}</p>
      </div>
      <div class="required-kpis" aria-label="Resumo da lista requerida">
        <span><strong>${progress.pending}</strong><small>A separar</small></span>
        <span><strong>${progress.separated}</strong><small>Separados</small></span>
        <span class="${progress.missing > 0 ? "danger" : ""}"><strong>${progress.missing}</strong><small>Faltantes</small></span>
        <span><strong>${progress.percent}%</strong><small>Pronto</small></span>
      </div>
    </div>
  `;
}

function renderRequiredGroup(title, items) {
  if (items.length === 0) return "";

  return `
    <section class="required-group">
      <h4>${title} <span>${items.length}</span></h4>
      <div class="required-group-items">
        ${items.map((item) => renderRequiredItem(item)).join("")}
      </div>
    </section>
  `;
}

function renderRequiredItem(item) {
  const itemStatusLabel = {
    pending: "A separar",
    separated: "Separado",
    missing: "Faltando",
  }[item.status] || item.status;

  return `
    <article class="required-item ${item.status}">
      ${renderRequiredItemPhoto(item)}
      <div>
        <div class="required-item-title">
          <strong>${escapeHtml(item.toolName)}</strong>
          <span class="required-item-status ${item.status}">${itemStatusLabel}</span>
        </div>
        <span>${escapeHtml(item.internalCode)} · ${escapeHtml(item.categoryName || "Sem categoria")}</span>
        ${item.quantity > 1 ? `<span>Quantidade: ${item.quantity}</span>` : ""}
      </div>
      <div class="required-item-actions">
        <button class="required-action-button ok ${item.status === "separated" ? "active" : ""}" type="button" data-required-action="separated" data-id="${item.id}" aria-pressed="${item.status === "separated"}">Separado</button>
        <button class="required-action-button danger ${item.status === "missing" ? "active" : ""}" type="button" data-required-action="missing" data-id="${item.id}" aria-pressed="${item.status === "missing"}">Faltando</button>
        <button class="required-action-button neutral ${item.status === "pending" ? "active" : ""}" type="button" data-required-action="pending" data-id="${item.id}" aria-pressed="${item.status === "pending"}">A separar</button>
      </div>
    </article>
  `;
}

function renderRequiredItemPhoto(item) {
  const photoSource = item.photoData || item.photoUrl;
  if (photoSource) {
    return `
      <button class="required-photo-button" type="button" data-action="view-photo" data-photo-tool-id="${item.toolId}" title="Ampliar foto">
        <img class="required-tool-photo" src="${photoSource}" alt="Foto de ${escapeHtml(item.toolName)}" />
      </button>
    `;
  }

  return `<div class="required-tool-photo placeholder" aria-label="Sem foto">SF</div>`;
}

function openRequiredDialog(job = null) {
  currentRequiredEditJob = job;
  els.requiredForm.reset();
  els.requiredDialogTitle.textContent = job ? "Editar lista da obra" : "Nova lista para obra";
  document.querySelector("#requiredId").value = job?.id || "";
  document.querySelector("#requiredClient").value = job?.clientName || "";
  document.querySelector("#requiredWork").value = job?.workName || "";
  document.querySelector("#requiredDate").value = job?.scheduledDate || "";
  document.querySelector("#requiredResponsible").value = job?.responsible || "";
  document.querySelector("#requiredNotes").value = job?.notes || "";
  renderRequiredTemplateOptions();
  els.requiredTemplateField.classList.toggle("hidden", Boolean(job));
  els.requiredTemplateSelect.value = "";
  els.requiredToolSearch.value = "";
  renderRequiredToolPicker(job);
  renderRequiredBoxPicker(job);
  switchRequiredDialogTab("tools");
  els.requiredDialog.showModal();
}

function renderRequiredTemplateOptions() {
  const templates = state.separationTemplates || [];
  els.requiredTemplateSelect.innerHTML = `<option value="">Selecionar modelo para carregar itens</option>${templates
    .map((template) => `<option value="${template.id}">${escapeHtml(template.name)}</option>`)
    .join("")}`;
}

function applySelectedTemplateToRequiredDialog() {
  const template = (state.separationTemplates || []).find((item) => item.id === els.requiredTemplateSelect.value);
  if (!template) return;

  template.items.forEach((item) => {
    const input = els.requiredToolList.querySelector(`[data-required-tool][value="${cssEscape(item.toolId)}"]`);
    if (input) input.checked = true;
    const qtyInput = els.requiredToolList.querySelector(`[data-required-qty="${cssEscape(item.toolId)}"]`);
    if (qtyInput) qtyInput.value = item.quantity || 1;
  });

  template.boxes.forEach((box) => {
    const input = els.requiredBoxList.querySelector(`[data-required-box][value="${cssEscape(box.boxId)}"]`);
    if (input) input.checked = true;
  });

  showToast(`Modelo "${template.name}" carregado.`);
}

function switchRequiredDialogTab(tab) {
  els.requiredTabButtons.forEach((button) => button.classList.toggle("active", button.dataset.requiredTab === tab));
  els.requiredTabPanels.forEach((panel) => panel.classList.toggle("hidden", panel.dataset.requiredTabPanel !== tab));
}

function renderRequiredToolPicker(job = null) {
  const query = els.requiredToolSearch.value.trim().toLowerCase();
  const baseJob = job || currentRequiredEditJob;
  const selectedByTool = new Map((baseJob?.items || []).map((item) => [item.toolId, item]));
  const tools = state.tools.filter((tool) => {
    const category = getCategory(tool.categoryId);
    const text = `${tool.name} ${tool.internalCode} ${category?.name || ""}`.toLowerCase();
    return tool.status !== "inactive" && (!query || text.includes(query));
  });

  els.requiredToolList.innerHTML = tools
    .map((tool) => {
      const category = getCategory(tool.categoryId);
      return `
        <label class="required-tool-option">
          <input type="checkbox" value="${tool.id}" data-required-tool ${selectedByTool.has(tool.id) ? "checked" : ""} />
          ${renderRequiredPickerPhoto(tool)}
          <span>
            <strong>${escapeHtml(tool.name)}</strong>
            <small>${escapeHtml(tool.internalCode)} · ${escapeHtml(category?.name || "Sem categoria")} · ${statusLabels[tool.status] || tool.status}</small>
          </span>
          ${
            tool.controlModel === "quantity"
              ? `<input class="input required-qty" type="number" min="1" value="${selectedByTool.get(tool.id)?.quantity || 1}" data-required-qty="${tool.id}" aria-label="Quantidade" />`
              : ""
          }
        </label>
      `;
    })
    .join("");

  bindRequiredPhotoButtons(els.requiredToolList);
}

function renderRequiredBoxPicker(job = null) {
  const baseJob = job || currentRequiredEditJob;
  const selectedIds = new Set((baseJob?.boxes || []).map((box) => box.boxId));
  const boxes = state.workBoxes || [];

  els.requiredBoxList.innerHTML =
    boxes
      .map((box) => {
        const summary = getWorkBoxSummary(box);
        const lastCheck = box.checks?.[0];
        return `
          <label class="required-box-option">
            <input type="checkbox" value="${box.id}" data-required-box ${selectedIds.has(box.id) ? "checked" : ""} />
            <span>
              <strong>${escapeHtml(box.name)}</strong>
              <small>${box.responsible ? `Responsavel: ${escapeHtml(box.responsible)} · ` : ""}${summary.total} itens esperados</small>
              <small>${lastCheck ? `Ultima conferencia: ${formatDate(lastCheck.createdAt)}` : "Ainda sem conferencia registrada"}</small>
            </span>
          </label>
        `;
      })
      .join("") || `<p class="muted-text">Nenhuma caixa cadastrada.</p>`;
}

async function handleRequiredListAction(action, id) {
  const job = (state.jobs || []).find((item) => item.id === id);
  if (!job) return;

  if (action === "edit") {
    openRequiredDialog(job);
    return;
  }

  if (action === "delete") {
    const confirmed = confirm(`Excluir definitivamente a lista "${job.workName}"?`);
    if (!confirmed) return;

    try {
      state = await api(`/api/jobs/${id}`, { method: "DELETE" });
      render();
      showToast("Lista excluida.");
    } catch (error) {
      showToast(error.message);
    }
  }

  if (action === "departure") {
    await registerJobDeparture(job);
  }
}

function canRegisterDeparture(job) {
  const hasSeparatedTools = (job.items || []).some((item) => item.status === "separated");
  const hasCheckedBoxItems = (job.boxes || []).some((box) => (box.items || []).some((item) => ["ok", "substituted"].includes(item.status)));
  return hasSeparatedTools || hasCheckedBoxItems || (job.boxes || []).length > 0;
}

function renderDepartureHistory(job) {
  const departures = job.departures || [];
  if (departures.length === 0) {
    return `
      <section class="departure-history empty">
        <h4>Historico de saidas</h4>
        <p>Nenhuma saida registrada para esta obra.</p>
      </section>
    `;
  }

  return `
    <section class="departure-history">
      <h4>Historico de saidas</h4>
      <div class="departure-list">
        ${departures
          .map((departure) => {
            const toolCount = (departure.items || []).filter((item) => item.sourceType === "tool").length;
            const boxItemCount = (departure.items || []).filter((item) => item.sourceType === "box_item").length;
            return `
              <article class="departure-card">
                <div>
                  <strong>Saida em ${formatDate(departure.createdAt)}</strong>
                  <span>${departure.responsible ? `Responsavel: ${escapeHtml(departure.responsible)}` : "Sem responsavel informado"}</span>
                  ${departure.notes ? `<span>${escapeHtml(departure.notes)}</span>` : ""}
                </div>
                <div class="departure-kpis">
                  <span><strong>${toolCount}</strong><small>Ferramentas</small></span>
                  <span><strong>${departure.boxes?.length || 0}</strong><small>Caixas</small></span>
                  <span><strong>${boxItemCount}</strong><small>Itens das caixas</small></span>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

async function registerJobDeparture(job) {
  const confirmed = confirm(`Registrar saida da obra "${job.workName}" agora?`);
  if (!confirmed) return;

  try {
    state = await api(`/api/jobs/${job.id}/departures`, {
      method: "POST",
      body: JSON.stringify({
        responsible: job.responsible || "",
        notes: "",
      }),
    });
    render();
    showToast("Saida registrada.");
  } catch (error) {
    showToast(error.message);
  }
}

function bindRequiredPhotoButtons(root) {
  root.querySelectorAll("[data-photo-tool-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const tool = state.tools.find((item) => item.id === button.dataset.photoToolId);
      const photoSource = tool?.photoData || tool?.photoUrl;
      if (photoSource) openPhotoDialog(photoSource, tool.name);
    });
  });
}

function renderRequiredPickerPhoto(tool) {
  const photoSource = tool.photoData || tool.photoUrl;
  if (photoSource) {
    return `
      <button class="required-photo-button" type="button" data-action="view-photo" data-photo-tool-id="${tool.id}" title="Ampliar foto">
        <img class="required-picker-photo" src="${photoSource}" alt="Foto de ${escapeHtml(tool.name)}" />
      </button>
    `;
  }

  return `<div class="required-picker-photo placeholder" aria-label="Sem foto">SF</div>`;
}

async function saveRequiredListFromForm() {
  const id = document.querySelector("#requiredId").value;
  const selected = [...els.requiredToolList.querySelectorAll("[data-required-tool]:checked")].map((input) => {
    const qtyInput = els.requiredToolList.querySelector(`[data-required-qty="${input.value}"]`);
    return {
      toolId: input.value,
      quantity: Number(qtyInput?.value || 1),
    };
  });
  const selectedBoxes = [...els.requiredBoxList.querySelectorAll("[data-required-box]:checked")].map((input) => ({ boxId: input.value }));

  const payload = {
    clientName: document.querySelector("#requiredClient").value.trim(),
    workName: document.querySelector("#requiredWork").value.trim(),
    scheduledDate: document.querySelector("#requiredDate").value,
    responsible: document.querySelector("#requiredResponsible").value.trim(),
    notes: document.querySelector("#requiredNotes").value.trim(),
    items: selected,
    boxes: selectedBoxes,
  };

  try {
    state = await api(id ? `/api/jobs/${id}` : "/api/jobs", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    els.requiredDialog.close();
    switchView("required");
    render();
    showToast(id ? "Lista atualizada." : "Lista requerida criada.");
  } catch (error) {
    showToast(error.message);
  }
}

async function updateRequiredItemStatus(id, status) {
  const openListIds = getOpenRequiredListIds();
  const openBoxIds = getOpenJobBoxIds();
  try {
    state = await api(`/api/required-items/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    render();
    restoreOpenRequiredLists(openListIds);
    restoreOpenJobBoxes(openBoxIds);
    showToast("Item atualizado.");
  } catch (error) {
    showToast(error.message);
  }
}

async function updateJobBoxItemStatus(id, status) {
  const openListIds = getOpenRequiredListIds();
  const openBoxIds = getOpenJobBoxIds();
  try {
    state = await api(`/api/job-box-items/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    render();
    restoreOpenRequiredLists(openListIds);
    restoreOpenJobBoxes(openBoxIds);
    showToast("Item da caixa atualizado.");
  } catch (error) {
    showToast(error.message);
  }
}

function getOpenRequiredListIds() {
  return [...els.requiredList.querySelectorAll(".required-items:not(.hidden)")].map((item) => item.id.replace("required-items-", ""));
}

function getOpenJobBoxIds() {
  return [...els.requiredList.querySelectorAll(".job-box-items:not(.hidden)")].map((item) => item.id.replace("job-box-items-", ""));
}

function restoreOpenRequiredLists(ids) {
  ids.forEach((id) => {
    const target = document.querySelector(`#required-items-${id}`);
    const button = els.requiredList.querySelector(`[data-required-toggle="${id}"]`);
    if (!target || !button) return;

    target.classList.remove("hidden");
    button.textContent = "Ocultar itens da lista";
  });
}

function restoreOpenJobBoxes(ids) {
  ids.forEach((id) => {
    const target = document.querySelector(`#job-box-items-${id}`);
    const button = els.requiredList.querySelector(`[data-job-box-toggle="${id}"]`);
    if (!target || !button) return;

    target.classList.remove("hidden");
    button.textContent = "Ocultar itens da caixa";
  });
}

function applyCategoryGuide(categoryName) {
  const normalized = normalizeText(categoryName);
  const category = state.categories.find((item) => normalizeText(item.name) === normalized);
  if (!category) {
    showToast("Categoria nao encontrada.");
    return;
  }

  document.querySelector("#toolCategory").value = category.id;
  updateSubcategoryOptions();
  updateCategoryGuideSelection();
}

function updateCategoryGuideSelection() {
  const category = getCategory(document.querySelector("#toolCategory").value);
  const selected = normalizeText(category?.name || "");
  els.categoryGuideCards.forEach((button) => {
    button.classList.toggle("active", normalizeText(button.dataset.categoryMatch) === selected);
  });
}

function openToolDialog(tool = null) {
  els.toolForm.reset();
  document.querySelector("#toolDialogTitle").textContent = tool ? "Editar ferramenta" : "Nova ferramenta";
  document.querySelector("#toolId").value = tool?.id || "";
  document.querySelector("#toolName").value = tool?.name || "";
  document.querySelector("#toolCode").value = tool?.internalCode || "";
  renderToolOwnerOptions(tool?.owner || "MÖBI");
  if ([...document.querySelector("#toolOwner").options].some((option) => option.value === (tool?.owner || "MÖBI"))) {
    document.querySelector("#toolOwner").value = tool?.owner || "MÖBI";
  }
  document.querySelector("#toolCategory").value = tool?.categoryId || state.categories[0]?.id || "";
  updateSubcategoryOptions(tool?.subcategory || "");
  document.querySelector("#toolControlModel").value = tool?.controlModel || "individual";
  document.querySelector("#toolQuantity").value = tool?.quantity ?? 1;
  document.querySelector("#toolStatus").value = tool?.status || "active";
  renderLoanedToOptions();
  renderCurrentJobOptions(tool?.currentJobId || "", tool?.currentJobLabel || "");
  document.querySelector("#toolLoanedTo").value = tool?.loanedTo || "";
  document.querySelector("#toolCurrentJobId").value = tool?.currentJobId || "";
  document.querySelector("#toolCurrentJobLabel").value = tool?.currentJobLabel || "";
  updateToolLocationFields();
  document.querySelector("#toolQrReady").value = String(tool?.qrReady ?? true);
  document.querySelector("#toolNotes").value = tool?.notes || "";
  currentPhotoData = tool?.photoData || "";
  renderPhotoPreview();
  setToolStep(0);
  updateCategoryGuideSelection();
  els.toolDialog.showModal();
}

function setToolStep(step) {
  currentToolStep = Math.max(0, Math.min(step, els.toolSteps.length - 1));

  els.toolSteps.forEach((item) => {
    item.classList.toggle("active", Number(item.dataset.step) === currentToolStep);
  });

  els.toolStepButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.toolStep) === currentToolStep);
    button.classList.toggle("done", Number(button.dataset.toolStep) < currentToolStep);
  });

  els.prevToolStepBtn.classList.toggle("hidden", currentToolStep === 0);
  els.nextToolStepBtn.classList.toggle("hidden", currentToolStep === els.toolSteps.length - 1);
  els.saveToolBtn.classList.toggle("hidden", currentToolStep !== els.toolSteps.length - 1);
}

function validateToolStep(step) {
  const fieldsByStep = {
    1: ["#toolName"],
    2: ["#toolCategory", "#toolControlModel", "#toolQuantity"],
    3: ["#toolStatus"],
  };

  for (const selector of fieldsByStep[step] || []) {
    const field = document.querySelector(selector);
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }

  if (step === 3) {
    const status = document.querySelector("#toolStatus").value;
    if (status === "loaned" && !document.querySelector("#toolLoanedTo").value.trim()) {
      showToast("Informe para quem a ferramenta foi emprestada.");
      document.querySelector("#toolLoanedTo").focus();
      return false;
    }
    if (status === "in_work" && !document.querySelector("#toolCurrentJobLabel").value.trim()) {
      showToast("Informe a obra atual da ferramenta.");
      document.querySelector("#toolCurrentJobLabel").focus();
      return false;
    }
  }

  return true;
}

function canMoveToToolStep(nextStep) {
  if (nextStep <= currentToolStep) return true;

  for (let step = currentToolStep; step < nextStep; step += 1) {
    if (!validateToolStep(step)) return false;
  }

  return true;
}

function validateToolForm() {
  for (let step = 0; step < els.toolSteps.length; step += 1) {
    if (!validateToolStep(step)) {
      setToolStep(step);
      return false;
    }
  }

  return true;
}

function openCategoryDialog() {
  els.categoryForm.reset();
  els.categoryDialog.showModal();
}

async function openDetailDialog(id, focusHistory = false) {
  const tool = state.tools.find((item) => item.id === id);
  if (!tool) return;

  currentDetailToolId = id;
  const category = getCategory(tool.categoryId);
  let history = await api(`/api/tools/${id}/history`);

  if (history.length === 0) {
    history = [
      {
        id: `${id}-created-fallback`,
        description: `Cadastro criado: ${tool.name}`,
        createdAt: tool.createdAt,
      },
    ];
  }

  els.detailToolName.textContent = tool.name;
  els.detailCode.textContent = tool.internalCode;
  els.detailStatus.innerHTML = `<span class="badge ${tool.status}">${statusLabels[tool.status] || tool.status}</span>`;
  els.detailCategory.textContent = `${category?.name || "Sem categoria"}${tool.subcategory ? ` / ${tool.subcategory}` : ""}`;
  els.detailOwner.textContent = tool.owner || "MÖBI";
  els.detailLocation.textContent =
    tool.status === "loaned" && tool.loanedTo
      ? `Emprestada para ${tool.loanedTo}`
      : tool.status === "in_work" && (tool.currentJobLabel || tool.currentJobId)
        ? `Em obra: ${tool.currentJobLabel || tool.currentJobId}`
        : "Sem localizacao especial";
  els.detailControl.textContent = `${controlLabels[tool.controlModel]}${tool.controlModel === "quantity" ? ` (${tool.quantity})` : ""}`;
  els.detailQrBtn.classList.toggle("hidden", tool.controlModel !== "individual");

  const photoSource = tool.photoData || tool.photoUrl;
  const hasPhoto = Boolean(photoSource);
  els.detailPhoto.classList.toggle("hidden", !hasPhoto);
  els.detailPhotoPlaceholder.classList.toggle("hidden", hasPhoto);
  if (hasPhoto) els.detailPhoto.src = photoSource;

  els.detailHistoryList.innerHTML =
    history
      .map(
        (item) => `
          <article class="history-item">
            <strong>${escapeHtml(item.description)}</strong>
            <span>${formatDate(item.createdAt)}</span>
          </article>
        `,
      )
      .join("") || `<p class="muted-text">Nenhum historico registrado.</p>`;

  els.detailDialog.showModal();
  if (focusHistory) {
    els.detailHistoryList.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function saveToolFromForm() {
  const id = document.querySelector("#toolId").value;
  const payload = {
    name: document.querySelector("#toolName").value.trim(),
    internalCode: document.querySelector("#toolCode").value.trim(),
    owner: document.querySelector("#toolOwner").value.trim(),
    categoryId: document.querySelector("#toolCategory").value,
    subcategory: document.querySelector("#toolSubcategory").value,
    controlModel: document.querySelector("#toolControlModel").value,
    quantity: Number(document.querySelector("#toolQuantity").value || 0),
    status: document.querySelector("#toolStatus").value,
    loanedTo: document.querySelector("#toolLoanedTo").value.trim(),
    currentJobId: document.querySelector("#toolCurrentJobId").value,
    currentJobLabel: document.querySelector("#toolCurrentJobLabel").value.trim(),
    qrReady: document.querySelector("#toolQrReady").value === "true",
    photoData: currentPhotoData,
    notes: document.querySelector("#toolNotes").value.trim(),
  };

  try {
    state = await api(id ? `/api/tools/${id}` : "/api/tools", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    els.toolDialog.close();
    render();
    showToast(id ? "Ferramenta atualizada." : "Ferramenta cadastrada.");
  } catch (error) {
    showToast(error.message);
  }
}

async function saveCategoryFromForm() {
  const payload = {
    name: document.querySelector("#categoryName").value.trim(),
    subcategories: document
      .querySelector("#categorySubcategories")
      .value.split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
  };

  try {
    state = await api("/api/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    els.categoryDialog.close();
    render();
    showToast("Categoria cadastrada.");
  } catch (error) {
    showToast(error.message);
  }
}

async function handleToolAction(action, id) {
  const tool = state.tools.find((item) => item.id === id);
  if (!tool) return;

  try {
    if (action === "edit") {
      const fullTool = await api(`/api/tools/${id}`);
      openToolDialog(fullTool);
    }

    if (action === "detail") {
      await openDetailDialog(id);
    }

    if (action === "history") {
      await openDetailDialog(id, true);
    }

    if (action === "duplicate") {
      state = await api(`/api/tools/${id}/duplicate`, { method: "POST" });
      render();
      showToast("Ferramenta duplicada.");
    }

    if (action === "qr") {
      await openQrDialog(id);
    }

    if (action === "inactive") {
      state = await api(`/api/tools/${id}/inactivate`, { method: "PATCH" });
      render();
      showToast("Ferramenta inativada.");
    }

    if (action === "delete") {
      const confirmed = confirm(`Excluir definitivamente a ferramenta "${tool.name}"?`);
      if (!confirmed) return;

      state = await api(`/api/tools/${id}`, { method: "DELETE" });
      render();
      showToast("Ferramenta excluida.");
    }
  } catch (error) {
    showToast(error.message);
  }
}

async function openQrDialog(id) {
  currentQr = await api(`/api/tools/${id}/qr`);
  els.qrToolName.textContent = currentQr.name;
  els.qrImage.src = currentQr.dataUrl;
  els.qrInternalCode.textContent = currentQr.internalCode;
  els.qrPayload.textContent = currentQr.payload;
  els.qrDialog.showModal();
}

function downloadCurrentQr() {
  if (!currentQr) return;
  const link = document.createElement("a");
  link.href = currentQr.dataUrl;
  link.download = `${currentQr.internalCode}-qrcode.png`;
  link.click();
}

async function seedExamples() {
  if (state.tools.length > 0 && !confirm("Adicionar exemplos ao cadastro atual?")) return;
  state = await api("/api/seed", { method: "POST" });
  render();
  showToast("Exemplos carregados.");
}

async function exportJson() {
  const data = await api("/api/export");
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `moble-tools-cadastro-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function getCategory(id) {
  return state.categories.find((category) => category.id === id);
}

function renderPhoto(tool) {
  const photoSource = tool.photoData || tool.photoUrl;
  if (photoSource) {
    return `
      <button class="tool-photo-button" type="button" data-action="view-photo" data-id="${tool.id}" title="Ampliar foto">
        <img class="tool-photo" src="${photoSource}" alt="Foto de ${escapeHtml(tool.name)}" />
      </button>
    `;
  }

  return `<div class="tool-photo-placeholder" aria-label="Sem foto">SF</div>`;
}

function openPhotoDialog(photoData, title) {
  els.photoDialogTitle.textContent = title || "Visualizar foto";
  els.photoDialogImage.src = photoData;
  els.photoDialog.showModal();
}

function handlePhotoSelection(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Selecione um arquivo de imagem.");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    currentPhotoData = String(reader.result || "");
    renderPhotoPreview();
  };
  reader.readAsDataURL(file);
}

function renderPhotoPreview() {
  const hasPhoto = Boolean(currentPhotoData);
  els.toolPhotoPreview.classList.toggle("hidden", !hasPhoto);
  els.removePhotoBtn.classList.toggle("hidden", !hasPhoto);
  if (hasPhoto) els.toolPhotoPreview.src = currentPhotoData;
}

function removeCurrentPhoto() {
  currentPhotoData = "";
  els.toolPhoto.value = "";
  els.toolCameraPhoto.value = "";
  renderPhotoPreview();
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(String(value));
  return String(value).replace(/["\\]/g, "\\$&");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getInitials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => els.toast.classList.add("hidden"), 2600);
}

/** Ponte entre aplicativos — cadastro oficial na Platform. */
window.MoobleOs = {
  openCollaboratorWizard(opts = {}) {
    sessionStorage.setItem(
      "moble_wizard_return",
      JSON.stringify({ product: opts.returnProduct || "admin", view: opts.returnView || "employees" }),
    );
    sessionStorage.setItem("moble_admin_initial_view", "collaboratorWizard");
    openProduct("admin");
  },
  openPersonEdit(personId) {
    if (personId) sessionStorage.setItem("moble_admin_person_edit", personId);
    sessionStorage.setItem("moble_admin_initial_view", "people");
    openProduct("admin");
  },
};
window.openProduct = openProduct;

bindEvents();
await boot();
