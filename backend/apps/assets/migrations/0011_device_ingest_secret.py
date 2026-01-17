import secrets

from django.db import migrations, models


def populate_ingest_secrets(apps, schema_editor):
    Device = apps.get_model("assets", "Device")
    devices = Device.objects.filter(ingest_secret__isnull=True)
    for device in devices.iterator():
        device.ingest_secret = secrets.token_hex(32)
        device.save(update_fields=["ingest_secret"])


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0010_remove_asset_type_choices"),
    ]

    operations = [
        migrations.AddField(
            model_name="device",
            name="ingest_secret",
            field=models.CharField(
                blank=True,
                help_text="Segredo exclusivo para assinatura HMAC do ingest",
                max_length=64,
                null=True,
                verbose_name="Segredo de Ingest",
            ),
        ),
        migrations.RunPython(populate_ingest_secrets, migrations.RunPython.noop),
    ]
