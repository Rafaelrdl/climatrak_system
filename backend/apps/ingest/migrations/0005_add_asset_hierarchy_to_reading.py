# Migration to add asset_tag hierarchy to Reading model
# This enables direct querying by asset instead of device_id

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ingest', '0004_timescale_hypertable_continuous_aggregates'),
    ]

    operations = [
        # Add asset_tag field (extracted from MQTT topic: tenants/X/sites/Y/assets/Z/telemetry)
        migrations.AddField(
            model_name='reading',
            name='asset_tag',
            field=models.CharField(
                max_length=255,
                db_index=True,
                null=True,
                blank=True,
                help_text="Asset identifier extracted from MQTT topic hierarchy"
            ),
        ),
        
        # Add tenant field (extracted from MQTT topic: tenants/X/...)
        migrations.AddField(
            model_name='reading',
            name='tenant',
            field=models.CharField(
                max_length=255,
                db_index=True,
                null=True,
                blank=True,
                help_text="Tenant identifier extracted from MQTT topic hierarchy"
            ),
        ),
        
        # Add site field (extracted from MQTT topic: tenants/X/sites/Y/...)
        migrations.AddField(
            model_name='reading',
            name='site',
            field=models.CharField(
                max_length=255,
                db_index=True,
                null=True,
                blank=True,
                help_text="Site identifier extracted from MQTT topic hierarchy"
            ),
        ),
        
        # Create composite index for efficient asset-based queries
        migrations.AddIndex(
            model_name='reading',
            index=models.Index(
                fields=['asset_tag', 'ts'],
                name='reading_asset_ts_idx'
            ),
        ),
        
        # Create composite index for tenant-filtered queries
        migrations.AddIndex(
            model_name='reading',
            index=models.Index(
                fields=['tenant', 'asset_tag', 'ts'],
                name='reading_tenant_asset_ts_idx'
            ),
        ),
        
        # Create composite index for site-filtered queries
        migrations.AddIndex(
            model_name='reading',
            index=models.Index(
                fields=['site', 'asset_tag', 'ts'],
                name='reading_site_asset_ts_idx'
            ),
        ),
    ]
