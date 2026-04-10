from rest_framework import serializers
from .models import Category, Supplier, Part, Invoice, StockMovement


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'


class PartListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Part
        fields = ('id', 'name', 'sku', 'unit', 'stock_quantity', 'low_stock_threshold', 'sell_price', 'category', 'supplier')


class PartDetailSerializer(serializers.ModelSerializer):
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
