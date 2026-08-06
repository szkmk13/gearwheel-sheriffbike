from django.conf import settings
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
        summary='Zaloguj użytkownika',
        description=(
            'Weryfikuje `username`/`password` i, jeśli poprawne, uwierzytelnia użytkownika. '
            'Wygenerowane tokeny JWT (`access` i `refresh`) nie są zwracane w body odpowiedzi - '
            'trafiają wyłącznie jako httpOnly cookies (`access_token`, `refresh_token`, '
            '`SameSite=Lax`, `Secure` poza trybem DEBUG). Kolejne żądania do API są autoryzowane '
            'automatycznie przez przeglądarkę na podstawie tych ciasteczek, bez potrzeby wysyłania '
            'nagłówka `Authorization`. Endpoint jest publiczny (nie wymaga wcześniejszej autoryzacji).'
        ),
        responses={
            200: AuthenticatedUserSerializer,
            401: OpenApiResponse(description='Nieprawidłowa nazwa użytkownika lub hasło.'),
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
        summary='Odśwież token dostępu',
        description=(
            'Odczytuje `refresh_token` z httpOnly cookie (nie trzeba nic przesyłać w body) i, jeśli '
            'jest ważny, wydaje nowy `access_token`. Jeśli w `SIMPLE_JWT.ROTATE_REFRESH_TOKENS` włączona '
            'jest rotacja, ustawiany jest też nowy `refresh_token`. Oba tokeny trafiają wyłącznie do '
            'httpOnly cookies - odpowiedź nie zawiera żadnych danych w body.'
        ),
        request=None,
        responses={
            200: EmptyResponseSerializer,
            401: OpenApiResponse(description='Refresh token cookie missing or invalid.'),
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
        summary='Wyloguj użytkownika',
        description=(
            'Czyści ciasteczka `access_token` i `refresh_token`, kończąc sesję po stronie klienta. '
            'Endpoint jest publiczny i bezstanowy (nie waliduje wcześniejszego uwierzytelnienia) - '
            'wywołanie go bez aktywnej sesji również zwraca `204`.'
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
        summary='Dane zalogowanego użytkownika',
        description=(
            'Zwraca podstawowe dane użytkownika aktualnie uwierzytelnionego na podstawie ciasteczka '
            '`access_token` (lub nagłówka `Authorization`, jeśli obecny). Wymaga ważnego uwierzytelnienia.'
        ),
        responses={
            200: AuthenticatedUserSerializer,
            401: OpenApiResponse(description='Brak lub nieprawidłowe uwierzytelnienie.'),
        },
    )
    def get(self, request, *args, **kwargs):
        return Response(AuthenticatedUserSerializer(request.user).data)
