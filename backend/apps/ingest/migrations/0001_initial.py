# Generated migration for Telemetry model with TimescaleDB hypertable

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Telemetry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('device_id', models.CharField(db_index=True, help_text='MQTT client ID (device identifier)', max_length=255)),
                ('topic', models.CharField(db_index=True, help_text='Full MQTT topic path (e.g., tenants/umc/devices/001/sensors/temp)', max_length=500)),
                ('payload', models.JSONField(help_text='Original MQTT message payload (parsed JSON)')),
                ('timestamp', models.DateTimeField(db_index=True, help_text='Timestamp from EMQX broker (when message was received)')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now, help_text='When this record was created in the database')),
            ],
            options={
                'verbose_name': 'Telemetry',
                'verbose_name_plural': 'Telemetry',
                'db_table': 'telemetry',
                'ordering': ['-timestamp'],
            },
        ),
        migrations.AddIndex(
            model_name='telemetry',
            index=models.Index(fields=['device_id', 'timestamp'], name='telemetry_device__idx'),
        ),
        migrations.AddIndex(
            model_name='telemetry',
            index=models.Index(fields=['topic', 'timestamp'], name='telemetry_topic_idx'),
        ),
    ]
