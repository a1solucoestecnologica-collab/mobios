#!/usr/bin/env bash
# Instalador MÖBI OS para Ubuntu — execute na raiz do pacote descompactado.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  exec sudo bash "${ROOT}/install/linux/instalar-ubuntu.sh" "$@"
fi

exec bash "${ROOT}/install/linux/instalar-ubuntu.sh" "$@"
