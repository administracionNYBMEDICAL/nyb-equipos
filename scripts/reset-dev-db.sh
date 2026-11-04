#!/usr/bin/env bash
# Reinicia la base local de prueba (solo desarrollo). Uso: scripts/reset-dev-db.sh
set -euo pipefail
D=${PGSOCKDIR:-/var/lib/postgresql/nybtest}; P="psql -h $D -p ${PGPORT:-5499} -U postgres -v ON_ERROR_STOP=1 -q"
cd "$(dirname "$0")/.."
cp supabase/migrations/*.sql scripts/supabase-shim.sql scripts/seed-dev.sql "$D/" && chmod 644 "$D"/*.sql
$P -d postgres -c "select pg_terminate_backend(pid) from pg_stat_activity where datname='nybdev' and pid<>pg_backend_pid()" >/dev/null
$P -c "drop database if exists nybdev" -c "create database nybdev" 2>/dev/null
$P -d nybdev -f "$D/supabase-shim.sql" >/dev/null
for f in $(ls supabase/migrations/*.sql | sort); do
  $P -d nybdev -f "$D/$(basename "$f")" >/dev/null 2>&1
  # la semilla va después de la primera migración (como si fueran datos ya cargados)
  [ "$(basename "$f")" = "0001_schema.sql" ] && $P -d nybdev -f "$D/seed-dev.sql" >/dev/null
done
echo "base local reiniciada"
