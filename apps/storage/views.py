from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import StorageLocation, StorageRecord, StorageEvent
from .serializers import (
    StorageLocationSerializer,
    StorageRecordListSerializer,
    StorageRecordDetailSerializer,
    StorageEventSerializer,
)


class StorageLocationViewSet(ModelViewSet):
    queryset = StorageLocation.objects.all()
    serializer_class = StorageLocationSerializer
    filterset_fields = ['is_occupied']
    search_fields = ['code', 'description']


class StorageRecordViewSet(ModelViewSet):
    queryset = StorageRecord.objects.select_related('bike', 'customer', 'location').all()
    filterset_fields = ['status', 'customer', 'location']
    search_fields = ['bike__brand', 'bike__model', 'customer__last_name']
    ordering_fields = ['checked_in_at', 'expected_pickup']

    def get_serializer_class(self):
        if self.action == 'list':
            return StorageRecordListSerializer
        return StorageRecordDetailSerializer

    def perform_create(self, serializer):
        record = serializer.save(status='checked_in')
        if record.location:
            StorageLocation.objects.filter(pk=record.location_id).update(is_occupied=True)
        StorageEvent.objects.create(
            storage_record=record,
            event_type='check_in',
            to_location=record.location,
            performed_by=self.request.user,
        )

    @action(detail=True, methods=['post'], url_path='check-out')
    def check_out(self, request, pk=None):
        record = self.get_object()
        if record.status == 'checked_out':
            return Response({'detail': 'Already checked out.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            old_location = record.location
            record.status = 'checked_out'
            record.checked_out_at = timezone.now()
            record.check_out_notes = request.data.get('notes', '')
            record.save()

            if old_location:
                StorageLocation.objects.filter(pk=old_location.pk).update(is_occupied=False)

            StorageEvent.objects.create(
                storage_record=record,
                event_type='check_out',
                from_location=old_location,
                performed_by=request.user,
                note=record.check_out_notes,
            )
        return Response(StorageRecordDetailSerializer(record).data)

    @action(detail=True, methods=['post'], url_path='move')
    def move(self, request, pk=None):
        record = self.get_object()
        new_location_id = request.data.get('location')
        if not new_location_id:
            return Response({'detail': 'location field required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            old_location = record.location
            new_location = StorageLocation.objects.get(pk=new_location_id)

            if old_location:
                StorageLocation.objects.filter(pk=old_location.pk).update(is_occupied=False)
            StorageLocation.objects.filter(pk=new_location.pk).update(is_occupied=True)

            record.location = new_location
            record.save(update_fields=['location'])

            StorageEvent.objects.create(
                storage_record=record,
                event_type='location_change',
                from_location=old_location,
                to_location=new_location,
                performed_by=request.user,
                note=request.data.get('note', ''),
            )
        return Response(StorageRecordDetailSerializer(record).data)

    @action(detail=True, methods=['get'], url_path='events')
    def events(self, request, pk=None):
        record = self.get_object()
        return Response(StorageEventSerializer(record.events.all(), many=True).data)
