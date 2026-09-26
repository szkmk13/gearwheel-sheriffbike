"""Kasuje pierwsza wersje magazynu: ponumerowane miejsca postojowe i przypisane do nich
rekordy. Serwis takich miejsc nie prowadzi - pojemnosc jest miekka, a sprzet identyfikuje
numer naklejki ze zlecenia - wiec modele odchodza w calosci, zanim 0003 postawi nowe.

0001 poszlo juz na produkcje, dlatego nie ruszamy go wstecz.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('storage', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(model_name='storageevent', name='from_location'),
        migrations.RemoveField(model_name='storageevent', name='performed_by'),
        migrations.RemoveField(model_name='storageevent', name='storage_record'),
        migrations.RemoveField(model_name='storageevent', name='to_location'),
        migrations.RemoveField(model_name='storagerecord', name='bike'),
        migrations.RemoveField(model_name='storagerecord', name='customer'),
        migrations.RemoveField(model_name='storagerecord', name='location'),
        migrations.RemoveField(model_name='storagerecord', name='repair_order'),
        migrations.DeleteModel(name='StorageEvent'),
        migrations.DeleteModel(name='StorageRecord'),
        migrations.DeleteModel(name='StorageLocation'),
    ]
