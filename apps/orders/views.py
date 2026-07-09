from datetime import timedelta
from decimal import Decimal

from django.db.models import Case, Count, IntegerField, Sum, When
from django.db.models.functions import Coalesce, TruncWeek
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.customers.models import Bike, Customer

from .models import RepairOrder, RepairOrderItem, StatusHistory
from .serializers import (
    RepairOrderListSerializer,
    RepairOrderDetailSerializer,
    RepairOrderWriteSerializer,
    RepairOrderItemSerializer,
    StatusHistorySerializer,
)


STATUS_ORDER = ['done', 'in_progress', 'diagnosing', 'waiting_parts', 'accepted', 'delivered', 'cancelled']


class RepairOrderViewSet(ModelViewSet):
    queryset = RepairOrder.objects.select_related('customer', 'bike').annotate(
        status_order=Case(
            *[When(status=status_value, then=position) for position, status_value in enumerate(STATUS_ORDER)],
            output_field=IntegerField(),
        )
    ).order_by('status_order', '-created_at')
    filterset_fields = ['status', 'priority', 'customer', 'bike']
    search_fields = ['description', 'mechanic_notes', 'customer__first_name', 'customer__last_name']
    ordering_fields = ['created_at', 'updated_at', 'priority']

    def get_serializer_class(self):
        if self.action == 'list':
            return RepairOrderListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return RepairOrderWriteSerializer
        return RepairOrderDetailSerializer

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

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        order = self.get_object()
        qs = order.status_history.all()
        return Response(StatusHistorySerializer(qs, many=True).data)

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
