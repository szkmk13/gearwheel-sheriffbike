from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0004_merge_mechanic_notes_into_description'),
    ]

    operations = [
        migrations.AddField(
            model_name='repairorder',
            name='bike_tag_number',
            field=models.CharField(default='', max_length=20),
            preserve_default=False,
        ),
    ]
