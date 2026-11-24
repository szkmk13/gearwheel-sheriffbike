from rest_framework import serializers

from .catalog import PROTECTED_SKUS
from .models import Category, Supplier, Part, Invoice, StockMovement


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'


class PartUsageMixin(serializers.Serializer):
    """`is_used` - pozycja trafila kiedys na zlecenie, wiec nie da sie jej usunac (tylko ukryc).

    Lista ma to z adnotacji w querysecie; po zapisie (create/update) instancja jej nie ma,
    wtedy liczymy wprost."""
    is_used = serializers.SerializerMethodField()
    # Pozycja systemowa (np. przechowanie zimowe) - nie do usuniecia, nawet nieuzyta.
    is_protected = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)

    def get_is_used(self, part):
        used = getattr(part, 'is_used', None)
        if used is None:
            used = part.pk is not None and part.repairorderitem_set.exists()
        return used

    def get_is_protected(self, part):
        return part.sku in PROTECTED_SKUS


class PartListSerializer(PartUsageMixin, serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)

    class Meta:
        model = Part
        fields = ('id', 'name', 'kind', 'kind_display', 'is_active', 'sku', 'barcode', 'unit', 'stock_quantity',
                  'low_stock_threshold', 'sell_price', 'category', 'category_name', 'supplier', 'is_used', 'is_protected')


class PartDetailSerializer(PartUsageMixin, serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)

    class Meta:
        model = Part
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class StockMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockMovement
        fields = '__all__'
        read_only_fields = ('created_at',)


class InvoiceListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ('id', 'supplier', 'invoice_number', 'invoice_date', 'total_amount', 'status', 'created_at')


class InvoiceDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ('status', 'raw_ocr_text', 'parsed_data', 'uploaded_by', 'created_at', 'updated_at')
