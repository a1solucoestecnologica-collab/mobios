#!/usr/bin/env bash
# Atualiza o MÖBI OS em producao a partir do git (pull + build + sync + restart).
set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/mobios}"
BRANCH="${BRANCH:-main}"
SKIP_BUILD=0
SKIP_PULL=0

usage() {
  cat <<'EOF'
Uso: bash install/linux/deploy-from-git.sh [opcoes]

Atualiza a VM com a ultima versao do repositorio:
  1. git pull
  2. npm ci + build (planner, ponto, admin, portal)
  3. sincroniza /opt/moble-tools (preserva banco e uploads)
  4. reinicia o servico moble-tools

Opcoes:
  --repo PATH      Pasta do clone git (padrao: ~/mobios)
  --branch NAME    Branch (padrao: main)
  --skip-build     Nao recompila os apps React
  --skip-pull      Nao faz git pull (usa codigo local)
  -h, --help       Ajuda

Exemplos:
  bash install/linux/deploy-from-git.sh
  sudo mobios-deploy
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO_DIR="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --skip-pull) SKIP_PULL=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opcao desconhecida: $1"; usage; exit 1 ;;
  esac
done

REPO_DIR="$(cd "$REPO_DIR" 2>/dev/null && pwd || true)"
if [[ -z "$REPO_DIR" || ! -d "$REPO_DIR/.git" ]]; then
  echo "ERRO: repositorio git nao encontrado."
  echo "Clone: git clone https://github.com/a1solucoestecnologica-collab/mobios.git ~/mobios"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "========================================"
echo "  MÖBI OS — Deploy via Git"
echo "========================================"
echo " Repo:   ${REPO_DIR}"
echo " Branch: ${BRANCH}"
echo ""

cd "$REPO_DIR"

if [[ "$SKIP_PULL" -eq 0 ]]; then
  echo "==> git pull origin ${BRANCH}"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
  echo ""
fi

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  echo "==> npm ci (raiz)"
  npm ci
  echo ""

  for app in planner ponto admin portal; do
    if [[ ! -f "${REPO_DIR}/${app}/package.json" ]]; then
      echo "  Pulando ${app} (sem package.json)"
      continue
    fi
    echo "==> build ${app}"
    (cd "${REPO_DIR}/${app}" && npm ci && npm run build)
    echo ""
  done
fi

echo "==> sincronizando /opt/moble-tools"
if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  exec sudo -E bash "${SCRIPT_DIR}/install.sh" --keep-db --skip-node-install
fi

exec bash "${SCRIPT_DIR}/install.sh" --keep-db --skip-node-install
