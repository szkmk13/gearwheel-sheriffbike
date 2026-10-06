from django.contrib import admin
from .models import RepairOrder, RepairOrderItem, StatusHistory


class RepairOrderItemInline(admin.TabularInline):
    model = RepairOrderItem
    extra = 0


class StatusHistoryInline(admin.TabularInline):
    """History is written by the status-change endpoint; here only the note can be corrected."""

    model = StatusHistory
    extra = 0
    fields = ('old_status', 'new_status', 'changed_by', 'changed_at', 'note')
    readonly_fields = ('old_status', 'new_status', 'changed_by', 'changed_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        # A row added by hand would have no status change behind it.
        return False


@admin.register(RepairOrder)
class RepairOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'equipment', 'status', 'priority', 'created_at', 'estimated_pickup_date')
    list_filter = ('status', 'priority')
    search_fields = ('customer__first_name', 'customer__last_name', 'description')
    filter_horizontal = ('bikes',)
    inlines = [RepairOrderItemInline, StatusHistoryInline]

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('bikes')

    @admin.display(description='Sprzet')
    def equipment(self, obj):
        return ', '.join(str(bike) for bike in obj.bikes.all()) or '-'
