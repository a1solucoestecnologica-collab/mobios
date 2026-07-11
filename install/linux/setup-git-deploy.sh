#!/usr/bin/env bash
# Configuracao unica na VM: comando mobios-deploy + sudo sem senha para atualizar producao.
set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  exec sudo bash "$0" "$@"
fi

DEPLOY_USER="${SUDO_USER:-${DEPLOY_USER:-}}"
if [[ -z "$DEPLOY_USER" || "$DEPLOY_USER" == "root" ]]; then
  echo "ERRO: execute com sudo a partir do usuario da VM (ex.: sudo bash setup-git-deploy.sh)"
  exit 1
fi

DEPLOY_USER_HOME="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
REPO_DIR="${REPO_DIR:-${DEPLOY_USER_HOME}/mobios}"
SCRIPT_SRC="${REPO_DIR}/install/linux/deploy-from-git.sh"
INSTALL_SCRIPT="${REPO_DIR}/install/linux/install.sh"

if [[ ! -f "$SCRIPT_SRC" ]]; then
  echo "ERRO: clone o repositorio antes:"
  echo "  git clone https://github.com/a1solucoestecnologica-collab/mobios.git ${REPO_DIR}"
  exit 1
fi

chmod +x "${REPO_DIR}/install/linux/deploy-from-git.sh"
chmod +x "${REPO_DIR}/install/linux/install.sh"

DEPLOY_BIN="/usr/local/bin/mobios-deploy"
cat > "$DEPLOY_BIN" <<EOF
#!/usr/bin/env bash
export REPO_DIR="${REPO_DIR}"
exec bash "${SCRIPT_SRC}" "\$@"
EOF
chmod 0755 "$DEPLOY_BIN"
chown root:root "$DEPLOY_BIN"

SUDOERS_FILE="/etc/sudoers.d/mobios-deploy"
cat > "$SUDOERS_FILE" <<EOF
# MÖBI OS — permite ${DEPLOY_USER} atualizar producao sem senha
${DEPLOY_USER} ALL=(ALL) NOPASSWD: ${INSTALL_SCRIPT} --keep-db --skip-node-install
EOF
chmod 0440 "$SUDOERS_FILE"
visudo -cf "$SUDOERS_FILE"

echo ""
echo "========================================"
echo "  Deploy via Git configurado"
echo "========================================"
echo " Usuario:  ${DEPLOY_USER}"
echo " Repo:     ${REPO_DIR}"
echo " Comando:  mobios-deploy"
echo ""
echo "Uso manual na VM:"
echo "  mobios-deploy"
echo ""
echo "Deploy automatico no push (GitHub Actions):"
echo "  Adicione estes secrets no repositorio GitHub:"
echo "    MOBIOS_SSH_HOST     = IP externo da VM"
echo "    MOBIOS_SSH_USER     = ${DEPLOY_USER}"
echo "    MOBIOS_SSH_KEY      = chave privada SSH para a VM"
echo ""
echo "  Depois de dar push em main, a VM atualiza sozinha."
echo "========================================"
echo ""
