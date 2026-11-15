from django.db import migrations


def copy_forward(apps, schema_editor):
    """Every piece of equipment on an order gets that order's (until now shared) tag.

    Rows are copied in the old link table's id order, i.e. the order the equipment was
    attached in, so the first piece stays first.
    """
    RepairOrder = apps.get_model('orders', 'RepairOrder')
    RepairOrderEquipment = apps.get_model('orders', 'RepairOrderEquipment')
    Link = RepairOrder.bikes.through

    tags = dict(RepairOrder.objects.values_list('pk', 'bike_tag_number'))
    RepairOrderEquipment.objects.bulk_create([
        RepairOrderEquipment(
            repair_order_id=link.repairorder_id,
            bike_id=link.bike_id,
            tag_number=tags[link.repairorder_id] or 0,
        )
        for link in Link.objects.order_by('id')
    ], batch_size=500)


def copy_backward(apps, schema_editor):
    """Back to one tag per order (the first piece's) and the plain link table."""
    RepairOrder = apps.get_model('orders', 'RepairOrder')
    RepairOrderEquipment = apps.get_model('orders', 'RepairOrderEquipment')
    Link = RepairOrder.bikes.through

    first_tag = {}
    links = []
    for row in RepairOrderEquipment.objects.order_by('id'):
        first_tag.setdefault(row.repair_order_id, row.tag_number)
        links.append(Link(repairorder_id=row.repair_order_id, bike_id=row.bike_id))
    Link.objects.bulk_create(links, batch_size=500)
    for order in RepairOrder.objects.all():
        order.bike_tag_number = first_tag.get(order.pk, 0)
        order.save(update_fields=['bike_tag_number'])
    RepairOrderEquipment.objects.all().delete()


class Migration(migrations.Migration):
    """Per-item claim tags, step 2 of 3: copy the order-wide tag onto each piece."""

    dependencies = [
        ('orders', '0013_repairorderequipment'),
    ]

    operations = [
        migrations.RunPython(copy_forward, copy_backward),
    ]
