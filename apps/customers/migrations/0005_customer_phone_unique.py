from collections import defaultdict

import phonenumber_field.modelfields
from django.db import migrations


def merge_customers_by_phone(apps, schema_editor):
    """Normalizes every phone the way PhoneNumberField stores it and merges customers
    that share a number into the oldest one, so the unique constraint can be added."""
    Customer = apps.get_model('customers', 'Customer')
    field = phonenumber_field.modelfields.PhoneNumberField()

    groups = defaultdict(list)
    for customer in Customer.objects.order_by('pk'):
        groups[field.get_prep_value(customer.phone.strip()) or ''].append(customer)

    # Rowery, zlecenia, przechowalnia, wizyty - wszystko, co wskazuje na klienta.
    relations = [
        (rel.related_model, rel.field.name)
        for rel in Customer._meta.related_objects
        if rel.one_to_many or rel.one_to_one
    ]

    for phone, customers in groups.items():
        keeper, duplicates = customers[0], customers[1:]
        for duplicate in duplicates:
            for model, fk_name in relations:
                model.objects.filter(**{fk_name: duplicate.pk}).update(**{fk_name: keeper.pk})
            keeper.rodo_accepted = keeper.rodo_accepted or duplicate.rodo_accepted
            keeper.email = keeper.email or duplicate.email
            if duplicate.notes and duplicate.notes not in keeper.notes:
                keeper.notes = f'{keeper.notes}\n{duplicate.notes}' if keeper.notes else duplicate.notes
            duplicate.delete()
        keeper.phone = phone
        keeper.save(update_fields=['phone', 'rodo_accepted', 'email', 'notes'])


class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0004_bike_category_alter_bike_bike_type'),
        # Modele z FK do klienta muszą istnieć, żeby dało się przepiąć ich rekordy.
        ('orders', '0011_rename_diagnosing_to_estimating'),
        ('storage', '0001_initial'),
        ('appointments', '0002_initial'),
    ]

    operations = [
        migrations.RunPython(merge_customers_by_phone, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='customer',
            name='phone',
            field=phonenumber_field.modelfields.PhoneNumberField(max_length=128, region=None, unique=True),
        ),
    ]
