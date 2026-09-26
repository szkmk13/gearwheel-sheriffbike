from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import ProtectedError
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from apps.customers.models import Bike

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
    # One order can cover several pieces of equipment at once (e.g. two pairs of skis).
    bikes = models.ManyToManyField('customers.Bike', related_name='repair_orders', blank=True)
    # Physical tag number attached to the equipment while it's in the shop (e.g. a claim-ticket
    # number) - not a unique identifier, it can be reused across different orders. One tag
    # covers the whole order, however many pieces of equipment it holds.
    bike_tag_number = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='accepted', db_index=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    description = models.TextField()
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

    @property
    def primary_bike(self):
        """The order's first piece of equipment, backing the legacy `bike` API field.

        Reads `.all()` so the viewset's Prefetch (ordered by id, i.e. by when the item
        was attached) is reused instead of firing a fresh query.
        """
        items = list(self.bikes.all())
        return items[0] if items else None


@receiver(pre_delete, sender=Bike)
def protect_bike_used_by_orders(sender, instance, **kwargs):
    """Keeps equipment that is attached to an order from being deleted.

    `RepairOrder.bikes` is a plain ManyToManyField, so it has no `on_delete=PROTECT`
    of its own - without this, deleting a bike would silently drop it from every order
    it appears on and leave the repair history pointing at nothing. Raising
    ProtectedError mirrors what the old ForeignKey did, so the admin still renders its
    usual "protected related objects" page and staff can detach the item first.
    """
    orders = list(instance.repair_orders.all()[:20])
    if orders:
        raise ProtectedError(
            f'Nie mozna usunac sprzetu "{instance}" - jest przypiety do zlecen.',
            orders,
        )


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
