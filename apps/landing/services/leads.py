import json
import logging

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'


def verify_turnstile(token, remote_ip=None):
    """Verify a Cloudflare Turnstile response token server-side.

    Returns True when TURNSTILE_SECRET_KEY isn't configured, so local dev
    without Cloudflare credentials doesn't get blocked.
    """
    if not settings.TURNSTILE_SECRET_KEY:
        return True

    payload = {'secret': settings.TURNSTILE_SECRET_KEY, 'response': token}
    if remote_ip:
        payload['remoteip'] = remote_ip

    try:
        r = httpx.post(TURNSTILE_VERIFY_URL, data=payload, timeout=10)
        r.raise_for_status()
        return bool(r.json().get('success'))
    except httpx.HTTPError:
        logger.exception('Turnstile verification request failed')
        return False


def _load_service_account_credentials():
    from google.oauth2 import service_account

    scopes = ['https://www.googleapis.com/auth/spreadsheets']
    if settings.GOOGLE_SERVICE_ACCOUNT_FILE:
        return service_account.Credentials.from_service_account_file(
            settings.GOOGLE_SERVICE_ACCOUNT_FILE, scopes=scopes,
        )
    credentials_info = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON)
    return service_account.Credentials.from_service_account_info(credentials_info, scopes=scopes)


def append_lead_to_sheet(row_data):
    """Append a booking-form lead as a row in the configured Google Sheet,
    authenticating as a service account that's been shared on that sheet.

    No-ops (with a warning) when Sheets credentials aren't configured, so
    the form still works end-to-end before that's set up.
    """
    if not settings.GOOGLE_SHEETS_SPREADSHEET_ID or not (settings.GOOGLE_SERVICE_ACCOUNT_FILE or settings.GOOGLE_SERVICE_ACCOUNT_JSON):
        logger.warning('Google Sheets is not configured - skipping row append for lead %r', row_data.get('phone'))
        return False

    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError

    row = [
        row_data.get('created_at', ''),
        row_data.get('name', ''),
        row_data.get('phone', ''),
        row_data.get('equip', ''),
        row_data.get('service', ''),
        row_data.get('date', ''),
        row_data.get('msg', ''),
    ]

    try:
        credentials = _load_service_account_credentials()
        service = build('sheets', 'v4', credentials=credentials, cache_discovery=False)
        service.spreadsheets().values().append(
            spreadsheetId=settings.GOOGLE_SHEETS_SPREADSHEET_ID,
            range=f'{settings.GOOGLE_SHEETS_WORKSHEET_NAME}!A1',
            valueInputOption='USER_ENTERED',
            insertDataOption='INSERT_ROWS',
            body={'values': [row]},
        ).execute()
        return True
    except HttpError:
        logger.exception('Google Sheets API request failed')
        return False
