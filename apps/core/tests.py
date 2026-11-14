import gzip
import shutil
import sqlite3
import tarfile
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from unittest import mock

from django.core import mail
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, TestCase, TransactionTestCase, override_settings
from django.utils import timezone

from apps.core import backup
from apps.customers.models import Customer


class TempDirMixin:
    def setUp(self):
        super().setUp()
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.backup_dir = self.tmp / 'backups'
        self.media_root = self.tmp / 'media'
        settings_patch = override_settings(
            BACKUP_DIR=self.backup_dir, MEDIA_ROOT=self.media_root,
            BACKUP_RCLONE_REMOTE='', HEALTHCHECK_PING_URL='',
        )
        settings_patch.enable()
        self.addCleanup(settings_patch.disable)


class HealthViewTests(TestCase):
    def test_ok(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok'})

    def test_database_down_returns_503(self):
        with mock.patch('apps.core.views.connection.cursor', side_effect=Exception('down')):
            response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {'status': 'error'})

    def test_only_get(self):
        self.assertEqual(self.client.post('/api/health/').status_code, 405)


class BackupsToKeepTests(SimpleTestCase):
    def test_keeps_newest_per_day_week_and_month(self):
        # One backup a day at 03:00 for ~ 1 year, plus a second one on the newest day.
        newest = datetime(2026, 11, 14, 3, 0)
        stamps = [newest - timedelta(days=n) for n in range(365)]
        stamps.append(newest - timedelta(hours=1))

        keep = backup.backups_to_keep(stamps)

        days = {s for s in stamps if s > newest - timedelta(days=7)} - {newest - timedelta(hours=1)}
        self.assertTrue(days <= keep, 'last 7 days must be kept (newest copy of each)')
        self.assertNotIn(newest - timedelta(hours=1), keep)
        self.assertEqual(len({s.isocalendar()[:2] for s in keep if s > newest - timedelta(weeks=5)}), 4)
        self.assertEqual(len({(s.year, s.month) for s in keep}), 6)
        self.assertLessEqual(len(keep), 7 + 4 + 6)

    def test_fewer_backups_than_slots_keeps_all(self):
        stamps = [datetime(2026, 11, d, 3, 0) for d in (1, 2, 3)]
        self.assertEqual(backup.backups_to_keep(stamps), set(stamps))


class BackupCommandTests(TempDirMixin, TransactionTestCase):
    def _open_backup(self, path: Path) -> sqlite3.Connection:
        raw = self.tmp / 'restored.sqlite3'
        with gzip.open(path, 'rb') as src, raw.open('wb') as dst:
            shutil.copyfileobj(src, dst)
        return sqlite3.connect(raw)

    def test_backup_contains_data_and_media(self):
        Customer.objects.create(first_name='Jan', last_name='Kowalski', phone='+48504991254')
        (self.media_root / 'bikes').mkdir(parents=True)
        (self.media_root / 'bikes' / 'photo.jpg').write_bytes(b'jpg')

        call_command('backup_db', stdout=mock.Mock())

        [db_file] = self.backup_dir.glob('db-*.sqlite3.gz')
        copy = self._open_backup(db_file)
        try:
            names = copy.execute('SELECT last_name FROM customers_customer').fetchall()
        finally:
            copy.close()
        self.assertEqual(names, [('Kowalski',)])

        [media_file] = self.backup_dir.glob('media-*.tar.gz')
        with tarfile.open(media_file) as tar:
            self.assertIn('media/bikes/photo.jpg', tar.getnames())
        self.assertEqual(list(self.backup_dir.glob('*.part')), [])

    def test_media_archived_once_per_week(self):
        self.media_root.mkdir()
        call_command('backup_db', stdout=mock.Mock())
        call_command('backup_db', stdout=mock.Mock())
        self.assertEqual(len(list(self.backup_dir.glob('media-*.tar.gz'))), 1)

    def test_predeploy_skips_media_offsite_and_ping(self):
        self.media_root.mkdir()
        with override_settings(BACKUP_RCLONE_REMOTE='gdrive:x', HEALTHCHECK_PING_URL='https://hc.example/abc'), \
                mock.patch('apps.core.backup.subprocess.run') as run, \
                mock.patch('apps.core.backup.urllib.request.urlopen') as urlopen:
            call_command('backup_db', '--predeploy', stdout=mock.Mock())

        self.assertEqual(len(list(self.backup_dir.glob('predeploy-*.sqlite3.gz'))), 1)
        self.assertEqual(list(self.backup_dir.glob('media-*')), [])
        run.assert_not_called()
        urlopen.assert_not_called()

    def test_rotation_removes_old_predeploy_backups(self):
        self.backup_dir.mkdir()
        for day in range(1, 9):
            (self.backup_dir / f'predeploy-202611{day:02d}-120000.sqlite3.gz').write_bytes(b'')
        (self.backup_dir / 'notes.txt').write_text('not a backup')

        call_command('backup_db', '--predeploy', stdout=mock.Mock())

        self.assertEqual(len(list(self.backup_dir.glob('predeploy-*'))), backup.PREDEPLOY_KEEP)
        self.assertFalse((self.backup_dir / 'predeploy-20261101-120000.sqlite3.gz').exists())
        self.assertTrue((self.backup_dir / 'notes.txt').exists())

    def test_offsite_upload_and_success_ping(self):
        with override_settings(BACKUP_RCLONE_REMOTE='gdrive:sheriff', HEALTHCHECK_PING_URL='https://hc.example/abc'), \
                mock.patch('apps.core.backup.shutil.which', return_value='/usr/bin/rclone'), \
                mock.patch('apps.core.backup.subprocess.run') as run, \
                mock.patch('apps.core.backup.urllib.request.urlopen') as urlopen:
            run.return_value = mock.Mock(returncode=0, stderr='')
            call_command('backup_db', stdout=mock.Mock())

        commands = [call.args[0] for call in run.call_args_list]
        self.assertEqual(commands[0][:2], ['/usr/bin/rclone', 'copy'])
        self.assertEqual(commands[0][3], 'gdrive:sheriff')
        self.assertEqual(commands[1][:3], ['/usr/bin/rclone', 'delete', 'gdrive:sheriff'])
        urlopen.assert_called_once_with('https://hc.example/abc', timeout=10)

    @override_settings(ADMINS=[('admin@example.com', 'admin@example.com')], DEBUG=False)
    def test_failure_emails_admins_and_pings_fail(self):
        with override_settings(BACKUP_RCLONE_REMOTE='gdrive:sheriff', HEALTHCHECK_PING_URL='https://hc.example/abc'), \
                mock.patch('apps.core.backup.shutil.which', return_value=None), \
                mock.patch('apps.core.backup.urllib.request.urlopen') as urlopen:
            with self.assertRaises(CommandError):
                call_command('backup_db', stdout=mock.Mock())

        urlopen.assert_called_once_with('https://hc.example/abc/fail', timeout=10)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Backup bazy', mail.outbox[0].subject)
        self.assertIn('rclone', mail.outbox[0].body)

    def test_ping_failure_does_not_fail_backup(self):
        with override_settings(HEALTHCHECK_PING_URL='https://hc.example/abc'), \
                mock.patch('apps.core.backup.urllib.request.urlopen', side_effect=OSError('offline')):
            call_command('backup_db', stdout=mock.Mock())
        self.assertEqual(len(list(self.backup_dir.glob('db-*.sqlite3.gz'))), 1)


@override_settings(ADMINS=[('admin@example.com', 'admin@example.com')], DEBUG=False)
class ErrorEmailTests(TestCase):
    def test_unhandled_500_is_emailed(self):
        from apps.core import views
        self.client.raise_request_exception = False
        with mock.patch.object(views, 'JsonResponse', side_effect=RuntimeError('boom')):
            response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 500)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('[Sheriff Bike]', mail.outbox[0].subject)
