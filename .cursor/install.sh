#!/usr/bin/env bash
# Idempotent repository bootstrap for the Cloud Agent environment.
# Installs the PostgreSQL server (a stable system dependency) and the app's
# Node dependencies. Safe to run repeatedly and against cached/snapshot state.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── System dependency: PostgreSQL ───────────────────────────────────────────
# apt is a no-op when the server is already present, so this stays idempotent.
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    postgresql postgresql-contrib
fi

# ── Node dependencies ───────────────────────────────────────────────────────
cd "$REPO_DIR"
npm ci

echo "install.sh: done"
