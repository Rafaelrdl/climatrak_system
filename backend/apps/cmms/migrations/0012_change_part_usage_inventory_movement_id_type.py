from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("cmms", "0011_add_part_usage_source"),
    ]

    operations = [
        # Esta migration foi removida porque causa conflito de tipo
        # O campo inventory_movement_id já é um PositiveBigIntegerField no modelo
        # Se o banco de dados tem UUID, executar manualmente:
        # ALTER TABLE cmms_partusage ALTER COLUMN inventory_movement_id TYPE bigint USING NULL;
    ]

