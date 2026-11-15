from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import models

from apps.inventory.models import Part

User = get_user_model()


class RepairOrder(models.Model):
    STATUS_CHOICES = [
        ('accepted', 'Accepted'),
        ('estimating', 'Estimating'),
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
    # One order can cover several pieces of equipment at once (e.g. two pairs of skis), and
    # each piece carries its own claim tag - see RepairOrderEquipment.
    bikes = models.ManyToManyField(
        'customers.Bike', through='RepairOrderEquipment', related_name='repair_orders', blank=True,
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='accepted', db_index=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    description = models.TextField()
    estimated_cost = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    final_cost = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    # When the customer is told they can collect the equipment. Required when the order is
    # created through the API; nullable only because orders from before it existed have none.
    estimated_pickup_date = models.DateField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Order #{self.pk} - {self.customer} ({self.status})'

    @property
    def equipment_list(self):
        """The order's equipment rows (bike + its tag), in the order they were attached.

        Reads `.all()` so a viewset Prefetch of `equipment` is reused instead of firing a
        fresh query per order.
        """
        return list(self.equipment.all())

    @property
    def primary_bike(self):
        """The order's first piece of equipment, backing the legacy `bike` API field."""
        rows = self.equipment_list
        return rows[0].bike if rows else None

    @property
    def tag_numbers(self):
        """Claim tags of all the order's equipment, in attachment order."""
        return [row.tag_number for row in self.equipment_list]

    def tag_for(self, bike_id):
        """Claim tag of one piece of equipment on this order (None if it is not on it)."""
        return next((row.tag_number for row in self.equipment_list if row.bike_id == bike_id), None)


class RepairOrderEquipment(models.Model):
    """One piece of equipment on an order, with the claim tag hung on it in the shop.

    The tag is a physical, reusable number (a plastic tag on the bike or skis), not an
    identifier: the same number comes back on later orders once the tag is free again.
    Within one order every piece gets its own tag - the serializers enforce that for new
    data. Orders from before per-item tags carry the old order-wide tag on every piece.

    `bike` is PROTECT: equipment with repair history cannot be deleted from under it.
    """
    repair_order = models.ForeignKey(RepairOrder, on_delete=models.CASCADE, related_name='equipment')
    bike = models.ForeignKey('customers.Bike', on_delete=models.PROTECT, related_name='order_equipment')
    tag_number = models.PositiveIntegerField(db_index=True)

    class Meta:
        ordering = ['id']
        constraints = [
            models.UniqueConstraint(fields=['repair_order', 'bike'], name='order_equipment_unique_bike'),
        ]
        verbose_name = 'Sprzet zlecenia'
        verbose_name_plural = 'Sprzet zlecenia'

    def __str__(self):
        return f'#{self.tag_number} {self.bike}'


class RepairOrderItem(models.Model):
    """One line of an order: a catalogue entry (`part`) or a one-off item without one.

    `description` and `unit_price` are copied from the catalogue when the line is added, so
    a later price change never rewrites past orders. Lines go through `services`
    (add/update/remove_item), which keep `RepairOrder.final_cost` equal to their sum.
    """
    # The catalogue's kinds (Part.KIND_CHOICES) - a one-off line picks one too.
    ITEM_TYPE_CHOICES = Part.KIND_CHOICES

    repair_order = models.ForeignKey(RepairOrder, on_delete=models.CASCADE, related_name='items')
    part = models.ForeignKey('inventory.Part', on_delete=models.PROTECT, null=True, blank=True)
    item_type = models.CharField(max_length=10, choices=ITEM_TYPE_CHOICES)
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=8, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    # Usage reports group lines by month/year - by the order's `delivered_at`, falling back to this.
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.description} x{self.quantity}'

    @property
    def line_total(self):
        return (self.quantity * self.unit_price).quantize(Decimal('0.01'))


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
