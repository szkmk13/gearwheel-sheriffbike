from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import RepairOrder, RepairOrderItem, StatusHistory
from .serializers import (
    RepairOrderListSerializer,
    RepairOrderDetailSerializer,
    RepairOrderWriteSerializer,
    RepairOrderItemSerializer,
    StatusHistorySerializer,
)


class RepairOrderViewSet(ModelViewSet):
    queryset = RepairOrder.objects.select_related('customer', 'bike').all()
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
