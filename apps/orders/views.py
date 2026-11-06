from datetime import timedelta
from decimal import Decimal

from django.db.models import Case, Count, F, IntegerField, Prefetch, Sum, When
from django.db.models.functions import Coalesce, TruncWeek
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.customers.models import Bike, Customer

from .filters import RepairOrderFilter
from .models import RepairOrder, RepairOrderItem
from .services import (
    SmsNotAllowed,
    add_item,
    change_order_status,
    remove_item,
    update_item,
    ready_for_pickup_sms_preview,
    send_ready_for_pickup_sms,
)
from .serializers import (
    CalendarRangeSerializer,
    ChangeOrderStatusResponseSerializer,
    ChangeOrderStatusSerializer,
    DashboardSerializer,
    RepairOrderListSerializer,
    RepairOrderCreateSerializer,
    RepairOrderDetailSerializer,
    RepairOrderWriteSerializer,
    RepairOrderItemCreateSerializer,
    RepairOrderItemSerializer,
    RepairOrderItemUpdateSerializer,
    SendSmsSerializer,
    SmsResultSerializer,
    StatusHistorySerializer,
)


STATUS_ORDER = ['done', 'in_progress', 'estimating', 'waiting_parts', 'accepted', 'delivered', 'cancelled']


@extend_schema_view(
    list=extend_schema(
        summary=_('List repair orders'),
        description=_(
            'Returns repair orders sorted by status (order: done, in_progress, estimating, '
            'waiting_parts, accepted, delivered, cancelled), and within each status - newest first. '
            'Supports filtering (`status`, `priority`, `customer`, `bike`, `category`, where `status` and '
            '`priority` also accept several comma-separated values), searching '
            '(`search` over the description, customer and equipment data, plus the claim-tag '
            'number), and ordering (`ordering`). '
            'Each order also exposes `cost` - its effective price, i.e. `final_cost` once it is '
            'known, otherwise `estimated_cost`.'
        ),
        parameters=[
            OpenApiParameter(
                'status', str, OpenApiParameter.QUERY, enum=[c[0] for c in RepairOrder.STATUS_CHOICES],
                many=True, style='form', explode=False,
                description=_(
                    'Filter by order status. Accepts several statuses separated by commas '
                    '(e.g. `status=in_progress,waiting_parts`) - orders matching any of them are '
                    'returned. An unknown status is rejected with a 400.'
                ),
            ),
            OpenApiParameter(
                'priority', str, OpenApiParameter.QUERY, enum=[c[0] for c in RepairOrder.PRIORITY_CHOICES],
                many=True, style='form', explode=False,
                description=_(
                    'Filter by order priority. Accepts several priorities separated by commas '
                    '(e.g. `priority=normal,high`) - orders matching any of them are returned. '
                    'An unknown priority is rejected with a 400.'
                ),
            ),
            OpenApiParameter(
                'customer', int, OpenApiParameter.QUERY,
                description=_('Filter by customer ID.'),
            ),
            OpenApiParameter(
                'bike', int, OpenApiParameter.QUERY,
                description=_(
                    'Filter by equipment ID. Matches orders where the given bike or winter '
                    'item is attached, whichever position it holds on the order.'
                ),
            ),
            OpenApiParameter(
                'category', str, OpenApiParameter.QUERY, enum=[c[0] for c in Bike.CATEGORY_CHOICES],
                description=_(
                    'Filter by equipment category (`bike` / `winter`); one value or several '
                    'comma-separated. Matches orders holding at least one item of that category.'
                ),
            ),
            OpenApiParameter(
                'search', str, OpenApiParameter.QUERY,
                description=_(
                    'Free-text search over `description`, the customer\'s first/last name and the '
                    'equipment brand/model. Also matches the claim-tag number '
                    '(`bike_tag_number`) partially, e.g. `search=9` finds tags 9, 19 and 91.'
                ),
            ),
            OpenApiParameter(
                'ordering', str, OpenApiParameter.QUERY,
                enum=[
                    'created_at', '-created_at', 'updated_at', '-updated_at', 'priority', '-priority',
                    'estimated_cost', '-estimated_cost', 'final_cost', '-final_cost',
                    'cost', '-cost', 'estimated_pickup_date', '-estimated_pickup_date',
                ],
                description=_(
                    'Order results by the given field; prefix with `-` for descending order. '
                    'Overrides the default status-based ordering. Orders with no cost set '
                    '(`null`) are grouped together at one end of a cost-ordered list.'
                ),
            ),
        ],
    ),
    create=extend_schema(
        summary=_('Create a repair order'),
        description=_(
            'Opens a new repair order for the given customer and equipment. An order can cover '
            'several pieces of equipment at once (e.g. two pairs of skis) - pass them as `bikes`, '
            'a list of equipment IDs. The legacy single-item form (`bike`) is still accepted and '
            'creates a one-item order. `bike_tag_number` is the physical claim-tag number (a plain '
            'integer) attached to the equipment while it is in the shop; one tag covers the whole '
            'order, however many items it holds. It is not a unique identifier and may repeat '
            'across different orders. '
            '`priority` is optional and defaults to `normal`. `status` is not an input here - '
            'new orders always start as `accepted` (change it afterwards via the status endpoint). '
            '`estimated_pickup_date` is required and cannot be in the past. '
            '`accepted_at`, `delivered_at`, and `final_cost` do not apply to creation and are also '
            'not accepted. The response returns the full order object (same shape as retrieve), '
            'including the auto-assigned defaults.'
        ),
        request=RepairOrderCreateSerializer,
        responses={201: RepairOrderDetailSerializer},
    ),
    retrieve=extend_schema(
        summary=_('Retrieve a repair order'),
        description=_('Returns the full order data, including items (`items`) and status history (`status_history`).'),
    ),
    update=extend_schema(
        summary=_('Update a repair order'),
        description=_('Overwrites all editable fields of the order.'),
    ),
    partial_update=extend_schema(
        summary=_('Partially update a repair order'),
        description=_('Updates selected fields of the order without submitting the whole object.'),
    ),
    destroy=extend_schema(
        summary=_('Delete a repair order'),
        description=_('Permanently deletes the order.'),
    ),
)
class RepairOrderViewSet(ModelViewSet):
    queryset = RepairOrder.objects.select_related('customer').prefetch_related(
        # Ordered by id so `bike` (the legacy single-equipment field) is the item that
        # was attached first, not whichever sorts first alphabetically.
        Prefetch('bikes', queryset=Bike.objects.select_related('customer').order_by('id')),
    ).annotate(
        status_order=Case(
            *[When(status=status_value, then=position) for position, status_value in enumerate(STATUS_ORDER)],
            output_field=IntegerField(),
        ),
        # The effective cost, mirroring RepairOrderListSerializer.get_cost - annotated so
        # `?ordering=cost` sorts on the same value the list response shows.
        cost=Coalesce(F('final_cost'), F('estimated_cost')),
    ).order_by('status_order', '-created_at')
    filterset_class = RepairOrderFilter
    # `bike_tag_number` is an integer, but icontains casts it to text - `9` matches tags 9, 19, 91...
    search_fields = [
        'description', 'customer__first_name', 'customer__last_name', 'bikes__brand', 'bikes__model',
        'bike_tag_number',
    ]
    ordering_fields = ['created_at', 'updated_at', 'priority', 'estimated_cost', 'final_cost', 'cost',
        'estimated_pickup_date',
    ]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action != 'list':
            qs = qs.prefetch_related(Prefetch('items', queryset=RepairOrderItem.objects.select_related('part')))
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return RepairOrderListSerializer
        if self.action == 'create':
            return RepairOrderCreateSerializer
        if self.action in ('update', 'partial_update'):
            return RepairOrderWriteSerializer
        return RepairOrderDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        detail = RepairOrderDetailSerializer(serializer.instance)
        return Response(detail.data, status=status.HTTP_201_CREATED, headers=headers)

    @extend_schema(
        summary=_('Change a repair order status'),
        description=_(
            'Changes the order status and appends an entry to its status history (`old_status`, '
            '`new_status`, `changed_by`, optional `note`). Transitioning to `accepted` sets '
            '`accepted_at`, and to `delivered` sets `delivered_at` (unless already set). '
            'The request is rejected if the given status is invalid or identical to the current one. '
            'Nothing is sent to the customer here. The response is the full order plus '
            '`sms_preview`: when the order became `done` (ready for pickup), the number and the '
            'suggested text of the pickup SMS for staff to review and send via `POST .../sms/`; '
            'otherwise `null`.'
        ),
        request=ChangeOrderStatusSerializer,
        responses={
            200: ChangeOrderStatusResponseSerializer,
            400: OpenApiResponse(description=_('Invalid status, or the order already has the given status.')),
        },
    )
    @action(detail=True, methods=['post'], url_path='status')
    def change_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        note = request.data.get('note', '')

        valid = [s[0] for s in RepairOrder.STATUS_CHOICES]
        if new_status not in valid:
            return Response({'detail': f'Invalid status. Choices: {valid}'}, status=status.HTTP_400_BAD_REQUEST)

        if new_status == order.status:
            return Response({'detail': 'Order is already in this status.'}, status=status.HTTP_400_BAD_REQUEST)

        change_order_status(order, new_status, request.user, note)
        return Response({
            **RepairOrderDetailSerializer(order).data,
            'sms_preview': ready_for_pickup_sms_preview(order),
        })

    @extend_schema(
        summary=_('Repair orders by pickup date (calendar)'),
        description=_(
            'Orders whose `estimated_pickup_date` falls between `start` and `end` (both '
            'inclusive, at most 42 days - the six weeks of a month view), sorted by that date. '
            'Not paginated, so a busy month is never cut off. Orders without a pickup date are '
            'left out. Accepts the same `status`/`priority`/`category` filters as the list.'
        ),
        parameters=[
            OpenApiParameter('start', OpenApiTypes.DATE, OpenApiParameter.QUERY, required=True),
            OpenApiParameter('end', OpenApiTypes.DATE, OpenApiParameter.QUERY, required=True),
        ],
        responses={
            200: RepairOrderListSerializer(many=True),
            400: OpenApiResponse(description=_('Missing or invalid dates, or a range longer than 42 days.')),
        },
    )
    @action(detail=False, methods=['get'], url_path='calendar')
    def calendar(self, request):
        date_range = CalendarRangeSerializer(data=request.query_params)
        date_range.is_valid(raise_exception=True)
        orders = self.filter_queryset(self.get_queryset()).filter(
            estimated_pickup_date__range=(date_range.validated_data['start'], date_range.validated_data['end']),
        ).order_by('estimated_pickup_date', 'status_order', 'bike_tag_number')
        return Response(RepairOrderListSerializer(orders, many=True).data)

    @extend_schema(
        summary=_('Send the ready-for-pickup SMS'),
        description=_(
            'Texts the customer that the order can be collected, with the (possibly edited) '
            '`message`. Only allowed while the order is `done`. For now the gateway is a mock '
            'that only logs the message (`mocked: true`). On success the SMS is noted on the '
            'latest `done` entry of the status history.'
        ),
        request=SendSmsSerializer,
        responses={
            200: SmsResultSerializer,
            400: OpenApiResponse(description=_(
                'Empty or too long message, the order is not ready for pickup, or the SMS could '
                'not be sent (e.g. the customer has no phone number).'
            )),
        },
    )
    @action(detail=True, methods=['post'], url_path='sms')
    def send_sms(self, request, pk=None):
        order = self.get_object()
        serializer = SendSmsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = send_ready_for_pickup_sms(order, serializer.validated_data['message'])
        except SmsNotAllowed as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if not result['sent']:
            return Response({'detail': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SmsResultSerializer(result).data)

    @extend_schema(
        summary=_('Repair order status history'),
        description=_('Returns the chronological (newest first) list of status changes for the given order.'),
        responses=StatusHistorySerializer(many=True),
    )
    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        order = self.get_object()
        qs = order.status_history.all()
        return Response(StatusHistorySerializer(qs, many=True).data)

    @extend_schema(
        summary=_('Repair order items'),
        description=_(
            'GET - the order items (services, parts, accessories). '
            'POST - adds an item: either a catalogue entry (`part`; description, type and price are '
            'copied from it unless given) or a one-off item without `part` (`description`, '
            '`item_type` and `unit_price` required; `save_to_catalog` also adds it to the catalogue). '
            'A catalogue entry already on the order is not added twice: its quantity is added to the '
            'existing item (whose price stays) and the response is 200 instead of 201. '
            'Every change recalculates the order `final_cost` as the sum of its items. '
            'Items of a delivered or cancelled order cannot be changed.'
        ),
        request=RepairOrderItemCreateSerializer,
        responses={
            200: RepairOrderItemSerializer(many=True),
            201: RepairOrderItemSerializer,
        },
    )
    @action(detail=True, methods=['get', 'post'], url_path='items')
    def items(self, request, pk=None):
        order = self.get_object()
        if request.method == 'GET':
            return Response(RepairOrderItemSerializer(order.items.select_related('part'), many=True).data)
        serializer = RepairOrderItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = add_item(order, **serializer.validated_data)
        return Response(
            RepairOrderItemSerializer(item).data,
            status=status.HTTP_200_OK if item.merged else status.HTTP_201_CREATED,
        )

    @extend_schema(
        summary=_('Update or remove a repair order item'),
        description=_(
            'PATCH - changes the description, quantity, price or type of an item. '
            'DELETE - removes it. Both recalculate the order `final_cost`.'
        ),
        request=RepairOrderItemUpdateSerializer,
        responses={200: RepairOrderItemSerializer, 204: None},
    )
    @action(detail=True, methods=['patch', 'delete'], url_path=r'items/(?P<item_id>\d+)')
    def item_detail(self, request, pk=None, item_id=None):
        order = self.get_object()
        item = get_object_or_404(order.items.all(), pk=item_id)
        if request.method == 'DELETE':
            remove_item(item)
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = RepairOrderItemUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = update_item(item, **serializer.validated_data)
        return Response(RepairOrderItemSerializer(item).data)


class DashboardView(APIView):
    WEEKS_OF_TREND = 8

    @extend_schema(
        summary=_('Dashboard statistics'),
        description=_(
            'Returns aggregate dashboard statistics: total bikes and customers in the system, the '
            'number of orders completed (`done`/`delivered`) this week, the sum of `final_cost` for '
            'those orders, and a weekly trend (orders completed and profit) for the last %(weeks)d '
            'weeks, starting from Monday.'
        ) % {'weeks': WEEKS_OF_TREND},
        responses=DashboardSerializer,
    )
    def get(self, request):
        today = timezone.localdate()
        week_start = today - timedelta(days=today.weekday())

        completed_this_week = RepairOrder.objects.filter(
            status__in=['done', 'delivered'],
            updated_at__date__gte=week_start,
        )

        return Response({
            'bikes_count': Bike.objects.filter(category='bike').count(),
            'winter_items_count': Bike.objects.filter(category='winter').count(),
            'customers_count': Customer.objects.count(),
            'orders_completed_this_week': completed_this_week.count(),
            'profit_this_week': completed_this_week.aggregate(
                total=Coalesce(Sum('final_cost'), Decimal('0'))
            )['total'],
            'weekly_trend': self._weekly_trend(week_start),
        })

    def _weekly_trend(self, current_week_start):
        range_start = current_week_start - timedelta(weeks=self.WEEKS_OF_TREND - 1)

        rows = (
            RepairOrder.objects
            .filter(status__in=['done', 'delivered'], updated_at__date__gte=range_start)
            .annotate(week=TruncWeek('updated_at'))
            .values('week')
            .annotate(
                orders_completed=Count('id'),
                profit=Coalesce(Sum('final_cost'), Decimal('0')),
            )
        )
        by_week = {row['week'].date(): row for row in rows}

        trend = []
        for i in range(self.WEEKS_OF_TREND):
            week_start = range_start + timedelta(weeks=i)
            row = by_week.get(week_start)
            trend.append({
                'week_start': week_start,
                'orders_completed': row['orders_completed'] if row else 0,
                'profit': row['profit'] if row else Decimal('0'),
            })
        return trend
