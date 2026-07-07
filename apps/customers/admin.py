from django.contrib import admin
from django.utils.html import format_html

from .models import Customer, Bike
from .utils import generate_qr_base64


class BikeInline(admin.TabularInline):
    model = Bike
    extra = 0


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('last_name', 'first_name', 'phone', 'email', 'created_at')
    search_fields = ('first_name', 'last_name', 'phone', 'email')
    inlines = [BikeInline]


@admin.register(Bike)
class BikeAdmin(admin.ModelAdmin):
    list_display = ('brand_model', 'customer', 'sheriff_code', 'customer_phone', 'qr_code')
    list_filter = ('bike_type',)
    search_fields = ('brand', 'model', 'serial_no', 'uuid')
    readonly_fields = ('uuid', 'sheriff_code', 'photo_thumbnail', 'qr_code')

    @admin.display(description='Rower')
    def brand_model(self, obj):
        return f'{obj.brand} {obj.model}'

    @admin.display(description='Telefon')
    def customer_phone(self, obj):
        return obj.customer.phone

    @admin.display(description='Photo')
    def photo_thumbnail(self, obj):
        if not obj.photo:
            return '-'
        return format_html('<img src="{}" style="height: 300px;" />', obj.photo.url)

    @admin.display(description='QR')
    def qr_code(self, obj):
        if not obj.pk:
            return '-'
        encoded = generate_qr_base64(obj.sheriff_code)
        return format_html('<img src="data:image/png;base64,{}" style="height: 300px;" />', encoded)
