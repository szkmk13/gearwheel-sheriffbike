from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class RepairOrder(models.Model):
    STATUS_CHOICES = [
        ('accepted', 'Accepted'),
        ('diagnosing', 'Diagnosing'),
        ('waiting_parts', 'Waiting for Parts'),
        ('in_progress', 'In Progress'),
        ('done', 'Done'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    customer = models.ForeignKey('customers.Customer', on_delete=models.PROTECT, related_name='repair_orders')
    bike = models.ForeignKey('customers.Bike', on_delete=models.PROTECT, related_name='repair_orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='accepted', db_index=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    description = models.TextField()
    mechanic_notes = models.TextField(blank=True)
    estimated_cost = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    final_cost = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Order #{self.pk} - {self.customer} ({self.status})'


class RepairOrderItem(models.Model):
    ITEM_TYPE_CHOICES = [
        ('part', 'Part'),
        ('labor', 'Labor'),
    ]
    repair_order = models.ForeignKey(RepairOrder, on_delete=models.CASCADE, related_name='items')
    part = models.ForeignKey('inventory.Part', on_delete=models.PROTECT, null=True, blank=True)
    item_type = models.CharField(max_length=10, choices=ITEM_TYPE_CHOICES)
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=8, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)

    def __str__(self):
        return f'{self.description} x{self.quantity}'


class StatusHistory(models.Model):
    repair_order = models.ForeignKey(RepairOrder, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    note = models.TextField(blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f'Order #{self.repair_order_id}: {self.old_status} → {self.new_status}'
