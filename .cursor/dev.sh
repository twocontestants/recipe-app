#!/usr/bin/env bash
# Long-running dev server (Next.js 14 + Socket.IO custom server). Runs in a
# visible terminal so its logs and lifecycle stay inspectable. Points the app
# at the local PostgreSQL database and initialises the schema once the server
# is up by hitting the app's own /api/setup endpoint (CREATE TABLE IF NOT
# EXISTS, so it is safe to call repeatedly).
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

export NODE_ENV=development
export PORT="${PORT:-3000}"
export POSTGRES_URL="${POSTGRES_URL:-postgresql://recipe:recipe@localhost:5432/recipe}"

# Initialise DB tables once the server is accepting requests.
(
  for _ in $(seq 1 60); do
    if curl -sf "http://localhost:${PORT}/api/setup" >/dev/null 2>&1; then
      echo "dev.sh: database schema initialised via /api/setup"
      break
    fi
    sleep 2
  done
) &

exec node server.js
