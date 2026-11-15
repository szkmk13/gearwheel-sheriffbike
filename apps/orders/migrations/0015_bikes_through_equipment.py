from django.db import migrations, models


class Migration(migrations.Migration):
    """Per-item claim tags, step 3 of 3: `RepairOrder.bikes` now goes through
    RepairOrderEquipment, and the order-wide `bike_tag_number` is gone.

    Django cannot alter an existing M2M into one with `through`, so the field is removed
    (dropping the old link table, already copied by 0014) and added back on top of the
    new table, which needs no schema change of its own.
    """

    dependencies = [
        ('customers', '0004_bike_category_alter_bike_bike_type'),
        ('orders', '0014_copy_order_tags_to_equipment'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='repairorder',
            name='bikes',
        ),
        migrations.AddField(
            model_name='repairorder',
            name='bikes',
            field=models.ManyToManyField(
                blank=True, related_name='repair_orders', through='orders.RepairOrderEquipment',
                to='customers.bike',
            ),
        ),
        migrations.RemoveField(
            model_name='repairorder',
            name='bike_tag_number',
        ),
    ]
