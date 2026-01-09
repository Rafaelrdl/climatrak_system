from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("cmms", "0011_add_part_usage_source"),
    ]

    operations = [
        migrations.AlterField(
            model_name="partusage",
            name="inventory_movement_id",
            field=models.PositiveBigIntegerField(
                blank=True,
                null=True,
                verbose_name="ID da Movimentação",
                help_text="Referência à movimentação de inventário",
            ),
        ),
    ]
