from rest_framework import serializers

from apps.customers.serializers import BikeSerializer, CustomerListSerializer

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
        fields = (
            'id', 'customer', 'customer_name', 'bike', 'bike_label', 'bike_tag_number',
            'status', 'priority', 'created_at',
        )

    def get_customer_name(self, obj):
        return str(obj.customer)

    def get_bike_label(self, obj):
        return str(obj.bike)


class RepairOrderDetailSerializer(serializers.ModelSerializer):
    customer = CustomerListSerializer(read_only=True)
    bike = BikeSerializer(read_only=True)
    items = RepairOrderItemSerializer(many=True, read_only=True)
    status_history = StatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = RepairOrder
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class RepairOrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairOrder
        fields = ('customer', 'bike', 'bike_tag_number', 'description', 'estimated_cost')


class RepairOrderWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairOrder
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class ChangeOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=RepairOrder.STATUS_CHOICES)
    note = serializers.CharField(required=False, allow_blank=True)


class WeeklyTrendPointSerializer(serializers.Serializer):
    week_start = serializers.DateField()
    orders_completed = serializers.IntegerField()
    profit = serializers.DecimalField(max_digits=10, decimal_places=2)


class DashboardSerializer(serializers.Serializer):
    bikes_count = serializers.IntegerField()
    customers_count = serializers.IntegerField()
    orders_completed_this_week = serializers.IntegerField()
    profit_this_week = serializers.DecimalField(max_digits=10, decimal_places=2)
    weekly_trend = WeeklyTrendPointSerializer(many=True)
