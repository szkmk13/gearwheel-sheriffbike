#!/usr/bin/env bash
# Runs ON the mikrus server: polls /api/health/ through the gunicorn socket until it
# answers 200, or fails after ~30 s. Used by deploy_remote.sh and restore.sh.
#
# Django rejects a Host it does not list in ALLOWED_HOSTS, so the request carries
# the first entry from .env (override with HEALTH_HOST=...). X-Forwarded-Proto
# keeps SECURE_SSL_REDIRECT from answering with a redirect instead.
set -euo pipefail

cd "$(dirname "$0")/.."

SOCKET="run/gunicorn.sock"
HOST="${HEALTH_HOST:-$(grep -E '^ALLOWED_HOSTS=' .env | head -n1 | cut -d= -f2- | cut -d, -f1 | tr -d ' "')}"
HOST="${HOST:-localhost}"

for attempt in $(seq 1 15); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 \
        --unix-socket "$SOCKET" \
        -H "Host: $HOST" -H "X-Forwarded-Proto: https" \
        "http://localhost/api/health/" || true)
    if [ "$code" = "200" ]; then
        echo "Healthcheck OK (proba $attempt)."
        exit 0
    fi
    sleep 2
done

echo "Healthcheck FAILED: /api/health/ zwraca '$code' (Host: $HOST)." >&2
systemctl --user status gearwheel.service --no-pager || true
journalctl --user -u gearwheel.service -n 40 --no-pager || true
exit 1
