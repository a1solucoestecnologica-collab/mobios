#!/usr/bin/env bash
# Alias para instalar-ubuntu.sh
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${ROOT}/instalar-ubuntu.sh" "$@"
