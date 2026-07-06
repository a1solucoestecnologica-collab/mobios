#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/moble-tools}"
SERVICE_NAME="moble-tools"
PORT="${PORT:-4173}"
FORCE_DB=0
SKIP_NODE_INSTALL=0

usage() {
  cat <<'EOF'
Uso: sudo ./install.sh [opcoes]

Instala o Moble Tools (MOBI OS) nesta VM Linux.

Opcoes:
  --dir PATH           Diretorio de instalacao (padrao: /opt/moble-tools)
  --port NUM           Porta HTTP (padrao: 4173)
  --force-db           Sobrescreve banco existente com o do pacote
  --skip-node-install  Nao tenta instalar Node.js automaticamente
  -h, --help           Mostra esta ajuda

Execute a partir da pasta descompactada do pacote de deploy.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --force-db) FORCE_DB=1; shift ;;
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

require_file "${PACKAGE_ROOT}/server.js"
require_file "${PACKAGE_ROOT}/package.json"
require_file "${PACKAGE_ROOT}/data/moble-tools.sqlite"

if head -c 40 "${PACKAGE_ROOT}/data/moble-tools.sqlite" | grep -q "git-lfs.github.com"; then
  echo "ERRO: O pacote contem ponteiro Git LFS em vez do banco SQLite real."
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
    echo "ERRO: Node.js >= 22.5 necessario. Instale manualmente ou remova --skip-node-install."
    exit 1
  fi

  echo "Instalando Node.js 22 via NodeSource..."
  apt-get update -qq
  apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
}

install_node

if ! getent group moble >/dev/null; then
  groupadd --system moble
fi

if ! id moble >/dev/null 2>&1; then
  useradd --system --gid moble --home-dir "${INSTALL_DIR}" --shell /usr/sbin/nologin moble
fi

mkdir -p "${INSTALL_DIR}/data"

copy_app_file() {
  local file="$1"
  install -m 0644 "${PACKAGE_ROOT}/${file}" "${INSTALL_DIR}/${file}"
}

for file in server.js app.js index.html styles.css package.json package-lock.json; do
  copy_app_file "$file"
done

if [[ -f "${INSTALL_DIR}/data/moble-tools.sqlite" && "$FORCE_DB" -eq 0 ]]; then
  echo "Banco existente preservado em ${INSTALL_DIR}/data/moble-tools.sqlite"
else
  echo "Copiando banco de dados do pacote..."
  install -m 0640 -o moble -g moble "${PACKAGE_ROOT}/data/moble-tools.sqlite" "${INSTALL_DIR}/data/moble-tools.sqlite"
fi

chown -R moble:moble "${INSTALL_DIR}"

echo "Instalando dependencias npm..."
cd "${INSTALL_DIR}"
sudo -u moble npm ci --omit=dev

install -m 0644 "${SCRIPT_DIR}/moble-tools.service" "/etc/systemd/system/${SERVICE_NAME}.service"
sed -i "s|WorkingDirectory=.*|WorkingDirectory=${INSTALL_DIR}|g" "/etc/systemd/system/${SERVICE_NAME}.service"
sed -i "s|ExecStart=.*|ExecStart=$(command -v node) ${INSTALL_DIR}/server.js|g" "/etc/systemd/system/${SERVICE_NAME}.service"
sed -i "s|Environment=PORT=.*|Environment=PORT=${PORT}|g" "/etc/systemd/system/${SERVICE_NAME}.service"

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow "${PORT}/tcp" || true
fi

IP="$(hostname -I | awk '{print $1}')"
echo ""
echo "========================================"
echo " Moble Tools instalado com sucesso"
echo "========================================"
echo " Diretorio: ${INSTALL_DIR}"
echo " Porta:     ${PORT}"
echo " Local:     http://localhost:${PORT}"
echo " Rede:      http://${IP}:${PORT}"
echo " Servico:   systemctl status ${SERVICE_NAME}"
echo " Logs:      journalctl -u ${SERVICE_NAME} -f"
echo "========================================"
