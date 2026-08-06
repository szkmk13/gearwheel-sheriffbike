from datetime import timedelta
from decimal import Decimal

from django.db.models import Case, Count, IntegerField, Sum, When
from django.db.models.functions import Coalesce, TruncWeek
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.customers.models import Bike, Customer

from .models import RepairOrder, RepairOrderItem, StatusHistory
from .serializers import (
    ChangeOrderStatusSerializer,
    DashboardSerializer,
    RepairOrderListSerializer,
    RepairOrderCreateSerializer,
    RepairOrderDetailSerializer,
    RepairOrderWriteSerializer,
    RepairOrderItemSerializer,
    StatusHistorySerializer,
)


STATUS_ORDER = ['done', 'in_progress', 'diagnosing', 'waiting_parts', 'accepted', 'delivered', 'cancelled']


@extend_schema_view(
    list=extend_schema(
        summary=_('List repair orders'),
        description=_(
            'Returns repair orders sorted by status (order: done, in_progress, diagnosing, '
            'waiting_parts, accepted, delivered, cancelled), and within each status - newest first. '
            'Supports filtering (`status`, `priority`, `customer`, `bike`), searching '
            '(`search` over the description and customer data), and ordering (`ordering`).'
        ),
        parameters=[
            OpenApiParameter(
                'status', str, OpenApiParameter.QUERY, enum=[c[0] for c in RepairOrder.STATUS_CHOICES],
                description=_('Filter by exact order status.'),
            ),
            OpenApiParameter(
                'priority', str, OpenApiParameter.QUERY, enum=[c[0] for c in RepairOrder.PRIORITY_CHOICES],
                description=_('Filter by exact order priority.'),
            ),
            OpenApiParameter(
                'customer', int, OpenApiParameter.QUERY,
                description=_('Filter by customer ID.'),
            ),
            OpenApiParameter(
                'bike', int, OpenApiParameter.QUERY,
                description=_('Filter by bike ID.'),
            ),
            OpenApiParameter(
                'search', str, OpenApiParameter.QUERY,
                description=_(
                    'Free-text search over `description` and the customer\'s first/last name.'
                ),
            ),
            OpenApiParameter(
                'ordering', str, OpenApiParameter.QUERY,
                enum=['created_at', '-created_at', 'updated_at', '-updated_at', 'priority', '-priority'],
                description=_(
                    'Order results by the given field; prefix with `-` for descending order. '
                    'Overrides the default status-based ordering.'
                ),
            ),
        ],
    ),
    create=extend_schema(
        summary=_('Create a repair order'),
        description=_(
            'Opens a new repair order for the given customer and bike. Only `customer`, `bike`, '
            '`description`, and `estimated_cost` are accepted. `status` and `priority` are not '
            'inputs here - new orders always start as `accepted` / `normal` priority (change them '
            'afterwards via the status endpoint or a regular update). `accepted_at`, `delivered_at`, '
            'and `final_cost` do not apply to creation and are also not accepted.'
        ),
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
    queryset = RepairOrder.objects.select_related('customer', 'bike').annotate(
        status_order=Case(
            *[When(status=status_value, then=position) for position, status_value in enumerate(STATUS_ORDER)],
            output_field=IntegerField(),
        )
    ).order_by('status_order', '-created_at')
    filterset_fields = ['status', 'priority', 'customer', 'bike']
    search_fields = ['description', 'customer__first_name', 'customer__last_name']
    ordering_fields = ['created_at', 'updated_at', 'priority']

    def get_serializer_class(self):
        if self.action == 'list':
            return RepairOrderListSerializer
        if self.action == 'create':
            return RepairOrderCreateSerializer
        if self.action in ('update', 'partial_update'):
            return RepairOrderWriteSerializer
        return RepairOrderDetailSerializer

    @extend_schema(
        summary=_('Change a repair order status'),
        description=_(
            'Changes the order status and appends an entry to its status history (`old_status`, '
            '`new_status`, `changed_by`, optional `note`). Transitioning to `accepted` sets '
            '`accepted_at`, and to `delivered` sets `delivered_at` (unless already set). '
            'The request is rejected if the given status is invalid or identical to the current one.'
        ),
        request=ChangeOrderStatusSerializer,
        responses={
            200: RepairOrderDetailSerializer,
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

        StatusHistory.objects.create(
            repair_order=order,
            old_status=order.status,
            new_status=new_status,
            changed_by=request.user,
            note=note,
        )
        order.status = new_status
        if new_status == 'accepted' and not order.accepted_at:
            order.accepted_at = timezone.now()
        if new_status == 'delivered' and not order.delivered_at:
            order.delivered_at = timezone.now()
        order.save()
        return Response(RepairOrderDetailSerializer(order).data)

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
        summary=_('Repair order items (parts/labor)'),
        description=_(
            'GET - returns the list of items (parts and labor) attached to the order. '
            'POST - adds a new item; `repair_order` is set automatically from the order in the URL.'
        ),
        request=RepairOrderItemSerializer,
        responses={
            200: RepairOrderItemSerializer(many=True),
            201: RepairOrderItemSerializer,
        },
    )
    @action(detail=True, methods=['get', 'post'], url_path='items')
    def items(self, request, pk=None):
        order = self.get_object()
        if request.method == 'GET':
            return Response(RepairOrderItemSerializer(order.items.all(), many=True).data)
        serializer = RepairOrderItemSerializer(data={**request.data, 'repair_order': order.pk})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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
            'bikes_count': Bike.objects.count(),
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
