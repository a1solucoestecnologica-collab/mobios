#!/usr/bin/env bash
# Alias — use INSTALAR-UBUNTU.sh no servidor Ubuntu
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${ROOT}/INSTALAR-UBUNTU.sh" "$@"
