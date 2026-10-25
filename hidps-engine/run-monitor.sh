#!/usr/bin/env bash
# Runner script for PPID Parepare HIDPS Engine (Local/Docker/Self-hosted)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

echo "[HIDPS RUNNER] Memulai mesin deteksi intrusi PPID Kemenag Parepare..."
echo "[HIDPS RUNNER] Python: $(which python3) ($(python3 --version))"
echo "[HIDPS RUNNER] Direktori kerja: ${SCRIPT_DIR}"

trap 'echo "[HIDPS RUNNER] Menerima sinyal keluar, mematikan monitor..."; exit 0' SIGINT SIGTERM

exec python3 monitor.py --tail "$@"
