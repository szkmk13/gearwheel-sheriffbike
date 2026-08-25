"""Public, unauthenticated endpoints backing the React landing page.

Everything here is reachable by anonymous visitors - the rest of the API
defaults to IsAdminUser, so each view opts out explicitly.
"""

from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import ContactFormSerializer
from .services import append_lead_to_sheet, fetch_google_reviews, verify_turnstile


@method_decorator(csrf_exempt, name='dispatch')
class ContactFormView(APIView):
    # Public, unauthenticated endpoint - DRF's APIView already marks dispatch
    # csrf_exempt, but this makes it explicit regardless of DRF internals.
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ContactFormSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        remote_ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
        if remote_ip:
            remote_ip = remote_ip.split(',')[0].strip()

        if not verify_turnstile(data['turnstile_token'], remote_ip):
            return Response(
                {'detail': 'Weryfikacja captcha nie powiodła się. Spróbuj ponownie.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        append_lead_to_sheet({
            'created_at': timezone.localtime().strftime('%Y-%m-%d %H:%M'),
            'name': data['name'],
            'phone': data['phone'],
            'equip': data.get('equip', ''),
            'service': data.get('service', ''),
            'date': data.get('date', ''),
            'msg': data.get('msg', ''),
        })

        return Response({'ok': True}, status=status.HTTP_201_CREATED)


class GoogleReviewsView(APIView):
    """Public read-only feed of the shop's Google reviews for the landing page."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        data = fetch_google_reviews()
        if data is None:
            # Not configured, or Google is unreachable. The frontend falls back
            # to its own hardcoded numbers, so a 200 with source="fallback"
            # keeps that path simple - this is not an error the user caused.
            return Response({'source': 'fallback', 'reviews': []})
        return Response({'source': 'google', **data})
