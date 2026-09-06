#!/usr/bin/env bash
# Per-boot runtime initialization: bring up the local PostgreSQL cluster and
# make sure the app's role and database exist. Tolerates restarts and returns
# once the database is ready to accept connections.
set -euo pipefail

DB_NAME="recipe"
DB_USER="recipe"
DB_PASS="recipe"

# Resolve the installed cluster version (16 on Ubuntu 24.04) dynamically.
PG_VER="$(pg_lsclusters -h | awk 'NR==1 {print $1}')"

# Start the default cluster if it is not already online.
if ! pg_lsclusters -h | awk '{print $4}' | grep -q '^online$'; then
  sudo pg_ctlcluster "$PG_VER" main start || true
fi

# Wait until Postgres accepts connections.
for _ in $(seq 1 30); do
  if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then break; fi
  sleep 1
done

# Ensure the application role exists (idempotent).
sudo -u postgres psql -v ON_ERROR_STOP=1 -c \
  "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='${DB_USER}') THEN CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}'; END IF; END \$\$;"

# Ensure the application database exists (idempotent).
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
fi

echo "start.sh: PostgreSQL ready on localhost:5432 (db=${DB_NAME})"
