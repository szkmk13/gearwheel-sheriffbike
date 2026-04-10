from django.contrib import admin
from .models import Category, Supplier, Part, Invoice, StockMovement


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent')
    search_fields = ('name',)


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone')
    search_fields = ('name', 'email')


@admin.register(Part)
class PartAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'stock_quantity', 'low_stock_threshold', 'sell_price', 'category', 'supplier')
    list_filter = ('category', 'supplier')
    search_fields = ('name', 'sku', 'barcode')


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'supplier', 'invoice_date', 'total_amount', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('invoice_number',)
    readonly_fields = ('raw_ocr_text', 'parsed_data', 'status')


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('part', 'movement_type', 'quantity', 'unit_cost', 'created_at')
    list_filter = ('movement_type',)
    readonly_fields = ('created_at',)
