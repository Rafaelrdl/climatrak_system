from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("cmms", "0010_add_signature_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="partusage",
            name="source",
            field=models.CharField(
                max_length=20,
                choices=[("MANUAL", "Manual"), ("WORK_ORDER_ITEM", "Item da OS")],
                default="MANUAL",
                verbose_name="Origem",
            ),
        ),
    ]

