#!/usr/bin/env bash
set -euo pipefail
# Run on the host. Keeps Wesh Star IA's own PostgreSQL data independent of cloud DB providers.
BACKUP_DIR="${WESH_BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/wesh-star-ia-$STAMP.sql.gz"
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-wesh}" "${POSTGRES_DB:-wesh_star}" | gzip > "$FILE"
echo "Backup created: $FILE"
