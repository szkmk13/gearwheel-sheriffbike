from django.conf import settings
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.customers.auth import (
    REFRESH_TOKEN_COOKIE,
    AuthenticatedUserSerializer,
    delete_jwt_cookies,
    set_jwt_cookies,
)


class EmptyResponseSerializer(serializers.Serializer):
    """Documents endpoints that return no body (tokens/state travel via cookies)."""


class LoginView(TokenObtainPairView):
    """Authenticates the user and sets JWT access/refresh cookies."""

    @extend_schema(
        summary=_('Log in a user'),
        description=_(
            'Verifies `username`/`password` and, if valid, authenticates the user. '
            'The generated JWT tokens (`access` and `refresh`) are not returned in the response '
            'body - they are set only as httpOnly cookies (`access_token`, `refresh_token`, '
            '`SameSite=Lax`, `Secure` outside DEBUG mode). Subsequent API requests are authorized '
            'automatically by the browser based on these cookies, with no need to send an '
            '`Authorization` header. This endpoint is public (no prior authentication required).'
        ),
        responses={
            200: AuthenticatedUserSerializer,
            401: OpenApiResponse(description=_('Invalid username or password.')),
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        access = serializer.validated_data['access']
        refresh = serializer.validated_data['refresh']

        response = Response(AuthenticatedUserSerializer(serializer.user).data, status=status.HTTP_200_OK)
        set_jwt_cookies(response, access, refresh)
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """Reads the refresh token from its httpOnly cookie and issues a new access cookie."""

    @extend_schema(
        summary=_('Refresh the access token'),
        description=_(
            'Reads the `refresh_token` from its httpOnly cookie (nothing needs to be sent in the '
            'body) and, if it is valid, issues a new `access_token`. If `SIMPLE_JWT.ROTATE_REFRESH_TOKENS` '
            'is enabled, a new `refresh_token` is also set. Both tokens are set only as httpOnly '
            'cookies - the response body contains no data.'
        ),
        request=None,
        responses={
            200: EmptyResponseSerializer,
            401: OpenApiResponse(description=_('Refresh token cookie missing or invalid.')),
        },
    )
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(REFRESH_TOKEN_COOKIE)
        if not refresh_token:
            return Response({'detail': 'Refresh token cookie missing.'}, status=status.HTTP_401_UNAUTHORIZED)

        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        data['refresh'] = refresh_token

        serializer = TokenRefreshSerializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        access = serializer.validated_data['access']
        new_refresh = serializer.validated_data.get('refresh') if settings.SIMPLE_JWT.get('ROTATE_REFRESH_TOKENS') else None

        response = Response({}, status=status.HTTP_200_OK)
        set_jwt_cookies(response, access, new_refresh)
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary=_('Log out a user'),
        description=_(
            'Clears the `access_token` and `refresh_token` cookies, ending the session on the '
            'client side. This endpoint is public and stateless (it does not validate any prior '
            'authentication) - calling it without an active session also returns `204`.'
        ),
        request=None,
        responses={204: None},
    )
    def post(self, request, *args, **kwargs):
        response = Response(status=status.HTTP_204_NO_CONTENT)
        delete_jwt_cookies(response)
        return response


class MeView(APIView):
    @extend_schema(
        summary=_('Current authenticated user'),
        description=_(
            'Returns basic data for the user currently authenticated via the `access_token` cookie '
            '(or the `Authorization` header, if present). Requires valid authentication.'
        ),
        responses={
            200: AuthenticatedUserSerializer,
            401: OpenApiResponse(description=_('Missing or invalid authentication.')),
        },
    )
    def get(self, request, *args, **kwargs):
        return Response(AuthenticatedUserSerializer(request.user).data)
