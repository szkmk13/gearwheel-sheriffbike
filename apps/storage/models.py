from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class StorageLocation(models.Model):
    code = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=200, blank=True)
    is_occupied = models.BooleanField(default=False)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return self.code


class StorageRecord(models.Model):
    STATUS_CHOICES = [
        ('checked_in', 'Checked In'),
        ('checked_out', 'Checked Out'),
    ]
    bike = models.ForeignKey('customers.Bike', on_delete=models.PROTECT, related_name='storage_records')
    customer = models.ForeignKey('customers.Customer', on_delete=models.PROTECT, related_name='storage_records')
    location = models.ForeignKey(StorageLocation, on_delete=models.PROTECT, null=True, blank=True, related_name='storage_records')
    repair_order = models.ForeignKey('orders.RepairOrder', on_delete=models.SET_NULL, null=True, blank=True, related_name='storage_records')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='checked_in', db_index=True)
    checked_in_at = models.DateTimeField(auto_now_add=True)
    checked_out_at = models.DateTimeField(null=True, blank=True)
    check_in_notes = models.TextField(blank=True)
    check_out_notes = models.TextField(blank=True)
    expected_pickup = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-checked_in_at']

    def __str__(self):
        return f'{self.bike} @ {self.location} ({self.status})'


class StorageEvent(models.Model):
    EVENT_CHOICES = [
        ('check_in', 'Check In'),
        ('check_out', 'Check Out'),
        ('location_change', 'Location Change'),
    ]
    storage_record = models.ForeignKey(StorageRecord, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=20, choices=EVENT_CHOICES)
    from_location = models.ForeignKey(StorageLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    to_location = models.ForeignKey(StorageLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.event_type} - {self.storage_record}'
