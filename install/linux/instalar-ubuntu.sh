#!/usr/bin/env bash
# Instalador oficial MÖBI OS para Ubuntu Server
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo ""
echo "========================================"
echo "  MÖBI OS — Instalador Ubuntu"
echo "========================================"
echo ""

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Execute com sudo na pasta do pacote descompactado:"
  echo "  sudo bash INSTALAR-UBUNTU.sh"
  exit 1
fi

if [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  if [[ "${ID:-}" != "ubuntu" ]]; then
    echo "AVISO: servidor detectado como '${NAME:-desconhecido}'."
    echo "Este instalador foi feito para Ubuntu. Continuando mesmo assim..."
    echo ""
  else
    echo "Ubuntu ${VERSION_ID:-} detectado."
    echo ""
  fi
fi

if [[ ! -f "${PACKAGE_ROOT}/server.js" ]]; then
  echo "ERRO: execute na raiz do pacote (onde esta server.js)."
  echo "Exemplo:"
  echo "  unzip moble-tools-deploy-*.zip -d moble-tools"
  echo "  cd moble-tools"
  echo "  sudo bash INSTALAR-UBUNTU.sh"
  exit 1
fi

echo "Instalando dependencias do sistema (apt)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y unzip curl ca-certificates gnupg

exec bash "${SCRIPT_DIR}/install.sh" "$@"
