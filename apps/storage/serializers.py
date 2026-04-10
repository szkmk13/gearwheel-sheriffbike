from rest_framework import serializers
from .models import StorageLocation, StorageRecord, StorageEvent


class StorageLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorageLocation
        fields = '__all__'


class StorageEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorageEvent
        fields = '__all__'
        read_only_fields = ('created_at',)


class StorageRecordListSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorageRecord
        fields = ('id', 'customer', 'bike', 'location', 'status', 'checked_in_at', 'expected_pickup')


class StorageRecordDetailSerializer(serializers.ModelSerializer):
    events = StorageEventSerializer(many=True, read_only=True)

    class Meta:
        model = StorageRecord
        fields = '__all__'
        read_only_fields = ('checked_in_at', 'checked_out_at', 'status')
