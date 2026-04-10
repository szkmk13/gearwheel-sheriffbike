from django.contrib import admin
from .models import StorageLocation, StorageRecord, StorageEvent


class StorageEventInline(admin.TabularInline):
    model = StorageEvent
    extra = 0
    readonly_fields = ('event_type', 'from_location', 'to_location', 'performed_by', 'note', 'created_at')
    can_delete = False


@admin.register(StorageLocation)
class StorageLocationAdmin(admin.ModelAdmin):
    list_display = ('code', 'description', 'is_occupied')
    list_filter = ('is_occupied',)
    search_fields = ('code',)


@admin.register(StorageRecord)
class StorageRecordAdmin(admin.ModelAdmin):
    list_display = ('bike', 'customer', 'location', 'status', 'checked_in_at', 'expected_pickup')
    list_filter = ('status',)
    search_fields = ('bike__brand', 'bike__model', 'customer__last_name')
    inlines = [StorageEventInline]
