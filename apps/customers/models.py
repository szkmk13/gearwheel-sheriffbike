import uuid

from django.db import models


class Customer(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.first_name} {self.last_name}'


class Bike(models.Model):
    BIKE_TYPE_CHOICES = [
        ('road', 'Road'),
        ('mtb', 'Mountain'),
        ('city', 'City'),
        ('gravel', 'Gravel'),
        ('electric', 'Electric'),
        ('other', 'Other'),
    ]
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='bikes')
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100, blank=True)
    bike_type = models.CharField(max_length=20, choices=BIKE_TYPE_CHOICES, default='other')
    color = models.CharField(max_length=50, blank=True)
    serial_no = models.CharField(max_length=100, blank=True, db_index=True)
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    photo = models.ImageField(upload_to='bikes/', blank=True, null=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['brand', 'model']

    def __str__(self):
        return f'{self.brand} {self.model} ({self.customer})'

    @property
    def sheriff_code(self):
        return f'sheriff-{self.id}-{self.uuid}'
