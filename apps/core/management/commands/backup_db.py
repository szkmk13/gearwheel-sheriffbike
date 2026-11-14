import logging

from django.core.management.base import BaseCommand, CommandError

from apps.core import backup

logger = logging.getLogger('apps.core.backup')


class Command(BaseCommand):
    help = ('Kopia zapasowa bazy SQLite (i raz w tygodniu katalogu media) do BACKUP_DIR, '
            'z rotacją i wysyłką na zdalny dysk przez rclone.')

    def add_arguments(self, parser):
        parser.add_argument(
            '--predeploy', action='store_true',
            help='Szybka kopia samej bazy przed migracją (bez media, bez rclone i pingu).',
        )

    def handle(self, *args, predeploy=False, **options):
        directory = backup.backup_dir()
        try:
            if predeploy:
                path = backup.backup_database(directory, kind='predeploy')
                self.stdout.write(f'Kopia przed deployem: {path}')
                backup.rotate(directory)
                return

            path = backup.backup_database(directory)
            self.stdout.write(f'Kopia bazy: {path}')
            media = backup.backup_media_if_due(directory)
            if media:
                self.stdout.write(f'Archiwum media: {media}')
            for removed in backup.rotate(directory):
                self.stdout.write(f'Usunięto starą kopię: {removed.name}')
            backup.upload_offsite(directory)
        except Exception as exc:
            # Goes to the 'apps' logger, whose mail_admins handler emails the traceback.
            logger.exception('Backup bazy nie powiódł się')
            if not predeploy:
                backup.ping_healthcheck(failed=True)
            raise CommandError(f'Backup nie powiódł się: {exc}') from exc

        backup.ping_healthcheck()
        self.stdout.write(self.style.SUCCESS('Backup zakończony.'))
