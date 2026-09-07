from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    """Return 401 (not DRF's default 403) when the request simply isn't authenticated.

    SessionAuthentication defines no `WWW-Authenticate` header, so DRF downgrades
    NotAuthenticated/AuthenticationFailed to 403 - indistinguishable from a CSRF
    rejection or a real permission denial. The SPA needs the two apart: 401 means
    "log in again", 403 means "you may not do this".
    """
    response = drf_exception_handler(exc, context)
    if response is not None and isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
        response.status_code = status.HTTP_401_UNAUTHORIZED
    return response
