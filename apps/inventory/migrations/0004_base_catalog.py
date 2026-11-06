from decimal import Decimal

from django.db import migrations

from apps.inventory.catalog import BASE_CATALOG

# Kategorie z `seed_inventory` - wpisy sprzed pola `kind` dostają rodzaj po kategorii,
# reszta zostaje częścią (domyślna wartość pola).
SERVICE_CATEGORIES = ['Usługi']
ACCESSORY_CATEGORIES = ['Akcesoria', 'Oświetlenie i elektronika']


def load_base_catalog(apps, schema_editor):
    Part = apps.get_model('inventory', 'Part')
    Part.objects.filter(category__name__in=SERVICE_CATEGORIES).update(kind='service')
    Part.objects.filter(category__name__in=ACCESSORY_CATEGORIES).update(kind='accessory')

    # Po SKU, nie po nazwie - wpis już istniejący (np. przemianowany w adminie) zostaje nietknięty.
    for sku, kind, name, unit, price in BASE_CATALOG:
        Part.objects.get_or_create(
            sku=sku,
            defaults={'kind': kind, 'name': name, 'unit': unit, 'sell_price': Decimal(price)},
        )


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0003_part_kind_is_active'),
    ]

    operations = [
        # Bez operacji odwrotnej usuwającej wpisy - mogą już wisieć na zleceniach (PROTECT).
        migrations.RunPython(load_base_catalog, migrations.RunPython.noop),
    ]
