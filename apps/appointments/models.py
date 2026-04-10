from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class Appointment(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('no_show', 'No Show'),
        ('cancelled', 'Cancelled'),
    ]
    customer = models.ForeignKey('customers.Customer', on_delete=models.PROTECT, related_name='appointments')
    bike = models.ForeignKey('customers.Bike', on_delete=models.PROTECT, null=True, blank=True, related_name='appointments')
    repair_order = models.OneToOneField(
        'orders.RepairOrder', on_delete=models.SET_NULL, null=True, blank=True, related_name='appointment'
    )
    mechanic = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled', db_index=True)
    start_time = models.DateTimeField(db_index=True)
    end_time = models.DateTimeField()
    title = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_time']

    def __str__(self):
        return f'{self.title} — {self.start_time:%Y-%m-%d %H:%M}'
