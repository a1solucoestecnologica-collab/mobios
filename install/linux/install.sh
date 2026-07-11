#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/moble-tools}"
SERVICE_NAME="moble-tools"
PORT="${PORT:-4173}"
FORCE_DB=0
KEEP_DB=0
SKIP_NODE_INSTALL=0
DEV_MODE=0
ADMIN_EMAIL=""
ADMIN_PASSWORD=""

usage() {
  cat <<'EOF'
Uso: sudo ./install.sh [opcoes]

Instala o MÖBI OS no Ubuntu Server.

Opcoes:
  --dir PATH              Diretorio de instalacao (padrao: /opt/moble-tools)
  --port NUM              Porta HTTP (padrao: 4173)
  --admin-email EMAIL     E-mail do administrador inicial
  --admin-password SENHA  Senha do administrador inicial
  --force-db              Sobrescreve banco existente (alias; padrao ja copia do pacote)
  --keep-db               Mantem banco existente em /opt/moble-tools (use em atualizacoes)
  --dev                   Modo desenvolvimento (demo + boot inseguro)
  --skip-node-install     Nao instala Node.js automaticamente
  -h, --help              Ajuda

Exemplo:
  sudo ./install.sh --admin-email admin@empresa.com --admin-password 'MinhaSenhaSegura123'
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --admin-email) ADMIN_EMAIL="$2"; shift 2 ;;
    --admin-password) ADMIN_PASSWORD="$2"; shift 2 ;;
    --force-db) FORCE_DB=1; shift ;;
    --keep-db) KEEP_DB=1; shift ;;
    --dev) DEV_MODE=1; shift ;;
    --skip-node-install) SKIP_NODE_INSTALL=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opcao desconhecida: $1"; usage; exit 1 ;;
  esac
done

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Execute com sudo: sudo ./install.sh"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "ERRO: arquivo obrigatorio ausente: $1"
    exit 1
  fi
}

copy_file() {
  local src="$1"
  local dest="$2"
  [[ -f "$src" ]] || return 0
  mkdir -p "$(dirname "$dest")"
  install -m 0644 "$src" "$dest"
}

copy_tree() {
  local src="$1"
  local dest="$2"
  [[ -e "$src" ]] || return 0
  rm -rf "$dest"
  mkdir -p "$dest"
  cp -a "$src/." "$dest/"
}

verify_install_file() {
  if [[ ! -f "$1" ]]; then
    echo "ERRO: arquivo ausente apos instalacao: $1"
    exit 1
  fi
}

require_file "${PACKAGE_ROOT}/server.js"
require_file "${PACKAGE_ROOT}/package.json"
require_file "${PACKAGE_ROOT}/data/moble-tools.sqlite"

if head -c 40 "${PACKAGE_ROOT}/data/moble-tools.sqlite" | grep -q "git-lfs.github.com"; then
  echo "ERRO: pacote com ponteiro Git LFS em vez do banco SQLite real."
  exit 1
fi

install_node() {
  if command -v node >/dev/null 2>&1; then
    local major minor
    major="$(node -p "process.versions.node.split('.')[0]")"
    minor="$(node -p "process.versions.node.split('.')[1]")"
    if [[ "$major" -gt 22 ]] || [[ "$major" -eq 22 && "$minor" -ge 5 ]]; then
      echo "Node.js $(node -v) OK"
      return
    fi
    echo "Node.js $(node -v) encontrado, mas requer >= 22.5"
  fi

  if [[ "$SKIP_NODE_INSTALL" -eq 1 ]]; then
    echo "ERRO: Node.js >= 22.5 necessario."
    exit 1
  fi

  echo "Instalando Node.js 22 (NodeSource)..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
  echo "Node.js $(node -v) instalado"
}

install_node

if ! getent group moble >/dev/null; then
  groupadd --system moble
fi

if ! id moble >/dev/null 2>&1; then
  useradd --system --gid moble --home-dir "${INSTALL_DIR}" --shell /usr/sbin/nologin moble
fi

mkdir -p "${INSTALL_DIR}/data" "${INSTALL_DIR}/uploads/ponto"

for file in server.js app.js index.html styles.css package.json package-lock.json INICIAR-MOBLE-TOOLS.bat; do
  copy_file "${PACKAGE_ROOT}/${file}" "${INSTALL_DIR}/${file}"
done

copy_tree "${PACKAGE_ROOT}/planner/dist" "${INSTALL_DIR}/planner/dist"
copy_tree "${PACKAGE_ROOT}/ponto/dist" "${INSTALL_DIR}/ponto/dist"
copy_file "${PACKAGE_ROOT}/ponto/server-handlers.js" "${INSTALL_DIR}/ponto/server-handlers.js"
copy_tree "${PACKAGE_ROOT}/ponto/server-handlers" "${INSTALL_DIR}/ponto/server-handlers"
copy_file "${PACKAGE_ROOT}/platform/server-handlers.js" "${INSTALL_DIR}/platform/server-handlers.js"
copy_tree "${PACKAGE_ROOT}/platform/server-handlers" "${INSTALL_DIR}/platform/server-handlers"
copy_tree "${PACKAGE_ROOT}/admin/dist" "${INSTALL_DIR}/admin/dist"
copy_file "${PACKAGE_ROOT}/admin/server-handlers.js" "${INSTALL_DIR}/admin/server-handlers.js"
copy_tree "${PACKAGE_ROOT}/admin/server-handlers" "${INSTALL_DIR}/admin/server-handlers"
copy_tree "${PACKAGE_ROOT}/portal/dist" "${INSTALL_DIR}/portal/dist"
copy_file "${PACKAGE_ROOT}/portal/index.html" "${INSTALL_DIR}/portal/index.html"
copy_file "${PACKAGE_ROOT}/portal/server-handlers.js" "${INSTALL_DIR}/portal/server-handlers.js"

verify_install_file "${INSTALL_DIR}/platform/server-handlers/services/auth/index.js"
verify_install_file "${INSTALL_DIR}/admin/server-handlers/index.js"
verify_install_file "${INSTALL_DIR}/ponto/server-handlers/operational.js"
verify_install_file "${INSTALL_DIR}/portal/dist/portal-standalone.js"

ENV_DIR="/etc/moble-tools"
ENV_FILE="${ENV_DIR}/moble-tools.env"
mkdir -p "${ENV_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  NODE_ENV="production"
  DEMO="false"
  INSECURE=""
  if [[ "$DEV_MODE" -eq 1 ]]; then
    NODE_ENV="development"
    DEMO="true"
    INSECURE=$'MOBI_ALLOW_INSECURE_BOOT=1\n'
  fi
  EMAIL="${ADMIN_EMAIL:-admin@empresa.com}"
  PASS="${ADMIN_PASSWORD:-AltereEstaSenhaSegura123}"
  cat > "${ENV_FILE}" <<EOF
HOST=0.0.0.0
PORT=${PORT}
NODE_ENV=${NODE_ENV}
PORTAL_DEMO_MODE=${DEMO}
${INSECURE}MOBI_BOOTSTRAP_ADMIN_EMAIL=${EMAIL}
MOBI_BOOTSTRAP_ADMIN_PASSWORD=${PASS}
EOF
  chmod 0640 "${ENV_FILE}"
  chown root:moble "${ENV_FILE}"
  echo "Config criada: ${ENV_FILE}"
else
  echo "Config existente preservada: ${ENV_FILE}"
fi

if [[ -f "${INSTALL_DIR}/data/moble-tools.sqlite" && "$KEEP_DB" -eq 1 && "$FORCE_DB" -eq 0 ]]; then
  echo "Banco existente preservado (--keep-db)."
else
  echo "Copiando banco de dados do pacote..."
  install -m 0640 -o moble -g moble "${PACKAGE_ROOT}/data/moble-tools.sqlite" "${INSTALL_DIR}/data/moble-tools.sqlite"
fi

chown -R moble:moble "${INSTALL_DIR}"

if [[ -n "${ADMIN_EMAIL}" && -n "${ADMIN_PASSWORD}" ]]; then
  echo "Aplicando credenciais do administrador no banco..."
  node "${SCRIPT_DIR}/apply-admin-credentials.mjs" \
    --db "${INSTALL_DIR}/data/moble-tools.sqlite" \
    --email "${ADMIN_EMAIL}" \
    --password "${ADMIN_PASSWORD}"
  chown moble:moble "${INSTALL_DIR}/data/moble-tools.sqlite"
  chmod 0640 "${INSTALL_DIR}/data/moble-tools.sqlite"
fi

echo "Instalando dependencias npm..."
cd "${INSTALL_DIR}"
sudo -u moble npm ci --omit=dev

install -m 0644 "${SCRIPT_DIR}/moble-tools.service" "/etc/systemd/system/${SERVICE_NAME}.service"
sed -i "s|WorkingDirectory=.*|WorkingDirectory=${INSTALL_DIR}|g" "/etc/systemd/system/${SERVICE_NAME}.service"
sed -i "s|ExecStart=.*|ExecStart=$(command -v node) ${INSTALL_DIR}/server.js|g" "/etc/systemd/system/${SERVICE_NAME}.service"
sed -i "s|Environment=PORT=.*|Environment=PORT=${PORT}|g" "/etc/systemd/system/${SERVICE_NAME}.service"

if ! grep -q "EnvironmentFile=" "/etc/systemd/system/${SERVICE_NAME}.service"; then
  sed -i "/\[Service\]/a EnvironmentFile=${ENV_FILE}" "/etc/systemd/system/${SERVICE_NAME}.service"
fi

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"
sleep 2

if ! systemctl is-active --quiet "${SERVICE_NAME}"; then
  echo ""
  echo "ERRO: o servico nao subiu. Ultimas linhas do log:"
  journalctl -u "${SERVICE_NAME}" -n 15 --no-pager || true
  echo ""
  echo "Causa comum: banco antigo com senhas de desenvolvimento."
  echo "Tente: sudo bash INSTALAR-UBUNTU.sh --admin-email ... --admin-password '...'"
  echo "(sem --keep-db, o banco do pacote sera aplicado)"
  exit 1
fi

if command -v ufw >/dev/null 2>&1; then
  ufw allow "${PORT}/tcp" comment "MÖBI OS" || true
  if ufw status | grep -q "Status: active"; then
    echo "Porta ${PORT}/tcp liberada no UFW"
  else
    echo "UFW instalado mas inativo. Se usar firewall, execute: sudo ufw allow ${PORT}/tcp"
  fi
fi

IP="$(hostname -I | awk '{print $1}')"
echo ""
echo "========================================"
echo " MÖBI OS instalado com sucesso"
echo "========================================"
echo " Pasta:     ${INSTALL_DIR}"
echo " Porta:     ${PORT}"
echo " Local:     http://localhost:${PORT}"
echo " Portal:    http://localhost:${PORT}/portal"
echo " Rede:      http://${IP}:${PORT}"
echo " Config:    ${ENV_FILE}"
echo " Servico:   systemctl status ${SERVICE_NAME}"
echo " Logs:      journalctl -u ${SERVICE_NAME} -f"
echo "========================================"
echo ""
echo "IMPORTANTE: edite ${ENV_FILE} com e-mail e senha do administrador."
