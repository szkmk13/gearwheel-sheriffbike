from rest_framework import serializers
from .models import RepairOrder, RepairOrderItem, StatusHistory


class RepairOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairOrderItem
        fields = '__all__'


class StatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusHistory
        fields = '__all__'
        read_only_fields = ('changed_at',)


class RepairOrderListSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    bike_label = serializers.SerializerMethodField()

    class Meta:
        model = RepairOrder
        fields = ('id', 'customer', 'customer_name', 'bike', 'bike_label', 'status', 'priority', 'created_at')

    def get_customer_name(self, obj):
        return str(obj.customer)

    def get_bike_label(self, obj):
        return str(obj.bike)


class RepairOrderDetailSerializer(serializers.ModelSerializer):
    items = RepairOrderItemSerializer(many=True, read_only=True)
    status_history = StatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = RepairOrder
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class RepairOrderWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairOrder
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
