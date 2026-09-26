from django.contrib.auth.models import User
from django.test import Client, TestCase


class SessionAuthTests(TestCase):
    """End-to-end cover for the session/CSRF login flow the SPA depends on."""

    def setUp(self):
        User.objects.create_user('bob', password='pass12345', is_staff=True)
        self.client = Client(enforce_csrf_checks=True)

    def _csrf(self):
        self.client.get('/api/auth/me/')  # ensure_csrf_cookie seeds the cookie
        return self.client.cookies['csrftoken'].value

    def test_me_anonymous_is_401(self):
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_login_without_csrf_header_is_403(self):
        r = self.client.post('/api/auth/login/', {'username': 'bob', 'password': 'pass12345'},
                             content_type='application/json')
        self.assertEqual(r.status_code, 403)

    def test_login_then_me_then_logout(self):
        token = self._csrf()
        r = self.client.post('/api/auth/login/', {'username': 'bob', 'password': 'pass12345'},
                             content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['username'], 'bob')
        self.assertIn('sessionid', self.client.cookies)

        me = self.client.get('/api/auth/me/')
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()['is_staff'], True)

        token = self.client.cookies['csrftoken'].value  # rotated by login()
        self.assertEqual(self.client.post('/api/auth/logout/', HTTP_X_CSRFTOKEN=token).status_code, 204)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_bad_password_is_401(self):
        token = self._csrf()
        r = self.client.post('/api/auth/login/', {'username': 'bob', 'password': 'zle'},
                             content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(r.status_code, 401)

    def test_protected_api_requires_session(self):
        self.assertEqual(self.client.get('/api/customers/').status_code, 401)
        token = self._csrf()
        self.client.post('/api/auth/login/', {'username': 'bob', 'password': 'pass12345'},
                         content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(self.client.get('/api/customers/').status_code, 200)

    def test_write_without_csrf_header_is_403(self):
        token = self._csrf()
        self.client.post('/api/auth/login/', {'username': 'bob', 'password': 'pass12345'},
                         content_type='application/json', HTTP_X_CSRFTOKEN=token)
        r = self.client.post('/api/customers/', {'first_name': 'A'}, content_type='application/json')
        self.assertEqual(r.status_code, 403)
