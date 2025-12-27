from django.db import models
from django.utils import timezone


class Telemetry(models.Model):
    """
    Telemetry data from IoT devices via MQTT.
    
    This model stores time-series data from MQTT messages forwarded
    by EMQX Rule Engine. The table is converted to a TimescaleDB
    hypertable for efficient time-series queries.
    
    Note: Uses auto-incrementing BigAutoField as PK (not timestamp)
    to avoid TimescaleDB constraint issues. Indexes include timestamp.
    """
    
    # Auto-incrementing ID (standard Django)
    id = models.BigAutoField(primary_key=True)
    
    # Device identification
    device_id = models.CharField(
        max_length=255,
        db_index=True,
        help_text="MQTT client ID (device identifier)"
    )
    
    # MQTT topic where message was published
    topic = models.CharField(
        max_length=500,
        db_index=True,
        help_text="Full MQTT topic path (e.g., tenants/umc/devices/001/sensors/temp)"
    )
    
    # Message payload (JSON from MQTT)
    payload = models.JSONField(
        help_text="Original MQTT message payload (parsed JSON)"
    )
    
    # Timestamp from EMQX (Unix milliseconds) - used for TimescaleDB partitioning
    timestamp = models.DateTimeField(
        db_index=True,
        help_text="Timestamp from EMQX broker (when message was received)"
    )
    
    # Internal timestamp (when saved to DB)
    created_at = models.DateTimeField(
        default=timezone.now,
        help_text="When this record was created in the database"
    )
    
    class Meta:
        db_table = 'telemetry'
        ordering = ['-timestamp']
        verbose_name = 'Telemetry'
        verbose_name_plural = 'Telemetry'
        indexes = [
            models.Index(fields=['device_id', 'timestamp']),
            models.Index(fields=['topic', 'timestamp']),
        ]
        # Note: TimescaleDB hypertable will be created via migration RunSQL
    
    def __str__(self):
        return f"{self.device_id} - {self.topic} @ {self.timestamp}"


class Reading(models.Model):
    """
    Structured sensor readings for TimescaleDB Continuous Aggregates.
    
    This model stores normalized sensor readings with numeric values,
    optimized for time-series aggregations (avg, min, max, percentiles).
    Continuous Aggregates (1m/5m/1h) are created on this table.
    
    Use this for numeric sensor data (temperature, humidity, etc.).
    Use Telemetry for raw MQTT messages with complex payloads.
    
    Note: No explicit primary key to avoid TimescaleDB constraint issues.
    Django will create default 'id' field, indexes provide uniqueness.
    """
    
    # Device & Sensor identification
    device_id = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Device identifier (from MQTT client)"
    )
    
    sensor_id = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Sensor identifier (e.g., temp_001, humidity_002)"
    )
    
    # MQTT Topic Hierarchy (source of truth)
    asset_tag = models.CharField(
        max_length=255,
        db_index=True,
        null=True,
        blank=True,
        help_text="Asset identifier extracted from MQTT topic (e.g., CHILLER-001)"
    )
    
    tenant = models.CharField(
        max_length=255,
        db_index=True,
        null=True,
        blank=True,
        help_text="Tenant identifier extracted from MQTT topic (e.g., umc)"
    )
    
    site = models.CharField(
        max_length=255,
        db_index=True,
        null=True,
        blank=True,
        help_text="Site identifier extracted from MQTT topic (e.g., UMC)"
    )
    
    # Measurement
    value = models.FloatField(
        help_text="Numeric sensor reading value"
    )
    
    # Optional labels for filtering (JSON)
    labels = models.JSONField(
        default=dict,
        blank=True,
        help_text="Optional metadata (location, unit, etc.)"
    )
    
    # Timestamp (partition column for hypertable)
    ts = models.DateTimeField(
        db_index=True,
        help_text="Measurement timestamp (used for TimescaleDB partitioning)"
    )
    
    # Internal timestamp
    created_at = models.DateTimeField(
        default=timezone.now,
        help_text="When record was inserted into database"
    )
    
    class Meta:
        db_table = 'reading'
        ordering = ['-ts']
        verbose_name = 'Reading'
        verbose_name_plural = 'Readings'
        indexes = [
            models.Index(fields=['device_id', 'sensor_id', 'ts']),
            models.Index(fields=['sensor_id', 'ts']),
            models.Index(fields=['id']),  # For queries by ID
            # MQTT Hierarchy indexes for efficient asset-based queries
            models.Index(fields=['asset_tag', 'ts'], name='reading_asset_ts_idx'),
            models.Index(fields=['tenant', 'asset_tag', 'ts'], name='reading_tenant_asset_ts_idx'),
            models.Index(fields=['site', 'asset_tag', 'ts'], name='reading_site_asset_ts_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['device_id', 'sensor_id', 'ts'],
                name='unique_reading_per_sensor_timestamp'
            ),
        ]
        # Note: TimescaleDB hypertable + Continuous Aggregates via migration
    
    def __str__(self):
        return f"{self.sensor_id} = {self.value} @ {self.ts}"
