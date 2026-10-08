import uuid

from django.db.models import Prefetch
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.fields import BooleanField
from rest_framework.generics import CreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.orders.models import RepairOrder

from .models import Customer, Bike
from .serializers import (
    CustomerListSerializer, CustomerDetailSerializer, BikeSerializer,
    BikeReadSerializer, BikeDetailSerializer
)
from .services import find_existing_customer


class CustomerViewSet(ModelViewSet):
    queryset = Customer.objects.prefetch_related(
        'bikes',
        Prefetch(
            'repair_orders',
            queryset=RepairOrder.objects.prefetch_related('bikes').order_by('-created_at'),
        ),
    )
    filterset_fields = ['email']
    search_fields = ['first_name', 'last_name', 'phone', 'email']
    ordering_fields = ['last_name', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return CustomerListSerializer
        return CustomerDetailSerializer

    @extend_schema(
        summary=_('Create a customer, or return the one with this phone number'),
        description=_(
            'Customers are unique by phone number. If one already exists under the given '
            'number (in any notation), it is returned unchanged with status 200 and '
            '`existing: true` instead of creating a duplicate. A `rodo_accepted: true` in '
            'the request is still recorded on it.'
        ),
        responses={201: CustomerDetailSerializer, 200: CustomerDetailSerializer},
    )
    def create(self, request, *args, **kwargs):
        existing = find_existing_customer(
            request.data.get('phone'),
            rodo_accepted=str(request.data.get('rodo_accepted')).lower() in BooleanField.TRUE_VALUES,
        )
        if existing:
            data = self.get_serializer(existing).data
            return Response({**data, 'existing': True}, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)


@extend_schema(responses=BikeReadSerializer)
class BikeCreateView(CreateAPIView):
    queryset = Bike.objects.select_related('customer')
    serializer_class = BikeSerializer


@extend_schema(responses=BikeDetailSerializer)
class BikeDetailView(RetrieveUpdateDestroyAPIView):
    queryset = Bike.objects.select_related('customer').prefetch_related(
        Prefetch('repair_orders', queryset=RepairOrder.objects.select_related('customer').prefetch_related('bikes').order_by('-created_at'))
    )

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return BikeSerializer
        return BikeDetailSerializer


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
            200: BikeReadSerializer,
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
