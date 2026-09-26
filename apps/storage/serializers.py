from decimal import Decimal

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.customers.models import Bike
from apps.customers.serializers import BikeNestedSerializer, CustomerBasicSerializer
from apps.orders.models import RepairOrder

from .models import StorageBooking, StorageEvent


class StorageEventSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.username', read_only=True, default=None)

    class Meta:
        model = StorageEvent
        fields = ('id', 'event_type', 'event_type_display', 'performed_by', 'performed_by_name',
                  'note', 'created_at')
        read_only_fields = fields


class StorageBookingListSerializer(serializers.ModelSerializer):
    """Plaski wiersz na liste - klient i naklejka czytane ze zlecenia."""

    customer = serializers.IntegerField(source='repair_order.customer_id', read_only=True)
    customer_name = serializers.SerializerMethodField()
    bike_label = serializers.CharField(source='bike.__str__', read_only=True)
    category = serializers.CharField(source='bike.category', read_only=True)
    tag = serializers.IntegerField(source='repair_order.bike_tag_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    balance_due = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    is_paid = serializers.BooleanField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = StorageBooking
        fields = (
            'id', 'repair_order', 'tag', 'customer', 'customer_name', 'bike', 'bike_label',
            'category', 'start_date', 'end_date', 'status', 'status_display',
            'price', 'paid_amount', 'balance_due', 'is_paid', 'is_overdue',
            'checked_in_at', 'checked_out_at', 'created_at',
        )

    @extend_schema_field(serializers.CharField())
    def get_customer_name(self, obj):
        return str(obj.repair_order.customer)


class StorageBookingDetailSerializer(StorageBookingListSerializer):
    customer = CustomerBasicSerializer(read_only=True)
    bike = BikeNestedSerializer(read_only=True)
    events = StorageEventSerializer(many=True, read_only=True)

    class Meta(StorageBookingListSerializer.Meta):
        fields = StorageBookingListSerializer.Meta.fields + (
            'paid_at', 'check_in_notes', 'check_out_notes', 'created_by', 'updated_at', 'events',
        )


class StorageBookingWriteSerializer(serializers.ModelSerializer):
    """Zapis rezerwacji. `repair_order` jest obowiazkowe, bo naklejka na sprzecie
    (`bike_tag_number`) i przeglad w cenie wisza wlasnie na zleceniu."""

    repair_order = serializers.PrimaryKeyRelatedField(queryset=RepairOrder.objects.all())
    bike = serializers.PrimaryKeyRelatedField(queryset=Bike.objects.all())

    class Meta:
        model = StorageBooking
        fields = ('repair_order', 'bike', 'start_date', 'end_date', 'price',
                  'check_in_notes', 'check_out_notes', 'status')
        extra_kwargs = {
            # Status zmieniaja wylacznie akcje (check-in/check-out/cancel), zeby kazde
            # przejscie zostawilo slad w StorageEvent.
            'status': {'read_only': True},
            'price': {'required': False},
        }

    def validate(self, attrs):
        instance = self.instance
        repair_order = attrs.get('repair_order') or (instance and instance.repair_order)
        bike = attrs.get('bike') or (instance and instance.bike)
        start_date = attrs.get('start_date') or (instance and instance.start_date)
        end_date = attrs.get('end_date') or (instance and instance.end_date)

        if end_date < start_date:
            raise serializers.ValidationError(
                {'end_date': 'Data konca pobytu nie moze byc wczesniejsza niz data poczatku.'}
            )
        if not repair_order.bikes.filter(pk=bike.pk).exists():
            raise serializers.ValidationError(
                {'bike': 'Ten sprzet nie jest przypiety do wskazanego zlecenia.'}
            )

        probe = StorageBooking(
            pk=instance.pk if instance else None,
            bike=bike, start_date=start_date, end_date=end_date,
        )
        if probe.overlapping().exists():
            raise serializers.ValidationError(
                {'start_date': 'Ten sprzet ma juz przechowanie w zachodzacym terminie.'}
            )
        return attrs

    def to_representation(self, instance):
        return StorageBookingDetailSerializer(instance, context=self.context).data


class CheckInSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)


class CheckOutSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)


class ExtendSerializer(serializers.Serializer):
    end_date = serializers.DateField()
    note = serializers.CharField(required=False, allow_blank=True)


class CancelSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)


class PaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal('0.01'))
    note = serializers.CharField(required=False, allow_blank=True)


class OccupancyPointSerializer(serializers.Serializer):
    date = serializers.DateField()
    count = serializers.IntegerField()


class OccupancySerializer(serializers.Serializer):
    start = serializers.DateField()
    end = serializers.DateField()
    bookings_count = serializers.IntegerField()
    peak_occupancy = serializers.IntegerField()
    peak_date = serializers.DateField(allow_null=True)
    timeline = OccupancyPointSerializer(many=True)


class StorageDashboardSerializer(serializers.Serializer):
    stored_now = serializers.IntegerField()
    due_this_week = serializers.IntegerField()
    overdue = serializers.IntegerField()
    upcoming = serializers.IntegerField()
    unpaid_count = serializers.IntegerField()
    outstanding_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    paid_amount_total = serializers.DecimalField(max_digits=10, decimal_places=2)
