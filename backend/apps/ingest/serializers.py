"""
DRF Serializers for Telemetry API.
"""
from rest_framework import serializers
from .models import Telemetry, Reading


class TelemetrySerializer(serializers.ModelSerializer):
    """Serializer for raw Telemetry (MQTT messages)."""
    
    class Meta:
        model = Telemetry
        fields = [
            'id',
            'device_id',
            'topic',
            'payload',
            'timestamp',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ReadingSerializer(serializers.ModelSerializer):
    """Serializer for structured Reading (numeric sensor data)."""
    
    class Meta:
        model = Reading
        fields = [
            'id',
            'device_id',
            'sensor_id',
            'value',
            'labels',
            'ts',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class TimeSeriesPointSerializer(serializers.Serializer):
    """
    Serializer for aggregated time-series data points.
    Used for Continuous Aggregates (reading_1m, reading_5m, reading_1h).
    """
    bucket = serializers.DateTimeField(
        help_text="Time bucket (start of aggregation period)"
    )
    device_id = serializers.CharField(
        max_length=255,
        help_text="Device identifier"
    )
    sensor_id = serializers.CharField(
        max_length=255,
        help_text="Sensor identifier"
    )
    avg_value = serializers.FloatField(
        help_text="Average value in bucket",
        allow_null=True
    )
    min_value = serializers.FloatField(
        help_text="Minimum value in bucket",
        allow_null=True
    )
    max_value = serializers.FloatField(
        help_text="Maximum value in bucket",
        allow_null=True
    )
    last_value = serializers.FloatField(
        help_text="Last value in bucket (by timestamp)",
        allow_null=True
    )
    count = serializers.IntegerField(
        help_text="Number of readings in bucket",
        allow_null=True
    )
