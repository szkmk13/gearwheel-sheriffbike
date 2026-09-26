from django.db import migrations


def forwards(apps, schema_editor):
    """Moves each order's single `bike` into the new `bikes` set."""
    RepairOrder = apps.get_model('orders', 'RepairOrder')
    ThroughModel = RepairOrder.bikes.through

    links = [
        ThroughModel(repairorder_id=order_id, bike_id=bike_id)
        for order_id, bike_id in RepairOrder.objects.values_list('id', 'bike_id')
        if bike_id is not None
    ]
    ThroughModel.objects.bulk_create(links, batch_size=500)


def backwards(apps, schema_editor):
    """Puts the first attached item back on the order's `bike` column."""
    RepairOrder = apps.get_model('orders', 'RepairOrder')
    ThroughModel = RepairOrder.bikes.through

    # Orders can hold several items now; only the first one survives the round trip.
    first_by_order = {}
    for order_id, bike_id in ThroughModel.objects.order_by('id').values_list('repairorder_id', 'bike_id'):
        first_by_order.setdefault(order_id, bike_id)

    updates = []
    for order in RepairOrder.objects.iterator():
        bike_id = first_by_order.get(order.id)
        if bike_id is None:
            continue
        order.bike_id = bike_id
        updates.append(order)
    RepairOrder.objects.bulk_update(updates, ['bike_id'], batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0007_repairorder_bikes'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
