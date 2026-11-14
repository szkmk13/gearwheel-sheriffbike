#!/usr/bin/env bash
# Runs ON the mikrus server: replaces the live database with a backup.
#
#   bash deploy/restore.sh backups/db-20261114-030000.sqlite3.gz
#
# The current database is saved first as backups/before-restore-<time>.sqlite3, so a
# restore can itself be undone. The service is stopped for the swap and the script
# ends with the same healthcheck as a deploy.
set -euo pipefail

cd "$(dirname "$0")/.."

ARCHIVE="${1:-}"
if [ -z "$ARCHIVE" ] || [ ! -f "$ARCHIVE" ]; then
    echo "Uzycie: bash deploy/restore.sh <plik .sqlite3.gz>" >&2
    echo "Dostepne kopie:" >&2
    ls -1t backups/*.sqlite3.gz 2>/dev/null | head -n 20 >&2 || true
    exit 1
fi

export DJANGO_SETTINGS_MODULE=config.settings.dev
DB_PATH=$(.venv/bin/python -c "import django; django.setup(); from django.conf import settings; print(settings.DATABASES['default']['NAME'])")
STAMP=$(date +%Y%m%d-%H%M%S)
TMP="${DB_PATH}.restore-${STAMP}"

echo "Rozpakowuje $ARCHIVE i sprawdzam integralnosc..."
gunzip -c "$ARCHIVE" > "$TMP"
.venv/bin/python - "$TMP" <<'PY'
import sqlite3, sys
result = sqlite3.connect(sys.argv[1]).execute('PRAGMA integrity_check').fetchone()[0]
if result != 'ok':
    sys.exit(f'integrity_check: {result}')
PY

read -r -p "Podmienic baze $DB_PATH na $ARCHIVE? Wpisz TAK: " answer
if [ "$answer" != "TAK" ]; then
    rm -f "$TMP"
    echo "Przerwano, baza bez zmian."
    exit 1
fi

systemctl --user stop gearwheel.service
mkdir -p backups
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "backups/before-restore-${STAMP}.sqlite3"
    echo "Obecna baza zapisana jako backups/before-restore-${STAMP}.sqlite3"
fi
# Leftover WAL/SHM files belong to the old database and must not be replayed onto the new one.
rm -f "${DB_PATH}-wal" "${DB_PATH}-shm"
mv "$TMP" "$DB_PATH"

.venv/bin/python manage.py migrate --noinput
systemctl --user start gearwheel.service
bash deploy/healthcheck.sh
echo "Przywrocono $ARCHIVE."
