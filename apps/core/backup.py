"""SQLite + media backups for the single production server.

Everything lands in settings.BACKUP_DIR as flat, timestamped files:

    db-20261114-030000.sqlite3.gz         daily, rotated 7 days / 4 weeks / 6 months
    predeploy-20261114-121500.sqlite3.gz  taken before every migrate, last 5 kept
    media-20261114-030000.tar.gz          at most one per ISO week, last 4 kept

Files are written as `<name>.part` and renamed only once complete, so a crashed run
never leaves a truncated archive that looks valid (and `.part` is never uploaded).
"""

import gzip
import logging
import re
import shutil
import sqlite3
import subprocess
import tarfile
import urllib.request
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.db import connection
from django.utils import timezone

logger = logging.getLogger(__name__)

DAILY_KEEP = 7
WEEKLY_KEEP = 4
MONTHLY_KEEP = 6
PREDEPLOY_KEEP = 5
MEDIA_KEEP = 4
# Offsite copies older than this get deleted - a bit over MONTHLY_KEEP months.
OFFSITE_MAX_AGE = '200d'

_NAME_RE = re.compile(r'^(db|predeploy|media)-(\d{8}-\d{6})\.(?:sqlite3|tar)\.gz$')
_STAMP_FORMAT = '%Y%m%d-%H%M%S'


class BackupError(Exception):
    pass


def backup_dir() -> Path:
    path = Path(settings.BACKUP_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _stamp(now: datetime) -> str:
    return timezone.localtime(now).strftime(_STAMP_FORMAT)


def list_backups(directory: Path, kind: str) -> dict[datetime, Path]:
    """{timestamp: path} of finished backups of one kind (db / predeploy / media)."""
    found = {}
    for path in directory.iterdir():
        match = _NAME_RE.match(path.name)
        if match and match.group(1) == kind:
            found[datetime.strptime(match.group(2), _STAMP_FORMAT)] = path
    return found


def backups_to_keep(stamps, daily=DAILY_KEEP, weekly=WEEKLY_KEEP, monthly=MONTHLY_KEEP) -> set:
    """Grandfather-father-son: the newest backup of each of the last N days, weeks, months."""
    ordered = sorted(stamps, reverse=True)
    keep = set()
    buckets = (
        (daily, lambda d: d.date()),
        (weekly, lambda d: d.isocalendar()[:2]),
        (monthly, lambda d: (d.year, d.month)),
    )
    for count, bucket_of in buckets:
        seen = set()
        for stamp in ordered:
            if len(seen) >= count:
                break
            bucket = bucket_of(stamp)
            if bucket not in seen:
                seen.add(bucket)
                keep.add(stamp)
    return keep


def _newest(stamps, count) -> set:
    return set(sorted(stamps, reverse=True)[:count])


def rotate(directory: Path) -> list[Path]:
    removed = []
    plans = (
        ('db', backups_to_keep),
        ('predeploy', lambda stamps: _newest(stamps, PREDEPLOY_KEEP)),
        ('media', lambda stamps: _newest(stamps, MEDIA_KEEP)),
    )
    for kind, keep_of in plans:
        backups = list_backups(directory, kind)
        keep = keep_of(backups.keys())
        for stamp, path in backups.items():
            if stamp not in keep:
                path.unlink()
                removed.append(path)
    return removed


def backup_database(directory: Path, kind: str = 'db', now: datetime | None = None) -> Path:
    """Consistent copy of the live database via SQLite's online backup API.

    Uses Django's own connection, so it works whatever DATABASES points at (and on
    the in-memory test database). Safe while gunicorn keeps serving requests.
    """
    if connection.vendor != 'sqlite':
        raise BackupError(f'backup_db obsługuje tylko SQLite, a baza to {connection.vendor}.')

    now = now or timezone.now()
    target = directory / f'{kind}-{_stamp(now)}.sqlite3.gz'
    raw = directory / f'{target.name}.raw.part'
    packed = directory / f'{target.name}.part'
    try:
        connection.ensure_connection()
        copy = sqlite3.connect(raw)
        try:
            connection.connection.backup(copy)
            result = copy.execute('PRAGMA integrity_check').fetchone()[0]
        finally:
            copy.close()
        if result != 'ok':
            raise BackupError(f'Kopia bazy nie przeszła integrity_check: {result}')

        with raw.open('rb') as src, gzip.open(packed, 'wb') as dst:
            shutil.copyfileobj(src, dst)
        packed.replace(target)
    finally:
        raw.unlink(missing_ok=True)
        packed.unlink(missing_ok=True)
    return target


def backup_media_if_due(directory: Path, now: datetime | None = None) -> Path | None:
    """Archive MEDIA_ROOT unless an archive from the current ISO week already exists."""
    media_root = Path(settings.MEDIA_ROOT)
    if not media_root.is_dir():
        return None

    now = now or timezone.now()
    this_week = timezone.localtime(now).isocalendar()[:2]
    if any(stamp.isocalendar()[:2] == this_week for stamp in list_backups(directory, 'media')):
        return None

    target = directory / f'media-{_stamp(now)}.tar.gz'
    packed = directory / f'{target.name}.part'
    try:
        with tarfile.open(packed, 'w:gz') as tar:
            tar.add(media_root, arcname='media')
        packed.replace(target)
    finally:
        packed.unlink(missing_ok=True)
    return target


def upload_offsite(directory: Path) -> None:
    """Copy finished archives to the rclone remote, then prune old ones there.

    `copy` (not `sync`) so a broken or emptied local folder can never wipe the
    offsite history - only the age-based delete removes anything remotely.
    """
    remote = settings.BACKUP_RCLONE_REMOTE
    if not remote:
        return
    rclone = shutil.which('rclone')
    if not rclone:
        raise BackupError('BACKUP_RCLONE_REMOTE jest ustawione, ale nie znaleziono programu rclone w PATH.')

    commands = (
        [rclone, 'copy', str(directory), remote, '--include', '*.gz'],
        [rclone, 'delete', remote, '--min-age', OFFSITE_MAX_AGE],
    )
    for command in commands:
        result = subprocess.run(command, capture_output=True, text=True, timeout=60 * 30)
        if result.returncode != 0:
            raise BackupError(f'{" ".join(command[1:3])} zakończone kodem {result.returncode}: '
                              f'{result.stderr.strip()[-2000:]}')


def ping_healthcheck(failed: bool = False) -> None:
    """Dead man's switch (healthchecks.io): silence for a day means the timer stopped."""
    url = settings.HEALTHCHECK_PING_URL
    if not url:
        return
    if failed:
        url = url.rstrip('/') + '/fail'
    try:
        urllib.request.urlopen(url, timeout=10)
    except OSError:
        # A monitoring hiccup must not turn a good backup into a failed one.
        logger.warning('Nie udało się wysłać pingu do %s', url, exc_info=True)
