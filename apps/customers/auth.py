from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication

ACCESS_TOKEN_COOKIE = 'access_token'
REFRESH_TOKEN_COOKIE = 'refresh_token'


class CookieJWTAuthentication(JWTAuthentication):
    """JWT authentication that also accepts the access token from an httpOnly cookie.

    Falls back to the default `Authorization` header behaviour when present;
    otherwise reads the raw token from the `access_token` cookie.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        raw_token = request.COOKIES.get(ACCESS_TOKEN_COOKIE)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token


def set_jwt_cookies(response, access_token, refresh_token=None):
    """Set the access (and optionally refresh) token as httpOnly cookies on `response`."""
    response.set_cookie(
        ACCESS_TOKEN_COOKIE,
        str(access_token),
        httponly=True,
        samesite='Lax',
        secure=not settings.DEBUG,
        path='/',
    )
    if refresh_token is not None:
        response.set_cookie(
            REFRESH_TOKEN_COOKIE,
            str(refresh_token),
            httponly=True,
            samesite='Lax',
            secure=not settings.DEBUG,
            path='/',
        )


def delete_jwt_cookies(response):
    response.delete_cookie(ACCESS_TOKEN_COOKIE, path='/')
    response.delete_cookie(REFRESH_TOKEN_COOKIE, path='/')
