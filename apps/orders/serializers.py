from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.customers.models import Bike
from apps.customers.serializers import BikeNestedSerializer, BikeSerializer, CustomerListSerializer

from .models import RepairOrder, RepairOrderItem, StatusHistory


class LegacyBikeFieldsMixin:
    """Keeps the pre-multi-equipment API fields alive.

    `bike` and `bike_label` used to come from a single ForeignKey. An order can now hold
    several pieces of equipment, so they are derived from `bikes`: `bike` is the first
    item, `bike_label` lists them all. New clients should read `bikes` instead.
    (`bike_tag_number` is untouched - one claim tag still covers the whole order.)
    """

    @extend_schema_field(serializers.CharField())
    def get_bike_label(self, obj):
        return ', '.join(str(bike) for bike in obj.bikes.all())


class RepairOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairOrderItem
        fields = '__all__'


class StatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusHistory
        fields = '__all__'
        read_only_fields = ('changed_at',)


class RepairOrderListSerializer(LegacyBikeFieldsMixin, serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    bike = serializers.SerializerMethodField()
    bike_label = serializers.SerializerMethodField()
    bikes = BikeNestedSerializer(many=True, read_only=True)
    cost = serializers.SerializerMethodField()

    class Meta:
        model = RepairOrder
        fields = (
            'id', 'customer', 'customer_name', 'bike', 'bike_label', 'bike_tag_number',
            'bikes', 'status', 'priority', 'estimated_cost', 'final_cost', 'cost', 'created_at',
        )

    def get_customer_name(self, obj):
        return str(obj.customer)

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_bike(self, obj):
        bike = obj.primary_bike
        return bike.pk if bike else None

    @extend_schema_field(serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True))
    def get_cost(self, obj):
        """The order's effective cost: `final_cost` once it's known, otherwise `estimated_cost`."""
        return obj.final_cost if obj.final_cost is not None else obj.estimated_cost


class RepairOrderDetailSerializer(LegacyBikeFieldsMixin, serializers.ModelSerializer):
    customer = CustomerListSerializer(read_only=True)
    bike = serializers.SerializerMethodField()
    bike_label = serializers.SerializerMethodField()
    bikes = BikeNestedSerializer(many=True, read_only=True)
    items = RepairOrderItemSerializer(many=True, read_only=True)
    status_history = StatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = RepairOrder
        fields = (
            'id', 'customer', 'bike', 'bike_label', 'bike_tag_number', 'bikes',
            'status', 'priority', 'description', 'estimated_cost', 'final_cost',
            'accepted_at', 'delivered_at', 'created_at', 'updated_at',
            'items', 'status_history',
        )
        read_only_fields = ('created_at', 'updated_at')

    @extend_schema_field(BikeSerializer(allow_null=True))
    def get_bike(self, obj):
        bike = obj.primary_bike
        return BikeSerializer(bike).data if bike else None


class BikesWriteMixin:
    """Accepts equipment either as `bikes` (a list of IDs) or as the legacy single `bike`."""

    def _pop_bikes(self, validated_data):
        """Returns the equipment to attach, or None when the payload does not mention it."""
        bikes = validated_data.pop('bikes', None)
        legacy_bike = validated_data.pop('bike', None)
        if bikes is None and legacy_bike is None:
            return None
        return bikes if bikes is not None else [legacy_bike]

    def _validate_bikes(self, attrs):
        bikes = attrs.get('bikes')
        if bikes is not None and len(bikes) != len({bike.pk for bike in bikes}):
            raise serializers.ValidationError(
                {'bikes': 'Ten sam sprzet nie moze byc przypiety do zlecenia dwa razy.'}
            )
        return attrs


class RepairOrderCreateSerializer(BikesWriteMixin, serializers.ModelSerializer):
    bikes = serializers.PrimaryKeyRelatedField(
        queryset=Bike.objects.all(), many=True, required=False, write_only=True,
    )
    # Legacy single-equipment input, kept so existing clients keep working.
    bike = serializers.PrimaryKeyRelatedField(
        queryset=Bike.objects.all(), required=False, write_only=True,
    )

    class Meta:
        model = RepairOrder
        fields = ('customer', 'bike', 'bikes', 'bike_tag_number', 'description', 'estimated_cost')

    def validate(self, attrs):
        if not attrs.get('bikes') and not attrs.get('bike'):
            raise serializers.ValidationError(
                {'bikes': 'Zlecenie musi miec przypiety co najmniej jeden sprzet.'}
            )
        return self._validate_bikes(attrs)

    @transaction.atomic
    def create(self, validated_data):
        bikes = self._pop_bikes(validated_data)
        order = super().create(validated_data)
        order.bikes.set(bikes)
        return order


class RepairOrderWriteSerializer(BikesWriteMixin, serializers.ModelSerializer):
    bikes = serializers.PrimaryKeyRelatedField(
        queryset=Bike.objects.all(), many=True, required=False, write_only=True,
    )
    bike = serializers.PrimaryKeyRelatedField(
        queryset=Bike.objects.all(), required=False, write_only=True,
    )

    class Meta:
        model = RepairOrder
        fields = (
            'id', 'customer', 'bike', 'bikes', 'bike_tag_number', 'status', 'priority',
            'description', 'estimated_cost', 'final_cost', 'accepted_at', 'delivered_at',
            'created_at', 'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')

    def validate(self, attrs):
        if 'bikes' in attrs and not attrs['bikes']:
            raise serializers.ValidationError(
                {'bikes': 'Zlecenie musi miec przypiety co najmniej jeden sprzet.'}
            )
        return self._validate_bikes(attrs)

    @transaction.atomic
    def update(self, instance, validated_data):
        bikes = self._pop_bikes(validated_data)
        order = super().update(instance, validated_data)
        if bikes is not None:
            order.bikes.set(bikes)
        return order

    def to_representation(self, instance):
        return RepairOrderDetailSerializer(instance, context=self.context).data


class ChangeOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=RepairOrder.STATUS_CHOICES)
    note = serializers.CharField(required=False, allow_blank=True)


class WeeklyTrendPointSerializer(serializers.Serializer):
    week_start = serializers.DateField()
    orders_completed = serializers.IntegerField()
    profit = serializers.DecimalField(max_digits=10, decimal_places=2)


class DashboardSerializer(serializers.Serializer):
    bikes_count = serializers.IntegerField()
    winter_items_count = serializers.IntegerField()
    customers_count = serializers.IntegerField()
    orders_completed_this_week = serializers.IntegerField()
    profit_this_week = serializers.DecimalField(max_digits=10, decimal_places=2)
    weekly_trend = WeeklyTrendPointSerializer(many=True)
