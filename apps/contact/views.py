from django.utils import timezone
from django.utils.decorators import method_decorator
from django.utils.translation import gettext_lazy as _
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import ContactFormSerializer
from .services import append_lead_to_sheet, verify_turnstile


class ContactFormResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()


@method_decorator(csrf_exempt, name='dispatch')
class ContactFormView(APIView):
    # Public, unauthenticated endpoint - DRF's APIView already marks dispatch
    # csrf_exempt, but this makes it explicit regardless of DRF internals.
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        summary=_('Submit the contact form'),
        description=_(
            'Public, unauthenticated endpoint for the contact/booking form on the marketing '
            'frontend. Appends the submission as a new row to the configured Google Sheet (via a '
            'Google service account, `GOOGLE_SHEETS_SPREADSHEET_ID` / '
            '`GOOGLE_SERVICE_ACCOUNT_FILE`/`GOOGLE_SERVICE_ACCOUNT_JSON`). If Google Sheets is not '
            'configured, the append is skipped (with a warning logged), but the endpoint still '
            'returns `201`. Cloudflare Turnstile verification is present in the code but currently disabled.'
        ),
        request=ContactFormSerializer,
        responses={201: ContactFormResponseSerializer},
        examples=[
            OpenApiExample(
                'Sample submission',
                value={
                    'name': 'Jan Kowalski',
                    'phone': '+48123456789',
                    'equip': 'Road bike',
                    'service': 'Periodic checkup',
                    'date': '2026-08-10',
                    'msg': 'Please contact after 4 PM',
                },
                request_only=True,
            ),
        ],
    )
    def post(self, request):
        serializer = ContactFormSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        remote_ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
        if remote_ip:
            remote_ip = remote_ip.split(',')[0].strip()

        # if not verify_turnstile(data['turnstile_token'], remote_ip):
        #     return Response(
        #         {'detail': 'Weryfikacja captcha nie powiodła się. Spróbuj ponownie.'},
        #         status=status.HTTP_400_BAD_REQUEST,
        #     )

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
