from django.db import migrations, models


class Migration(migrations.Migration):
    """Adds the order <-> equipment M2M, alongside the old single-bike column.

    The old `RepairOrder.bike` column stays in place here so that 0008 can copy it
    across before 0009 drops it. Its reverse accessor is renamed out of the way first,
    because `bikes` claims the `repair_orders` name the ForeignKey used to hold.
    """

    dependencies = [
        ('customers', '0004_bike_category_alter_bike_bike_type'),
        ('orders', '0006_repairorder_bike_tag_number_to_integer'),
    ]

    operations = [
        migrations.AlterField(
            model_name='repairorder',
            name='bike',
            field=models.ForeignKey(
                on_delete=models.PROTECT,
                related_name='legacy_repair_orders',
                to='customers.bike',
            ),
        ),
        migrations.AddField(
            model_name='repairorder',
            name='bikes',
            field=models.ManyToManyField(blank=True, related_name='repair_orders', to='customers.bike'),
        ),
    ]
