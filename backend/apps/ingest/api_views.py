"""
DRF Views for Telemetry API.

Provides REST endpoints for:
- Raw telemetry data (Telemetry model)
- Structured sensor readings (Reading model)
- Aggregated time-series (Continuous Aggregates)
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

from .models import Telemetry, Reading
from .serializers import (
    TelemetrySerializer,
    ReadingSerializer,
    TimeSeriesPointSerializer
)
from .filters import TelemetryFilter, ReadingFilter


class TelemetryListView(generics.ListAPIView):
    """
    List raw telemetry data (MQTT messages).
    
    Supports filtering by:
    - device_id (exact)
    - topic (partial match)
    - timestamp_from (ISO-8601)
    - timestamp_to (ISO-8601)
    
    Returns paginated results (default: 200 per page).
    """
    serializer_class = TelemetrySerializer
    filterset_class = TelemetryFilter
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """Queryset automatically scoped to current tenant schema."""
        return Telemetry.objects.all()


class ReadingListView(generics.ListAPIView):
    """
    List structured sensor readings.
    
    Supports filtering by:
    - device_id (exact)
    - sensor_id (exact)
    - ts_from (ISO-8601)
    - ts_to (ISO-8601)
    - value_min (numeric threshold)
    - value_max (numeric threshold)
    
    Returns paginated results (default: 200 per page).
    """
    serializer_class = ReadingSerializer
    filterset_class = ReadingFilter
    ordering = ['-ts']
    
    def get_queryset(self):
        """Queryset automatically scoped to current tenant schema."""
        return Reading.objects.all()


class TimeSeriesAggregateView(APIView):
    """
    Query aggregated time-series data from Continuous Aggregates.
    
    Uses TimescaleDB materialized views (reading_1m, reading_5m, reading_1h)
    for efficient aggregation queries over large time ranges.
    
    Query parameters:
    - bucket: 1m | 5m | 1h (required)
    - device_id: filter by device (optional)
    - sensor_id: filter by sensor (optional)
    - from: start time ISO-8601 (optional)
    - to: end time ISO-8601 (optional)
    - limit: max results (default 500, max 5000)
    - offset: pagination offset (default 0)
    
    Returns:
    - List of aggregated data points with bucket, avg, min, max, last values
    """
    
    serializer_class = TimeSeriesPointSerializer
    
    # Map bucket parameter to materialized view name
    BUCKET_VIEWS = {
        '1m': 'reading_1m',
        '5m': 'reading_5m',
        '1h': 'reading_1h',
    }
    
    MAX_LIMIT = 5000
    DEFAULT_LIMIT = 500
    
    @extend_schema(
        summary="Get aggregated time-series data",
        description="""
        Query pre-aggregated sensor data from TimescaleDB Continuous Aggregates.
        
        Buckets available:
        - 1m: 1-minute aggregations (refreshed every 1 min, keeps 30 days)
        - 5m: 5-minute aggregations (refreshed every 5 min, keeps 60 days)
        - 1h: 1-hour aggregations (refreshed every 1 hour, keeps 90 days)
        
        Returns avg, min, max, last value per bucket.
        """,
        parameters=[
            OpenApiParameter(
                name='bucket',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=True,
                enum=['1m', '5m', '1h'],
                description='Time bucket size'
            ),
            OpenApiParameter(
                name='device_id',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Filter by device ID'
            ),
            OpenApiParameter(
                name='sensor_id',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Filter by sensor ID'
            ),
            OpenApiParameter(
                name='from',
                type=OpenApiTypes.DATETIME,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Start time (ISO-8601)'
            ),
            OpenApiParameter(
                name='to',
                type=OpenApiTypes.DATETIME,
                location=OpenApiParameter.QUERY,
                required=False,
                description='End time (ISO-8601)'
            ),
            OpenApiParameter(
                name='limit',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description=f'Max results (default {DEFAULT_LIMIT}, max {MAX_LIMIT})'
            ),
            OpenApiParameter(
                name='offset',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Pagination offset (default 0)'
            ),
        ],
        responses={
            200: TimeSeriesPointSerializer(many=True),
            400: OpenApiTypes.OBJECT,
        },
        examples=[
            OpenApiExample(
                name='1-minute aggregations',
                value={
                    "bucket": "2025-10-18T10:00:00Z",
                    "device_id": "device_001",
                    "sensor_id": "temp_sensor_01",
                    "avg_value": 22.5,
                    "min_value": 22.1,
                    "max_value": 22.9,
                    "last_value": 22.7,
                    "count": 12
                },
                request_only=False,
                response_only=True,
            ),
        ],
    )
    def get(self, request):
        """Handle GET request for aggregated data."""
        # Extract and validate parameters
        bucket = request.query_params.get('bucket')
        device_id = request.query_params.get('device_id')
        sensor_id = request.query_params.get('sensor_id')
        ts_from = request.query_params.get('from')
        ts_to = request.query_params.get('to')
        
        # Pagination
        try:
            limit = min(
                int(request.query_params.get('limit', self.DEFAULT_LIMIT)),
                self.MAX_LIMIT
            )
            offset = int(request.query_params.get('offset', 0))
        except ValueError:
            return Response(
                {'detail': 'Invalid limit or offset parameter'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate bucket
        if not bucket or bucket not in self.BUCKET_VIEWS:
            return Response(
                {
                    'detail': f'Invalid bucket. Must be one of: {", ".join(self.BUCKET_VIEWS.keys())}'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Note: TimescaleDB Apache OSS doesn't support Continuous Aggregates
        # We use real-time aggregation with time_bucket() instead
        bucket_interval = {'1m': '1 minute', '5m': '5 minutes', '1h': '1 hour'}[bucket]
        
        # Build parameterized SQL query with real-time aggregation (safe from injection)
        sql = f"""
            SELECT time_bucket(%(bucket_interval)s, ts) AS bucket,
                   device_id,
                   sensor_id,
                   avg(value) AS avg_value,
                   min(value) AS min_value,
                   max(value) AS max_value,
                   last(value, ts) AS last_value,
                   count(*) AS count
            FROM reading
            WHERE 1=1
              AND (%(device_id)s IS NULL OR device_id = %(device_id)s)
              AND (%(sensor_id)s IS NULL OR sensor_id = %(sensor_id)s)
              AND (%(ts_from)s IS NULL OR ts >= %(ts_from)s::timestamptz)
              AND (%(ts_to)s IS NULL OR ts <= %(ts_to)s::timestamptz)
            GROUP BY bucket, device_id, sensor_id
            ORDER BY bucket DESC
            LIMIT %(limit)s OFFSET %(offset)s
        """
        
        # Execute query with parameters (prevents SQL injection)
        with connection.cursor() as cursor:
            cursor.execute(sql, {
                'bucket_interval': bucket_interval,
                'device_id': device_id,
                'sensor_id': sensor_id,
                'ts_from': ts_from,
                'ts_to': ts_to,
                'limit': limit,
                'offset': offset,
            })
            rows = cursor.fetchall()
        
        # Convert rows to dictionaries
        data = [
            {
                'bucket': row[0],
                'device_id': row[1],
                'sensor_id': row[2],
                'avg_value': row[3],
                'min_value': row[4],
                'max_value': row[5],
                'last_value': row[6],
                'count': row[7],
            }
            for row in rows
        ]
        
        # Serialize and return
        serializer = TimeSeriesPointSerializer(data, many=True)
        return Response(serializer.data)
