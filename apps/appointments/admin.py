from django.contrib import admin
from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'customer', 'mechanic', 'status', 'start_time', 'end_time')
    list_filter = ('status', 'mechanic')
    search_fields = ('title', 'customer__first_name', 'customer__last_name')
