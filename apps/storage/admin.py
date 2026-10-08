from django.contrib import admin

from .models import StorageBooking, StorageEvent


class StorageEventInline(admin.TabularInline):
    model = StorageEvent
    extra = 0
    readonly_fields = ('event_type', 'performed_by', 'note', 'created_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        # Zdarzenia zapisuje wylacznie warstwa serwisowa - inaczej log przestaje byc logiem.
        return False


@admin.register(StorageBooking)
class StorageBookingAdmin(admin.ModelAdmin):
    list_display = ('bike', 'customer_name', 'tag', 'start_date', 'end_date', 'status',
                    'price', 'paid_amount', 'is_overdue')
    list_filter = ('status', 'bike__category', 'start_date')
    search_fields = ('bike__brand', 'bike__model', 'repair_order__customer__last_name',
                     'repair_order__bike_tag_number')
    autocomplete_fields = ('repair_order', 'bike')
    readonly_fields = ('checked_in_at', 'checked_out_at', 'paid_at', 'created_at', 'updated_at')
    inlines = [StorageEventInline]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'bike', 'repair_order', 'repair_order__customer',
        )

    @admin.display(description='Klient', ordering='repair_order__customer__last_name')
    def customer_name(self, obj):
        return str(obj.customer)

    @admin.display(description='Naklejka', ordering='repair_order__bike_tag_number')
    def tag(self, obj):
        return obj.tag

    @admin.display(description='Po terminie', boolean=True)
    def is_overdue(self, obj):
        return obj.is_overdue
