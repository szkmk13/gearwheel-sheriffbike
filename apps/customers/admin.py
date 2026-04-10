from django.contrib import admin
from .models import Customer, Bike


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
    list_display = ('brand', 'model', 'bike_type', 'customer', 'serial_no')
    list_filter = ('bike_type',)
    search_fields = ('brand', 'model', 'serial_no')
