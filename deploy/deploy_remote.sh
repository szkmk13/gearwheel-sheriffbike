#!/usr/bin/env bash
# Runs ON the mikrus server (invoked over SSH by .github/workflows/deploy.yml)
# after the code has already been rsynced into place.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -x .venv/bin/pip ]; then
    rm -rf .venv
    python3 -m venv .venv
fi

.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

.venv/bin/python manage.py migrate --settings=config.settings.dev --noinput
.venv/bin/python manage.py collectstatic --settings=config.settings.dev --noinput

systemctl --user restart gearwheel.service
systemctl --user status gearwheel.service --no-pager
