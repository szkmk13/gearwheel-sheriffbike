from drf_spectacular.extensions import OpenApiAuthenticationExtension

from .auth import ACCESS_TOKEN_COOKIE


class CookieJWTScheme(OpenApiAuthenticationExtension):
    target_class = 'apps.customers.auth.CookieJWTAuthentication'
    name = 'jwtCookieAuth'

    def get_security_definition(self, auto_schema):
        return {
            'type': 'apiKey',
            'in': 'cookie',
            'name': ACCESS_TOKEN_COOKIE,
            'description': (
                'JWT access token set as an httpOnly cookie by POST /api/auth/login/. '
                'Falls back to a standard `Authorization: Bearer <token>` header when present.'
            ),
        }
