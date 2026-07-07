from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.customers.auth import (
    REFRESH_TOKEN_COOKIE,
    delete_jwt_cookies,
    set_jwt_cookies,
)


def _user_payload(user):
    return {
        'id': user.id,
        'username': user.username,
        'is_staff': user.is_staff,
    }


class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        access = serializer.validated_data['access']
        refresh = serializer.validated_data['refresh']

        response = Response(_user_payload(serializer.user), status=status.HTTP_200_OK)
        set_jwt_cookies(response, access, refresh)
        return response


class CookieTokenRefreshView(TokenRefreshView):
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

    def post(self, request, *args, **kwargs):
        response = Response(status=status.HTTP_204_NO_CONTENT)
        delete_jwt_cookies(response)
        return response


class MeView(APIView):
    def get(self, request, *args, **kwargs):
        return Response(_user_payload(request.user))
