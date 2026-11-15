from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.customers.models import Bike
from apps.inventory.models import Part
from apps.customers.serializers import BikeNestedSerializer, BikeSerializer, CustomerListSerializer

from .models import RepairOrder, RepairOrderItem, StatusHistory
from .services import set_order_equipment


class OrderEquipmentSerializer(BikeNestedSerializer):
    """One piece of equipment on an order: the bike's own fields plus its claim tag."""
    tag_number = serializers.IntegerField(read_only=True)

    class Meta(BikeNestedSerializer.Meta):
        pass


class OrderEquipmentFieldsMixin:
    """Read side of the order's equipment.

    `bikes` lists every piece with its own `tag_number`; `tag_numbers` is just the tags,
    in the same order. `bike` (first piece) and `bike_label` (all names) are the older
    single-equipment fields, kept for existing readers.
    """

    @extend_schema_field(OrderEquipmentSerializer(many=True))
    def get_bikes(self, obj):
        bikes = []
        for row in obj.equipment_list:
            # The bike comes from the row's select_related, so it is this row's own instance.
            row.bike.tag_number = row.tag_number
            bikes.append(row.bike)
        return OrderEquipmentSerializer(bikes, many=True).data

    @extend_schema_field(serializers.ListField(child=serializers.IntegerField()))
    def get_tag_numbers(self, obj):
        return obj.tag_numbers

    @extend_schema_field(serializers.CharField())
    def get_bike_label(self, obj):
        return ', '.join(str(row.bike) for row in obj.equipment_list)


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


class RepairOrderListSerializer(OrderEquipmentFieldsMixin, serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    bike = serializers.SerializerMethodField()
    bike_label = serializers.SerializerMethodField()
    bikes = serializers.SerializerMethodField()
    tag_numbers = serializers.SerializerMethodField()
    cost = serializers.SerializerMethodField()

    class Meta:
        model = RepairOrder
        fields = (
            'id', 'customer', 'customer_name', 'bike', 'bike_label', 'tag_numbers',
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


class RepairOrderDetailSerializer(OrderEquipmentFieldsMixin, serializers.ModelSerializer):
    customer = CustomerListSerializer(read_only=True)
    bike = serializers.SerializerMethodField()
    bike_label = serializers.SerializerMethodField()
    bikes = serializers.SerializerMethodField()
    tag_numbers = serializers.SerializerMethodField()
    items = RepairOrderItemSerializer(many=True, read_only=True)
    items_summary = serializers.SerializerMethodField()
    status_history = StatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = RepairOrder
        fields = (
            'id', 'customer', 'bike', 'bike_label', 'tag_numbers', 'bikes',
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


class EquipmentEntrySerializer(serializers.Serializer):
    """One piece of equipment to put on an order, with the claim tag hung on it."""
    bike = serializers.PrimaryKeyRelatedField(queryset=Bike.objects.all())
    tag_number = serializers.IntegerField(min_value=0, max_value=2147483647)


class EquipmentWriteMixin:
    """`equipment: [{bike, tag_number}]` - the order's full equipment set, each piece
    with its own tag. On update it replaces the set; leave it out to keep it as is."""

    def _validate_equipment(self, attrs, required):
        entries = attrs.get('equipment')
        if (entries is None and required) or (entries is not None and not entries):
            raise serializers.ValidationError(
                {'equipment': 'Zlecenie musi miec przypiety co najmniej jeden sprzet.'}
            )

        if entries is not None:
            bikes = [entry['bike'] for entry in entries]
            if len(bikes) != len({bike.pk for bike in bikes}):
                raise serializers.ValidationError(
                    {'equipment': 'Ten sam sprzet nie moze byc przypiety do zlecenia dwa razy.'}
                )
            tags = [entry['tag_number'] for entry in entries]
            repeated = sorted({tag for tag in tags if tags.count(tag) > 1})
            if repeated:
                raise serializers.ValidationError({'equipment': (
                    'Kazda sztuka na zleceniu musi miec inny numer zawieszki. Powtarza sie: '
                    + ', '.join(f'#{tag}' for tag in repeated) + '.'
                )})

        instance = getattr(self, 'instance', None)
        customer = attrs.get('customer') or (instance.customer if instance else None)
        # A changed customer must own the equipment the order keeps, not only new items.
        if entries is not None:
            checked = [entry['bike'] for entry in entries]
        else:
            checked = [row.bike for row in instance.equipment_list] if instance else []
        foreign = [bike for bike in checked if customer and bike.customer_id != customer.pk]
        if foreign:
            raise serializers.ValidationError({'equipment': (
                'Sprzet nie nalezy do klienta zlecenia: '
                + ', '.join(str(bike) for bike in foreign) + '.'
            )})

        if instance and entries is not None:
            self._validate_removed_bikes(instance, {entry['bike'].pk for entry in entries})
        return attrs

    def _validate_removed_bikes(self, instance, kept):
        """Equipment with a storage booking on this order cannot be detached from it.

        StorageBooking requires its bike to be one of the order's items (its tag comes
        from there), so dropping it would leave the booking pointing outside the order.
        """
        booked = [
            booking.bike for booking in instance.storage_bookings.select_related('bike')
            if booking.bike_id not in kept
        ]
        if booked:
            names = ', '.join(sorted({str(bike) for bike in booked}))
            raise serializers.ValidationError({'equipment': (
                f'Nie mozna odpiac sprzetu z rezerwacja w przechowalni: {names}. '
                'Najpierw obsluz rezerwacje w przechowalni.'
            )})


class RepairOrderCreateSerializer(EquipmentWriteMixin, serializers.ModelSerializer):
    equipment = EquipmentEntrySerializer(many=True, write_only=True)

    class Meta:
        model = RepairOrder
        fields = (
            'customer', 'equipment', 'priority', 'description', 'estimated_cost', 'estimated_pickup_date',
        )
        # The model allows null only for orders created before the field existed.
        extra_kwargs = {'estimated_pickup_date': {'required': True, 'allow_null': False}}

    def validate_estimated_pickup_date(self, value):
        # Only checked on create: an existing order may legitimately keep a date that has passed.
        if value < timezone.localdate():
            raise serializers.ValidationError('Planowana data odbioru nie moze byc w przeszlosci.')
        return value

    def validate(self, attrs):
        return self._validate_equipment(attrs, required=True)

    @transaction.atomic
    def create(self, validated_data):
        entries = validated_data.pop('equipment')
        order = super().create(validated_data)
        set_order_equipment(order, entries)
        return order


class RepairOrderWriteSerializer(EquipmentWriteMixin, serializers.ModelSerializer):
    equipment = EquipmentEntrySerializer(many=True, write_only=True, required=False)

    class Meta:
        model = RepairOrder
        fields = (
            'id', 'customer', 'equipment', 'status', 'priority',
            'description', 'estimated_cost', 'final_cost', 'accepted_at', 'estimated_pickup_date',
            'delivered_at', 'created_at', 'updated_at',
        )
        # final_cost to suma pozycji (services.recalculate_final_cost) - nie wpisuje się jej ręcznie.
        read_only_fields = ('final_cost', 'created_at', 'updated_at')

    def validate(self, attrs):
        return self._validate_equipment(attrs, required=False)

    @transaction.atomic
    def update(self, instance, validated_data):
        entries = validated_data.pop('equipment', None)
        order = super().update(instance, validated_data)
        if entries is not None:
            set_order_equipment(order, entries)
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
