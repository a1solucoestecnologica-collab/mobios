/**
 * Formulário compartilhado — cadastro oficial da Plataforma (Pessoas).
 */
export const GENDER_OPTIONS = ["", "Masculino", "Feminino", "Outro", "Prefiro não informar"];
export const MARITAL_OPTIONS = ["", "Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União estável"];
export const EMPLOYMENT_STATUS = [
  { value: "ACTIVE", label: "Ativo" },
  { value: "INACTIVE", label: "Inativo" },
  { value: "ON_LEAVE", label: "Afastado" },
  { value: "TERMINATED", label: "Desligado" },
];
export const CONTRACT_TYPES = ["", "CLT", "PJ", "Estágio", "Temporário", "Aprendiz"];
export const ACCESS_STATUS = [
  { value: "ACTIVE", label: "Ativo" },
  { value: "INACTIVE", label: "Inativo" },
  { value: "BLOCKED", label: "Bloqueado" },
];

export function emptyCollaboratorForm() {
  return {
    name: "",
    socialName: "",
    email: "",
    phone: "",
    mobile: "",
    whatsapp: "",
    cpf: "",
    rg: "",
    rgIssuer: "",
    birthDate: "",
    gender: "",
    maritalStatus: "",
    nationality: "Brasil",
    birthplace: "",
    photo: "",
    status: "ACTIVE",
    address: { cep: "", street: "", number: "", complement: "", district: "", city: "", state: "", country: "Brasil" },
    documents: {
      ctps: "", pisPasep: "", cnh: "", cnhCategory: "", cnhExpiry: "", voterRegistration: "", militaryCertificate: "",
    },
    employment: {
      employeeCode: "", company: "", departmentId: "", jobTitle: "", managerPersonId: "",
      costCenter: "", contractType: "", hiredAt: "", terminatedAt: "", employmentStatus: "ACTIVE",
    },
    access: { username: "", password: "", accessStatus: "ACTIVE", mfaEnabled: false },
    applicationIds: [],
    roleIds: [],
    timeConfig: { workScheduleId: "", shiftPlanId: "", operationalStatus: "ACTIVE" },
  };
}

export function formToPeoplePayload(form) {
  return {
    personal: {
      name: form.name,
      socialName: form.socialName,
      email: form.email,
      phone: form.phone,
      mobile: form.mobile,
      whatsapp: form.whatsapp,
      cpf: form.cpf,
      rg: form.rg,
      rgIssuer: form.rgIssuer,
      birthDate: form.birthDate,
      gender: form.gender,
      maritalStatus: form.maritalStatus,
      nationality: form.nationality,
      birthplace: form.birthplace,
      photo: form.photo,
      status: form.status,
    },
    address: form.address,
    documents: form.documents,
    employment: {
      ...form.employment,
      departmentId: form.employment.departmentId || null,
      managerPersonId: form.employment.managerPersonId || null,
    },
    access: {
      username: form.access.username || form.email,
      password: form.access.password || undefined,
      accessStatus: form.access.accessStatus,
      mfaEnabled: form.access.mfaEnabled,
    },
    applicationIds: form.applicationIds,
    roleIds: form.roleIds,
  };
}

export const WIZARD_STEPS = [
  { id: "personal", label: "Dados pessoais" },
  { id: "contact", label: "Contato" },
  { id: "address", label: "Endereço" },
  { id: "documents", label: "Documentos" },
  { id: "employment", label: "Corporativo" },
  { id: "access", label: "Acesso" },
  { id: "roles", label: "Funções" },
  { id: "permissions", label: "Permissões" },
  { id: "applications", label: "Aplicativos" },
];

export const APP_CONFIG_SLUGS = {
  time: { label: "MÖBI Time", stepId: "app-time" },
  planner: { label: "WorkMaps", stepId: "app-planner" },
  portal: { label: "Portal", stepId: null },
  crm: { label: "CRM", stepId: null },
  finance: { label: "Financeiro", stepId: null },
};
