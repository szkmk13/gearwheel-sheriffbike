import uuid

from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from .models import Customer, Bike
from .serializers import CustomerListSerializer, CustomerDetailSerializer, BikeSerializer


class CustomerViewSet(ModelViewSet):
    queryset = Customer.objects.all()
    filterset_fields = ['email']
    search_fields = ['first_name', 'last_name', 'phone', 'email']
    ordering_fields = ['last_name', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return CustomerListSerializer
        return CustomerDetailSerializer


class BikeLookupView(APIView):
    @extend_schema(
        summary=_('Look up a bike by QR code'),
        description=_(
            'Looks up a bike by its `sheriff_code` (format `sheriff-<id>-<uuid>`), as scanned from '
            'the QR code attached to the bike.'
        ),
        parameters=[
            OpenApiParameter(
                'code', str, OpenApiParameter.QUERY, required=True,
                description=_('The bike\'s `sheriff_code`, e.g. `sheriff-5-9c1e2f2a-1234-4a5b-8b1c-abcdef123456`.'),
            ),
        ],
        responses={
            200: BikeSerializer,
            404: OpenApiResponse(description=_('No bike found for the given code.')),
        },
    )
    def get(self, request):
        code = request.query_params.get('code', '').strip()

        prefix = 'sheriff-'
        rest = code[len(prefix):] if code.startswith(prefix) else ''
        bike_id, _, bike_uuid = rest.partition('-')

        bike = None
        if bike_id.isdigit() and bike_uuid:
            try:
                bike_uuid = uuid.UUID(bike_uuid)
            except ValueError:
                bike_uuid = None
            if bike_uuid:
                bike = Bike.objects.filter(pk=bike_id, uuid=bike_uuid).select_related('customer').first()

        if not bike:
            return Response({'detail': 'Nie znaleziono roweru dla podanego kodu.'}, status=404)

        serializer = BikeSerializer(bike)
        return Response(serializer.data)
