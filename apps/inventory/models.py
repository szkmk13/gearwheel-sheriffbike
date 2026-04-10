from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Supplier(models.Model):
    name = models.CharField(max_length=200)
    contact = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Part(models.Model):
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='parts')
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='parts')
    name = models.CharField(max_length=200, db_index=True)
    sku = models.CharField(max_length=100, blank=True, db_index=True)
    barcode = models.CharField(max_length=100, blank=True, db_index=True)
    description = models.TextField(blank=True)
    unit = models.CharField(max_length=20, default='pcs')
    stock_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    low_stock_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    purchase_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    sell_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Invoice(models.Model):
    STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('processing', 'Processing'),
        ('parsed', 'Parsed'),
        ('failed', 'Failed'),
        ('confirmed', 'Confirmed'),
    ]
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    image = models.ImageField(upload_to='invoices/%Y/%m/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded', db_index=True)
    raw_ocr_text = models.TextField(blank=True)
    parsed_data = models.JSONField(null=True, blank=True)
    invoice_number = models.CharField(max_length=100, blank=True)
    invoice_date = models.DateField(null=True, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='invoices')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Invoice {self.invoice_number or self.pk}'


class StockMovement(models.Model):
    MOVEMENT_TYPE_CHOICES = [
        ('in', 'Stock In'),
        ('out', 'Stock Out'),
        ('adjustment', 'Adjustment'),
        ('return', 'Return'),
    ]
    part = models.ForeignKey(Part, on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    repair_order = models.ForeignKey(
        'orders.RepairOrder', on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_movements'
    )
    invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='movements')
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.movement_type} {self.quantity} x {self.part}'
