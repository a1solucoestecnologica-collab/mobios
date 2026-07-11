/** Rótulos em português para valores técnicos exibidos na interface. */
export const STATUS_LABELS = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  ENABLED: "Ativo",
  DISABLED: "Inativo",
  PENDING: "Pendente",
  VALID: "Válido",
  CANCELED: "Cancelado",
  CANCELLED: "Cancelado",
  MANUAL_ADJUSTED: "Ajustado manualmente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  OPEN: "Aberto",
  CLOSED: "Fechado",
  oficial: "Oficial",
  preparado: "Preparado",
  legado: "Legado",
};

export function labelStatus(value) {
  if (value == null || value === "") return "—";
  const key = String(value);
  return STATUS_LABELS[key] || STATUS_LABELS[key.toUpperCase()] || key;
}

export const PERMISSION_LABELS = {
  "Acessar Dashboard": "Acessar painel",
  "Visualizar Tools": "Visualizar ferramentas",
  "Criar no Tools": "Criar em ferramentas",
  "Editar no Tools": "Editar em ferramentas",
  "Excluir no Tools": "Excluir em ferramentas",
};

export function labelPermission(name) {
  return PERMISSION_LABELS[name] || name || "—";
}
