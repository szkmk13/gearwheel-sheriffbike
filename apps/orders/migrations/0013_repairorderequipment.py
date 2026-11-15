import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """Per-item claim tags, step 1 of 3: the order <-> equipment table with a tag column.

    It lives next to the old auto-created M2M table for now; 0014 copies the rows across
    and 0015 swaps `RepairOrder.bikes` over to it. `bike_tag_number` turns nullable here
    so that reversing 0015 can bring the column back before 0014's reverse refills it.
    """

    dependencies = [
        ('customers', '0004_bike_category_alter_bike_bike_type'),
        ('orders', '0012_order_item_kinds_created_at'),
    ]

    operations = [
        migrations.CreateModel(
            name='RepairOrderEquipment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tag_number', models.PositiveIntegerField(db_index=True)),
                ('bike', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT, related_name='order_equipment', to='customers.bike',
                )),
                ('repair_order', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='equipment', to='orders.repairorder',
                )),
            ],
            options={
                'verbose_name': 'Sprzet zlecenia',
                'verbose_name_plural': 'Sprzet zlecenia',
                'ordering': ['id'],
                'constraints': [
                    models.UniqueConstraint(fields=('repair_order', 'bike'), name='order_equipment_unique_bike'),
                ],
            },
        ),
        migrations.AlterField(
            model_name='repairorder',
            name='bike_tag_number',
            field=models.PositiveIntegerField(null=True),
        ),
    ]
