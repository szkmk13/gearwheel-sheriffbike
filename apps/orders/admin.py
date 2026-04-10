from django.contrib import admin
from .models import RepairOrder, RepairOrderItem, StatusHistory


class RepairOrderItemInline(admin.TabularInline):
    model = RepairOrderItem
    extra = 0


class StatusHistoryInline(admin.TabularInline):
    model = StatusHistory
    extra = 0
    readonly_fields = ('old_status', 'new_status', 'changed_by', 'note', 'changed_at')
    can_delete = False


@admin.register(RepairOrder)
class RepairOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'bike', 'status', 'priority', 'created_at')
    list_filter = ('status', 'priority')
    search_fields = ('customer__first_name', 'customer__last_name', 'description')
    inlines = [RepairOrderItemInline, StatusHistoryInline]
