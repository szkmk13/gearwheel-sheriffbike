from decimal import Decimal

from django.db import migrations

from apps.inventory.service_parts import SERVICE_PARTS


def load_service_parts(apps, schema_editor):
    Category = apps.get_model('inventory', 'Category')
    Part = apps.get_model('inventory', 'Part')

    # Po SKU, nie po nazwie - wpis już istniejący (np. z ceną poprawioną w adminie) zostaje nietknięty.
    for category_name, items in SERVICE_PARTS.items():
        category, _ = Category.objects.get_or_create(name=category_name)
        for sku, ean, name, price in items:
            Part.objects.get_or_create(
                sku=sku,
                defaults={
                    'kind': 'part', 'category': category, 'name': name, 'barcode': ean,
                    'unit': 'szt.', 'sell_price': Decimal(price),
                },
            )


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0004_base_catalog'),
    ]

    operations = [
        # Bez operacji odwrotnej usuwającej wpisy - mogą już wisieć na zleceniach (PROTECT).
        migrations.RunPython(load_service_parts, migrations.RunPython.noop),
    ]
