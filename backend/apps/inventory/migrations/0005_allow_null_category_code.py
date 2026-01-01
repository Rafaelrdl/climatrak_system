from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("inventory", "0004_add_manufacturer_field"),
    ]

    operations = [
        migrations.AlterField(
            model_name="inventorycategory",
            name="code",
            field=models.CharField(
                "Codigo", max_length=50, blank=True, null=True, unique=True
            ),
        ),
    ]

