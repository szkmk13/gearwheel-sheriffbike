from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from .models import Customer, Bike


class CustomerBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ('id', 'first_name', 'last_name', 'phone', 'email', 'created_at')


class BikeNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bike
        exclude = ('customer',)
        read_only_fields = ('created_at',)


class BikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bike
        fields = '__all__'
        read_only_fields = ('created_at',)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['customer'] = CustomerBasicSerializer(instance.customer).data
        return representation


class BikeReadSerializer(serializers.ModelSerializer):
    """Response shape for BikeSerializer, whose `to_representation` nests `customer`."""
    customer = CustomerBasicSerializer(read_only=True)

    class Meta:
        model = Bike
        fields = '__all__'
        read_only_fields = ('created_at',)


class RepairOrderHistorySerializer(serializers.Serializer):
    """Schema-only mirror of orders.RepairOrderListSerializer's fields, to avoid a
    customers <-> orders circular import at module load time."""
    id = serializers.IntegerField()
    customer = serializers.IntegerField()
    customer_name = serializers.CharField()
    bike = serializers.IntegerField()
    bike_label = serializers.CharField()
    bike_tag_number = serializers.IntegerField()
    status = serializers.CharField()
    priority = serializers.CharField()
    created_at = serializers.DateTimeField()


class CustomerListSerializer(serializers.ModelSerializer):
    bikes = BikeNestedSerializer(many=True, read_only=True)
    repair_orders_count = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ('id', 'first_name', 'last_name', 'phone', 'email', 'created_at', 'bikes', 'repair_orders_count')

    @extend_schema_field(serializers.IntegerField())
    def get_repair_orders_count(self, obj):
        return len(obj.repair_orders.all())


class CustomerDetailSerializer(serializers.ModelSerializer):
    bikes = BikeNestedSerializer(many=True, read_only=True)
    repair_orders = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('created_at',)

    @extend_schema_field(RepairOrderHistorySerializer(many=True))
    def get_repair_orders(self, obj):
        from apps.orders.serializers import RepairOrderListSerializer

        return RepairOrderListSerializer(obj.repair_orders.all(), many=True).data
