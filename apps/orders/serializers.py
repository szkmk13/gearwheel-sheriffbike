from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.customers.models import Bike
from apps.inventory.models import Part
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
    item_type_display = serializers.CharField(source='get_item_type_display', read_only=True)
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    part_sku = serializers.CharField(source='part.sku', read_only=True, allow_null=True, default=None)

    class Meta:
        model = RepairOrderItem
        fields = (
            'id', 'repair_order', 'part', 'part_sku', 'item_type', 'item_type_display', 'description',
            'quantity', 'unit_price', 'line_total', 'created_at',
        )
        read_only_fields = fields


class RepairOrderItemCreateSerializer(serializers.Serializer):
    """Pozycja z katalogu (`part`) albo jednorazowa (opis, rodzaj i cena wymagane)."""
    part = serializers.PrimaryKeyRelatedField(queryset=Part.objects.all(), required=False, allow_null=True)
    item_type = serializers.ChoiceField(choices=RepairOrderItem.ITEM_TYPE_CHOICES, required=False)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    quantity = serializers.DecimalField(
        max_digits=8, decimal_places=2, min_value=Decimal('0.01'), required=False, default=Decimal('1'),
    )
    unit_price = serializers.DecimalField(
        max_digits=8, decimal_places=2, min_value=Decimal('0'), required=False, allow_null=True,
    )
    save_to_catalog = serializers.BooleanField(
        required=False, default=False,
        help_text='Only for a one-off item: also add it to the catalogue (or link the active entry of that name).',
    )


class RepairOrderItemUpdateSerializer(serializers.Serializer):
    item_type = serializers.ChoiceField(choices=RepairOrderItem.ITEM_TYPE_CHOICES, required=False)
    description = serializers.CharField(max_length=255, required=False)
    quantity = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal('0.01'), required=False)
    unit_price = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal('0'), required=False)


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
            'estimated_pickup_date',
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
    items_summary = serializers.SerializerMethodField()
    status_history = StatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = RepairOrder
        fields = (
            'id', 'customer', 'bike', 'bike_label', 'bike_tag_number', 'bikes',
            'status', 'priority', 'description', 'estimated_cost', 'final_cost',
            'accepted_at', 'estimated_pickup_date', 'delivered_at', 'created_at', 'updated_at',
            'items', 'items_summary', 'status_history',
        )
        read_only_fields = ('created_at', 'updated_at')

    @extend_schema_field({
        'type': 'object',
        'properties': {kind: {'type': 'string', 'format': 'decimal'} for kind, _ in RepairOrderItem.ITEM_TYPE_CHOICES},
    })
    def get_items_summary(self, obj):
        """Suma wartości pozycji w podziale na rodzaj (usługi / części / akcesoria)."""
        totals = {kind: Decimal('0.00') for kind, _ in RepairOrderItem.ITEM_TYPE_CHOICES}
        for item in obj.items.all():
            totals[item.item_type] = totals.get(item.item_type, Decimal('0.00')) + item.line_total
        return {kind: str(total) for kind, total in totals.items()}

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
        if bikes is None and attrs.get('bike') is not None:
            bikes = [attrs['bike']]
        if bikes is not None and len(bikes) != len({bike.pk for bike in bikes}):
            raise serializers.ValidationError(
                {'bikes': 'Ten sam sprzet nie moze byc przypiety do zlecenia dwa razy.'}
            )

        instance = getattr(self, 'instance', None)
        customer = attrs.get('customer') or (instance.customer if instance else None)
        # A changed customer must own the equipment the order keeps, not only new items.
        checked = bikes if bikes is not None else (list(instance.bikes.all()) if instance else [])
        foreign = [bike for bike in checked if customer and bike.customer_id != customer.pk]
        if foreign:
            raise serializers.ValidationError({'bikes': (
                'Sprzet nie nalezy do klienta zlecenia: '
                + ', '.join(str(bike) for bike in foreign) + '.'
            )})

        if instance and bikes is not None:
            self._validate_removed_bikes(instance, bikes)
        return attrs

    def _validate_removed_bikes(self, instance, bikes):
        """Equipment with a storage booking on this order cannot be detached from it.

        StorageBooking requires its bike to be one of the order's items, so dropping it
        would leave the booking pointing outside the order (and its tag number).
        """
        kept = {bike.pk for bike in bikes}
        booked = [
            booking.bike for booking in instance.storage_bookings.select_related('bike')
            if booking.bike_id not in kept
        ]
        if booked:
            names = ', '.join(sorted({str(bike) for bike in booked}))
            raise serializers.ValidationError({'bikes': (
                f'Nie mozna odpiac sprzetu z rezerwacja w przechowalni: {names}. '
                'Najpierw obsluz rezerwacje w przechowalni.'
            )})


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
        fields = (
            'customer', 'bike', 'bikes', 'bike_tag_number', 'priority', 'description', 'estimated_cost',
            'estimated_pickup_date',
        )
        # The model allows null only for orders created before the field existed.
        extra_kwargs = {'estimated_pickup_date': {'required': True, 'allow_null': False}}

    def validate_estimated_pickup_date(self, value):
        # Only checked on create: an existing order may legitimately keep a date that has passed.
        if value < timezone.localdate():
            raise serializers.ValidationError('Planowana data odbioru nie moze byc w przeszlosci.')
        return value

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
            'description', 'estimated_cost', 'final_cost', 'accepted_at', 'estimated_pickup_date',
            'delivered_at', 'created_at', 'updated_at',
        )
        # final_cost to suma pozycji (services.recalculate_final_cost) - nie wpisuje się jej ręcznie.
        read_only_fields = ('final_cost', 'created_at', 'updated_at')

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


class SmsResultSerializer(serializers.Serializer):
    """Mirrors the dict returned by `sms.send_sms`."""
    sent = serializers.BooleanField()
    mocked = serializers.BooleanField(help_text='True while the SMS gateway is a mock (nothing is delivered).')
    to = serializers.CharField()
    message = serializers.CharField()
    error = serializers.CharField(allow_null=True)


class SmsPreviewSerializer(serializers.Serializer):
    to = serializers.CharField()
    message = serializers.CharField(help_text='Suggested text - staff may edit it before sending.')


class ChangeOrderStatusResponseSerializer(RepairOrderDetailSerializer):
    """Schema only: the full order plus the SMS to review after this change (null if none)."""
    sms_preview = SmsPreviewSerializer(allow_null=True, read_only=True)

    class Meta(RepairOrderDetailSerializer.Meta):
        fields = RepairOrderDetailSerializer.Meta.fields + ('sms_preview',)


class SendSmsSerializer(serializers.Serializer):
    # 10 parts of a Polish-character (UCS-2) SMS - a sanity cap, not the billing limit.
    message = serializers.CharField(max_length=670, trim_whitespace=True)


class CalendarRangeSerializer(serializers.Serializer):
    # A month view shows 6 full weeks, so 42 days is the most the calendar ever asks for.
    MAX_DAYS = 42

    start = serializers.DateField()
    end = serializers.DateField()

    def validate(self, attrs):
        days = (attrs['end'] - attrs['start']).days + 1
        if days < 1:
            raise serializers.ValidationError({'end': 'Koniec zakresu nie moze byc przed poczatkiem.'})
        if days > self.MAX_DAYS:
            raise serializers.ValidationError({'end': f'Zakres moze obejmowac najwyzej {self.MAX_DAYS} dni.'})
        return attrs


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
