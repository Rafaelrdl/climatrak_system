"""
Django-filter FilterSets for Telemetry API.
"""
import django_filters as df
from .models import Telemetry, Reading


class TelemetryFilter(df.FilterSet):
    """
    Filters for raw Telemetry data.
    
    Query params:
    - device_id: exact match
    - topic: partial match (icontains)
    - timestamp_from: timestamp >= value
    - timestamp_to: timestamp <= value
    """
    device_id = df.CharFilter(
        field_name='device_id',
        lookup_expr='exact',
        help_text='Filter by device ID (exact match)'
    )
    topic = df.CharFilter(
        field_name='topic',
        lookup_expr='icontains',
        help_text='Filter by topic (partial match)'
    )
    timestamp_from = df.IsoDateTimeFilter(
        field_name='timestamp',
        lookup_expr='gte',
        help_text='Filter by timestamp >= value (ISO-8601)'
    )
    timestamp_to = df.IsoDateTimeFilter(
        field_name='timestamp',
        lookup_expr='lte',
        help_text='Filter by timestamp <= value (ISO-8601)'
    )
    
    class Meta:
        model = Telemetry
        fields = ['device_id', 'topic', 'timestamp_from', 'timestamp_to']


class ReadingFilter(df.FilterSet):
    """
    Filters for structured Reading data.
    
    Query params:
    - device_id: exact match
    - sensor_id: exact match
    - ts_from: ts >= value
    - ts_to: ts <= value
    - value_min: value >= threshold
    - value_max: value <= threshold
    """
    device_id = df.CharFilter(
        field_name='device_id',
        lookup_expr='exact',
        help_text='Filter by device ID (exact match)'
    )
    sensor_id = df.CharFilter(
        field_name='sensor_id',
        lookup_expr='exact',
        help_text='Filter by sensor ID (exact match)'
    )
    ts_from = df.IsoDateTimeFilter(
        field_name='ts',
        lookup_expr='gte',
        help_text='Filter by timestamp >= value (ISO-8601)'
    )
    ts_to = df.IsoDateTimeFilter(
        field_name='ts',
        lookup_expr='lte',
        help_text='Filter by timestamp <= value (ISO-8601)'
    )
    value_min = df.NumberFilter(
        field_name='value',
        lookup_expr='gte',
        help_text='Filter by value >= threshold'
    )
    value_max = df.NumberFilter(
        field_name='value',
        lookup_expr='lte',
        help_text='Filter by value <= threshold'
    )
    
    class Meta:
        model = Reading
        fields = ['device_id', 'sensor_id', 'ts_from', 'ts_to', 'value_min', 'value_max']
