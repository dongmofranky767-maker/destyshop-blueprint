#!/usr/bin/env bash
# Applique toutes les migrations SQL (ordre alphabétique) sur DATABASE_URL.
set -euo pipefail
: "${DATABASE_URL:?Définissez DATABASE_URL (voir .env.example)}"
for f in drizzle/migrations/*.sql; do
  echo "→ $f"; psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done
