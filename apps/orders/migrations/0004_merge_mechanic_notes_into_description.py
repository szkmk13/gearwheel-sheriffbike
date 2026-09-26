from django.db import migrations


def merge_mechanic_notes_into_description(apps, schema_editor):
    RepairOrder = apps.get_model('orders', 'RepairOrder')
    for order in RepairOrder.objects.exclude(mechanic_notes=''):
        order.description = f'{order.description}\n\n{order.mechanic_notes}'.strip()
        order.save(update_fields=['description'])


def split_description_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_migrate_draft_to_accepted'),
    ]

    operations = [
        migrations.RunPython(merge_mechanic_notes_into_description, split_description_noop),
        migrations.RemoveField(
            model_name='repairorder',
            name='mechanic_notes',
        ),
    ]
