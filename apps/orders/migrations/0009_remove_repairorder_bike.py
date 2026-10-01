from django.db import migrations


class Migration(migrations.Migration):
    """Drops the single-bike column now that 0008 has moved it into `bikes`."""

    dependencies = [
        ('orders', '0008_migrate_order_bike_to_bikes'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='repairorder',
            name='bike',
        ),
    ]
