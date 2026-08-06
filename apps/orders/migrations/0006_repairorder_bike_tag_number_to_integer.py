from django.db import migrations, models


def normalize_to_digits(apps, schema_editor):
    RepairOrder = apps.get_model('orders', 'RepairOrder')
    for order in RepairOrder.objects.all():
        value = (order.bike_tag_number or '').strip()
        order.bike_tag_number = value if value.isdigit() else '0'
        order.save(update_fields=['bike_tag_number'])


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0005_repairorder_bike_tag_number'),
    ]

    operations = [
        migrations.RunPython(normalize_to_digits, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='repairorder',
            name='bike_tag_number',
            field=models.PositiveIntegerField(),
        ),
    ]
