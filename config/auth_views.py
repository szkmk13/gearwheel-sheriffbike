from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.utils.translation import gettext_lazy as _
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import serializers, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.customers.auth import AuthenticatedUserSerializer


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False, style={'input_type': 'password'})


# csrf_protect: DRF views are csrf_exempt by default and SessionAuthentication only
# checks the token once a session already exists - so without this an anonymous
# POST here would skip CSRF entirely, leaving the endpoint open to login CSRF.
@method_decorator(csrf_protect, name='dispatch')
class LoginView(APIView):
    """Verifies credentials and starts a Django session."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        summary=_('Log in a user'),
        description=_(
            'Verifies `username`/`password` and, if valid, starts a session. The session id is '
            'set as an httpOnly `sessionid` cookie (`SameSite=Lax`, `Secure` outside DEBUG mode); '
            'subsequent API requests are authorized automatically by the browser. Unsafe methods '
            'must additionally send the `csrftoken` cookie value in an `X-CSRFToken` header. '
            'This endpoint is public (no prior authentication required).'
        ),
        request=LoginSerializer,
        responses={
            200: AuthenticatedUserSerializer,
            401: OpenApiResponse(description=_('Invalid username or password.')),
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(request, **serializer.validated_data)
        if user is None:
            raise AuthenticationFailed(_('Invalid username or password.'))

        # Also rotates the CSRF token, so the frontend must read the csrftoken
        # cookie fresh on every request rather than caching it at startup.
        login(request, user)
        return Response(AuthenticatedUserSerializer(user).data, status=status.HTTP_200_OK)


@method_decorator(csrf_protect, name='dispatch')
class LogoutView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary=_('Log out a user'),
        description=_(
            'Flushes the session and clears the `sessionid` cookie. Calling it without an active '
            'session also returns `204`.'
        ),
        request=None,
        responses={204: None},
    )
    def post(self, request, *args, **kwargs):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ensure_csrf_cookie: the SPA calls this on boot, which is what seeds the csrftoken
# cookie when the shell is served by the Vite dev server instead of Django.
@method_decorator(ensure_csrf_cookie, name='dispatch')
class MeView(APIView):
    @extend_schema(
        summary=_('Current authenticated user'),
        description=_('Returns basic data for the user owning the current session.'),
        responses={
            200: AuthenticatedUserSerializer,
            401: OpenApiResponse(description=_('Missing or invalid authentication.')),
        },
    )
    def get(self, request, *args, **kwargs):
        return Response(AuthenticatedUserSerializer(request.user).data)
