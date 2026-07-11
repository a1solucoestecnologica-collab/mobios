// LEGADO: leitura/escrita em admin_settings até migração para tabela platform_settings.
// A lógica pertence à Plataforma; a tabela permanece temporariamente legada.

export function getSettings(db) {
  const row = db.prepare("SELECT * FROM admin_settings WHERE id = 'default'").get();
  if (!row) {
    return { platformName: "MÖBI OS", supportEmail: "" };
  }
  return {
    platformName: row.platform_name,
    supportEmail: row.support_email || "",
  };
}

export function updateSettings(db, { platformName, supportEmail }) {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE admin_settings SET platform_name = ?, support_email = ?, updated_at = ? WHERE id = 'default'`,
  ).run(String(platformName || "MÖBI OS").trim(), String(supportEmail || "").trim(), now);
  return { ok: true };
}
