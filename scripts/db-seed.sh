#!/usr/bin/env bash
# Charge les données de développement et les comptes de test. JAMAIS en production.
set -euo pipefail
: "${DATABASE_URL:?Définissez DATABASE_URL}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f supabase/seed.sql
echo "Seed chargé."
