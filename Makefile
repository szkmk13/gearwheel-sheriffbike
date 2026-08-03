.PHONY: deploy restart logs

# Run these directly on the mikrus server (after `ssh` in), not from CI.

deploy:
	git pull
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -r requirements.txt
	.venv/bin/python manage.py migrate --settings=config.settings.dev --noinput
	.venv/bin/python manage.py collectstatic --settings=config.settings.dev --noinput
	systemctl --user restart gearwheel.service
	systemctl --user status gearwheel.service --no-pager

restart:
	systemctl --user restart gearwheel.service
	systemctl --user status gearwheel.service --no-pager

logs:
	journalctl --user -u gearwheel.service -f
