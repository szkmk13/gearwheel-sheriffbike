from datetime import timedelta

from django.db.models import Prefetch
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.customers.models import Bike

from . import services
from .filters import StorageBookingFilter
from .models import StorageBooking, StorageEvent
from .serializers import (
    CancelSerializer,
    CheckInSerializer,
    CheckOutSerializer,
    ExtendSerializer,
    OccupancySerializer,
    PaymentSerializer,
    StorageBookingDetailSerializer,
    StorageBookingListSerializer,
    StorageBookingWriteSerializer,
    StorageDashboardSerializer,
    StorageEventSerializer,
)

# Domyslne okno dla /occupancy/, gdy klient nie poda dat - rok wstecz od dzis pokrywa
# caly poprzedni sezon zimowy niezaleznie od tego, ktory mamy miesiac.
DEFAULT_OCCUPANCY_DAYS = 365


@extend_schema_view(
    list=extend_schema(
        summary=_('List storage bookings'),
        description=_(
            'Winter storage stays, one per piece of equipment. The owner and the physical '
            'tag number are read from the linked repair order (`customer`, `tag`), so they '
            'never drift from it. Supports filtering (`status` - also several comma-separated '
            'values, `customer`, `bike`, `repair_order`, `category`, `start_after`, '
            '`end_before`, `active_on`, `overdue`, `unpaid`), searching (`search` over the '
            'customer and equipment) and ordering (`ordering`).'
        ),
        parameters=[
            OpenApiParameter(
                'status', str, OpenApiParameter.QUERY,
                enum=[c[0] for c in StorageBooking.STATUS_CHOICES],
                many=True, style='form', explode=False,
                description=_(
                    'Filter by status. Accepts several values separated by commas '
                    '(e.g. `status=reserved,stored`). An unknown status is rejected with a 400.'
                ),
            ),
            OpenApiParameter(
                'category', str, OpenApiParameter.QUERY,
                enum=[c[0] for c in Bike.CATEGORY_CHOICES],
                description=_('Filter by equipment category (`bike` / `winter`).'),
            ),
            OpenApiParameter(
                'active_on', str, OpenApiParameter.QUERY,
                description=_(
                    'Stays covering the given day (`YYYY-MM-DD`), cancelled and picked-up '
                    'ones excluded. This is what "what is in the shop today" asks for.'
                ),
            ),
            OpenApiParameter(
                'overdue', bool, OpenApiParameter.QUERY,
                description=_('Equipment still stored past its agreed end date.'),
            ),
            OpenApiParameter(
                'unpaid', bool, OpenApiParameter.QUERY,
                description=_('Stays with an outstanding balance (cancelled ones excluded).'),
            ),
        ],
    ),
    retrieve=extend_schema(summary=_('Storage booking detail, with its event log')),
    create=extend_schema(
        summary=_('Reserve storage for one piece of equipment'),
        description=_(
            'The repair order is required - it carries the claim tag the equipment is '
            'labelled with, and the equipment must be attached to that order. `price` '
            'defaults to `STORAGE_DEFAULT_PRICE` and is stored on the booking, so later '
            'price changes never rewrite existing bookings. The same piece of equipment '
            'cannot have two overlapping active stays.'
        ),
    ),
    update=extend_schema(summary=_('Edit a storage booking')),
    partial_update=extend_schema(summary=_('Edit a storage booking')),
    destroy=extend_schema(summary=_('Delete a storage booking')),
)
class StorageBookingViewSet(ModelViewSet):
    queryset = (
        StorageBooking.objects
        .select_related('bike', 'repair_order', 'repair_order__customer')
    )
    filterset_class = StorageBookingFilter
    search_fields = [
        'repair_order__customer__first_name', 'repair_order__customer__last_name',
        'repair_order__customer__phone', 'bike__brand', 'bike__model', 'bike__serial_no',
    ]
    ordering_fields = ['start_date', 'end_date', 'created_at', 'price', 'status']

    ACTION_SERIALIZERS = {
        'check_in': CheckInSerializer,
        'check_out': CheckOutSerializer,
        'extend': ExtendSerializer,
        'cancel': CancelSerializer,
        'payment': PaymentSerializer,
        'events': StorageEventSerializer,
    }

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ('retrieve', 'events'):
            qs = qs.prefetch_related(
                Prefetch('events', queryset=StorageEvent.objects.select_related('performed_by'))
            )
        return qs

    def get_serializer_class(self):
        if self.action in self.ACTION_SERIALIZERS:
            return self.ACTION_SERIALIZERS[self.action]
        if self.action == 'list':
            return StorageBookingListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return StorageBookingWriteSerializer
        return StorageBookingDetailSerializer

    def perform_create(self, serializer):
        # Tworzenie idzie przez serwis, zeby rezerwacja z API i ta z komendy/testu
        # przechodzily dokladnie te sama walidacje i zostawialy zdarzenie `reserve`.
        serializer.instance = services.create_booking(
            user=self.request.user, **serializer.validated_data
        )

    def _run(self, request, handler, **kwargs):
        """Wspolny szkielet akcji: waliduje wejscie, wola serwis, zwraca pelny obiekt."""
        booking = self.get_object()
        payload = self.get_serializer(data=request.data)
        payload.is_valid(raise_exception=True)
        booking = handler(booking, user=request.user, **{
            key: payload.validated_data.get(key, default)
            for key, default in kwargs.items()
        })
        return Response(StorageBookingDetailSerializer(booking, context=self.get_serializer_context()).data)

    @extend_schema(
        summary=_('Check the equipment in'),
        description=_('Moves a `reserved` booking to `stored` and stamps `checked_in_at`.'),
        request=CheckInSerializer, responses=StorageBookingDetailSerializer,
    )
    @action(detail=True, methods=['post'], url_path='check-in')
    def check_in(self, request, pk=None):
        return self._run(request, services.check_in, notes='')

    @extend_schema(
        summary=_('Hand the equipment back'),
        description=_(
            'Moves a `stored` booking to `picked_up` and stamps `checked_out_at`. An '
            'outstanding balance does not block the handover - the shop settles payment '
            'separately - it stays visible as `balance_due`.'
        ),
        request=CheckOutSerializer, responses=StorageBookingDetailSerializer,
    )
    @action(detail=True, methods=['post'], url_path='check-out')
    def check_out(self, request, pk=None):
        return self._run(request, services.check_out, notes='')

    @extend_schema(
        summary=_('Change the end date of a stay'),
        description=_(
            'Works in both directions - extending and shortening - as long as the stay '
            'stays valid and does not overlap another stay of the same equipment.'
        ),
        request=ExtendSerializer, responses=StorageBookingDetailSerializer,
    )
    @action(detail=True, methods=['post'])
    def extend(self, request, pk=None):
        return self._run(request, services.extend, end_date=None, note='')

    @extend_schema(
        summary=_('Cancel a booking'),
        description=_('Frees the dates up. A picked-up stay cannot be cancelled.'),
        request=CancelSerializer, responses=StorageBookingDetailSerializer,
    )
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        return self._run(request, services.cancel, reason='')

    @extend_schema(
        summary=_('Register a payment'),
        description=_(
            'Adds to `paid_amount`; paying the full price stamps `paid_at`. Paying more '
            'than the remaining balance is rejected with a 400.'
        ),
        request=PaymentSerializer, responses=StorageBookingDetailSerializer,
    )
    @action(detail=True, methods=['post'])
    def payment(self, request, pk=None):
        return self._run(request, services.register_payment, amount=None, note='')

    @extend_schema(summary=_('Event log of one booking'), responses=StorageEventSerializer(many=True))
    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        booking = self.get_object()
        return Response(StorageEventSerializer(booking.events.all(), many=True).data)


@extend_schema(
    summary=_('Storage occupancy over a date range'),
    description=_(
        'How many pieces of equipment sit in the shop on each day of the range. The shop '
        'has no numbered parking spots and staff see the free space on site, so this '
        'reports occupancy only - there is no capacity to compare it against. `timeline` '
        'lists just the days the number changes, clipped to the range, which is what a '
        'chart needs. Defaults to the last 365 days.'
    ),
    parameters=[
        OpenApiParameter('start', str, OpenApiParameter.QUERY, description=_('Range start, `YYYY-MM-DD`.')),
        OpenApiParameter('end', str, OpenApiParameter.QUERY, description=_('Range end, `YYYY-MM-DD`, inclusive.')),
        OpenApiParameter(
            'category', str, OpenApiParameter.QUERY,
            enum=[c[0] for c in Bike.CATEGORY_CHOICES],
            description=_('Count only bikes or only winter equipment.'),
        ),
    ],
    responses=OccupancySerializer,
)
class OccupancyView(APIView):
    def get(self, request):
        today = timezone.localdate()
        start = self._date(request, 'start', today - timedelta(days=DEFAULT_OCCUPANCY_DAYS))
        end = self._date(request, 'end', today)
        category = request.query_params.get('category') or None
        if category and category not in dict(Bike.CATEGORY_CHOICES):
            raise ValidationError({'category': 'Nieznana kategoria sprzetu.'})

        data = services.occupancy(start, end, category=category)
        return Response(OccupancySerializer(data).data)

    @staticmethod
    def _date(request, param, default):
        raw = request.query_params.get(param)
        if not raw:
            return default
        field = OccupancySerializer().fields['start']
        try:
            return field.to_internal_value(raw)
        except ValidationError:
            raise ValidationError({param: 'Data musi byc w formacie YYYY-MM-DD.'})


@extend_schema(
    summary=_('Storage dashboard counters'),
    description=_(
        'What is in the shop right now, due for pickup within a week, overdue, upcoming, '
        'and how much money is still outstanding.'
    ),
    responses=StorageDashboardSerializer,
)
class StorageDashboardView(APIView):
    def get(self, request):
        return Response(StorageDashboardSerializer(services.dashboard()).data)
