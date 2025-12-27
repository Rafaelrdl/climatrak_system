"""
Extended API Views for Telemetry - Device-centric endpoints.

Provides convenient endpoints for:
- Latest readings per device
- Historical data for specific devices/sensors
- Device summary with all sensors
"""
import json
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
from django.utils import timezone
from datetime import timedelta
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import Reading
from .serializers import ReadingSerializer


class LatestReadingsView(APIView):
    """
    Get latest readings for a device.
    
    Returns the most recent reading for each sensor of the specified device.
    Useful for dashboards showing current state.
    
    Query parameters:
    - sensor_id (optional): Filter by specific sensor
    """
    
    @extend_schema(
        summary="Get latest readings for device",
        description="""
        Returns the most recent reading for each sensor of the device.
        If sensor_id is provided, returns only that sensor's latest reading.
        """,
        parameters=[
            OpenApiParameter(
                name='device_id',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                required=True,
                description='Device identifier'
            ),
            OpenApiParameter(
                name='sensor_id',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Filter by specific sensor (optional)'
            ),
        ],
        responses={
            200: ReadingSerializer(many=True),
            404: OpenApiTypes.OBJECT,
        }
    )
    def get(self, request, device_id):
        """Get latest readings for device."""
        sensor_id = request.query_params.get('sensor_id')
        
        # Query para pegar última leitura de cada sensor
        # Usa DISTINCT ON do PostgreSQL para eficiência
        sql = """
            SELECT DISTINCT ON (sensor_id)
                   id, device_id, sensor_id, value, labels, ts, created_at
            FROM reading
            WHERE device_id = %s
              AND (%s IS NULL OR sensor_id = %s)
            ORDER BY sensor_id, ts DESC
        """
        
        with connection.cursor() as cursor:
            cursor.execute(sql, [device_id, sensor_id, sensor_id])
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
        
        if not rows:
            return Response(
                {'detail': 'No readings found for this device'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Converter rows para dicts
        data = [dict(zip(columns, row)) for row in rows]
        
        # Serializar
        serializer = ReadingSerializer(data, many=True)
        last_update = max(r['ts'] for r in data if r.get('ts'))
        return Response({
            'device_id': device_id,
            'timestamp': last_update.isoformat() if hasattr(last_update, 'isoformat') else last_update,
            'count': len(data),
            'readings': serializer.data
        })


class DeviceHistoryView(APIView):
    """
    Get historical readings for a device.
    
    Returns time-series data for the device, optionally filtered by sensor.
    Supports automatic aggregation for large time ranges.
    
    Query parameters:
    - sensor_id (optional): Filter by specific sensor
    - from (optional): Start time (ISO-8601)
    - to (optional): End time (ISO-8601)
    - interval (optional): Aggregation interval (1m, 5m, 1h, raw)
    - limit (optional): Max results (default 500, max 5000)
    """
    
    MAX_LIMIT = 5000
    DEFAULT_LIMIT = 500
    
    @extend_schema(
        summary="Get historical data for device",
        description="""
        Returns time-series readings for the device.
        
        Intervals:
        - raw: No aggregation (default for < 1 hour)
        - 1m: 1-minute buckets
        - 5m: 5-minute buckets
        - 1h: 1-hour buckets
        
        Auto-aggregation:
        - Range < 1h → raw
        - Range 1h-6h → 1m
        - Range 6h-24h → 5m
        - Range > 24h → 1h
        """,
        parameters=[
            OpenApiParameter(
                name='device_id',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                required=True,
                description='Device identifier'
            ),
            OpenApiParameter(
                name='sensor_id',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Filter by specific sensor'
            ),
            OpenApiParameter(
                name='from',
                type=OpenApiTypes.DATETIME,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Start time (ISO-8601, default: 24h ago)'
            ),
            OpenApiParameter(
                name='to',
                type=OpenApiTypes.DATETIME,
                location=OpenApiParameter.QUERY,
                required=False,
                description='End time (ISO-8601, default: now)'
            ),
            OpenApiParameter(
                name='interval',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                enum=['raw', '1m', '5m', '1h'],
                description='Aggregation interval (default: auto)'
            ),
            OpenApiParameter(
                name='limit',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description=f'Max results (default {DEFAULT_LIMIT}, max {MAX_LIMIT})'
            ),
        ],
        responses={
            200: OpenApiTypes.OBJECT,
            400: OpenApiTypes.OBJECT,
        }
    )
    def get(self, request, device_id):
        """Get historical data for device."""
        # Parse parameters
        # Support multiple sensor_id via getlist (e.g., ?sensor_id=1&sensor_id=2)
        sensor_ids = request.query_params.getlist('sensor_id')
        if not sensor_ids:
            # Fallback to single sensor_id parameter
            single_sensor = request.query_params.get('sensor_id')
            sensor_ids = [single_sensor] if single_sensor else []
        
        from_str = request.query_params.get('from')
        to_str = request.query_params.get('to')
        interval = request.query_params.get('interval', 'auto')
        
        # Default time range: last 24 hours
        now = timezone.now()
        ts_to = timezone.datetime.fromisoformat(to_str.replace('Z', '+00:00')) if to_str else now
        ts_from = timezone.datetime.fromisoformat(from_str.replace('Z', '+00:00')) if from_str else (now - timedelta(hours=24))
        
        # Validate time range
        if ts_from >= ts_to:
            return Response(
                {'detail': 'Invalid time range: from must be before to'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Auto-select interval based on time range
        if interval == 'auto':
            time_diff = ts_to - ts_from
            if time_diff <= timedelta(hours=1):
                interval = 'raw'
            elif time_diff <= timedelta(hours=6):
                interval = '1m'
            elif time_diff <= timedelta(hours=24):
                interval = '5m'
            else:
                interval = '1h'
        
        # Limit
        try:
            limit = min(
                int(request.query_params.get('limit', self.DEFAULT_LIMIT)),
                self.MAX_LIMIT
            )
        except ValueError:
            return Response(
                {'detail': 'Invalid limit parameter'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Build query with multi-sensor support
        if interval == 'raw':
            # No aggregation - ORDER BY ASC for chronological charts
            if sensor_ids:
                # Filter by specific sensors
                placeholders = ','.join(['%s'] * len(sensor_ids))
                sql = f"""
                    SELECT ts, sensor_id, value
                    FROM reading
                    WHERE device_id = %s
                      AND sensor_id IN ({placeholders})
                      AND ts >= %s
                      AND ts <= %s
                    ORDER BY ts ASC
                    LIMIT %s
                """
                params = [device_id] + sensor_ids + [ts_from, ts_to, limit]
            else:
                # All sensors
                sql = """
                    SELECT ts, sensor_id, value
                    FROM reading
                    WHERE device_id = %s
                      AND ts >= %s
                      AND ts <= %s
                    ORDER BY ts ASC
                    LIMIT %s
                """
                params = [device_id, ts_from, ts_to, limit]
        else:
            # With aggregation - ORDER BY ASC for chronological charts
            bucket_interval = {'1m': '1 minute', '5m': '5 minutes', '1h': '1 hour'}[interval]
            
            if sensor_ids:
                # Filter by specific sensors
                placeholders = ','.join(['%s'] * len(sensor_ids))
                sql = f"""
                    SELECT time_bucket(%(bucket_interval)s, ts) AS bucket,
                           sensor_id,
                           avg(value) AS avg_value,
                           min(value) AS min_value,
                           max(value) AS max_value,
                           last(value, ts) AS last_value,
                           count(*) AS count
                    FROM reading
                    WHERE device_id = %(device_id)s
                      AND sensor_id IN ({placeholders})
                      AND ts >= %(ts_from)s
                      AND ts <= %(ts_to)s
                    GROUP BY bucket, sensor_id
                    ORDER BY bucket ASC
                    LIMIT %(limit)s
                """
                # Use named params for aggregation
                params = {
                    'bucket_interval': bucket_interval,
                    'device_id': device_id,
                    'ts_from': ts_from,
                    'ts_to': ts_to,
                    'limit': limit
                }
                # Convert to positional for IN clause
                sql_positional = sql.replace('%(bucket_interval)s', f"'{bucket_interval}'")
                sql_positional = sql_positional.replace('%(device_id)s', '%s')
                sql_positional = sql_positional.replace('%(ts_from)s', '%s')
                sql_positional = sql_positional.replace('%(ts_to)s', '%s')
                sql_positional = sql_positional.replace('%(limit)s', '%s')
                sql = sql_positional
                params = [device_id] + sensor_ids + [ts_from, ts_to, limit]
            else:
                # All sensors
                sql = f"""
                    SELECT time_bucket(%(bucket_interval)s, ts) AS bucket,
                           sensor_id,
                           avg(value) AS avg_value,
                           min(value) AS min_value,
                           max(value) AS max_value,
                           last(value, ts) AS last_value,
                           count(*) AS count
                    FROM reading
                    WHERE device_id = %(device_id)s
                      AND ts >= %(ts_from)s
                      AND ts <= %(ts_to)s
                    GROUP BY bucket, sensor_id
                    ORDER BY bucket ASC
                    LIMIT %(limit)s
                """
                params = {
                    'bucket_interval': bucket_interval,
                    'device_id': device_id,
                    'ts_from': ts_from,
                    'ts_to': ts_to,
                    'limit': limit
                }
        
        # Execute query
        with connection.cursor() as cursor:
            if interval == 'raw':
                cursor.execute(sql, params)
            else:
                cursor.execute(sql, params)
            
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
        
        # Convert to dicts
        data = [dict(zip(columns, row)) for row in rows]
        
        return Response({
            'device_id': device_id,
            'sensor_ids': sensor_ids if sensor_ids else None,  # Return list of requested sensors
            'interval': interval,
            'from': ts_from.isoformat(),
            'to': ts_to.isoformat(),
            'count': len(data),
            'data': data
        })


class DeviceSummaryView(APIView):
    """
    Get summary of device with all sensors.
    
    Returns:
    - Device status (online/offline based on last reading)
    - List of all sensors with their latest readings
    - Statistics (total readings in last 24h, avg interval)
    """
    
    @extend_schema(
        summary="Get device summary",
        description="""
        Returns comprehensive summary of device:
        - Status (online if reading < 5 minutes old)
        - All sensors with latest readings
        - 24-hour statistics
        """,
        parameters=[
            OpenApiParameter(
                name='device_id',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                required=True,
                description='Device identifier'
            ),
        ],
        responses={
            200: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
        }
    )
    def get(self, request, device_id):
        """Get device summary."""
        now = timezone.now()
        online_threshold = now - timedelta(minutes=5)
        stats_window = now - timedelta(hours=24)
        
        # Get latest reading per sensor
        sql_latest = """
            SELECT DISTINCT ON (sensor_id)
                   sensor_id,
                   value,
                   labels,
                   ts
            FROM reading
            WHERE device_id = %s
            ORDER BY sensor_id, ts DESC
        """
        
        # Get 24h statistics
        sql_stats = """
            SELECT COUNT(*) as total_readings,
                   COUNT(DISTINCT sensor_id) as sensor_count,
                   EXTRACT(EPOCH FROM (MAX(ts) - MIN(ts))) / NULLIF(COUNT(*), 0) as avg_interval_seconds
            FROM reading
            WHERE device_id = %s
              AND ts >= %s
        """
        
        with connection.cursor() as cursor:
            # Latest readings
            cursor.execute(sql_latest, [device_id])
            latest_columns = [col[0] for col in cursor.description]
            latest_rows = cursor.fetchall()
            
            if not latest_rows:
                return Response(
                    {'detail': 'Device not found or no readings'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Statistics
            cursor.execute(sql_stats, [device_id, stats_window])
            stats_row = cursor.fetchone()
            
            # 🔧 Executar consulta de stats por sensor DENTRO do contexto
            stats_24h_sql = """
                SELECT 
                    sensor_id,
                    AVG(value) as avg_value,
                    MIN(value) as min_value,
                    MAX(value) as max_value,
                    STDDEV(value) as stddev_value,
                    COUNT(*) as count
                FROM reading
                WHERE device_id = %s
                  AND ts >= %s
                GROUP BY sensor_id
            """
            cursor.execute(stats_24h_sql, [device_id, stats_window])
            stats_24h_rows = cursor.fetchall()
            stats_24h_columns = [desc[0] for desc in cursor.description]
        
        # Convert to dicts
        sensors = []
        last_seen = None
        
        for row in latest_rows:
            reading_data = dict(zip(latest_columns, row))
            reading_ts = reading_data['ts']
            
            if last_seen is None or reading_ts > last_seen:
                last_seen = reading_ts
            
            # Parse labels (pode ser string JSON ou dict)
            labels = reading_data.get('labels', {})
            if isinstance(labels, str):
                try:
                    labels = json.loads(labels)
                except (json.JSONDecodeError, TypeError):
                    labels = {}
            
            # Determinar status: online se última leitura foi dentro do threshold
            is_online = reading_ts >= online_threshold
            
            sensors.append({
                'sensor_id': reading_data['sensor_id'],
                'sensor_name': reading_data['sensor_id'],  # Por enquanto usa o ID como nome
                'sensor_type': labels.get('type', 'unknown') if isinstance(labels, dict) else 'unknown',
                'unit': labels.get('unit', '') if isinstance(labels, dict) else '',
                'is_online': is_online,
                'last_value': reading_data['value'],
                'last_reading_at': reading_ts.isoformat(),
                'statistics_24h': None,  # Will be filled below with SQL aggregates
            })
        
        # 🔧 stats_24h_rows já foi executada dentro do contexto do cursor acima
        # Build stats dict by sensor_id
        stats_by_sensor = {}
        for row in stats_24h_rows:
            stats_dict = dict(zip(stats_24h_columns, row))
            stats_by_sensor[stats_dict['sensor_id']] = {
                'avg': float(stats_dict['avg_value']) if stats_dict['avg_value'] is not None else None,
                'min': float(stats_dict['min_value']) if stats_dict['min_value'] is not None else None,
                'max': float(stats_dict['max_value']) if stats_dict['max_value'] is not None else None,
                'stddev': float(stats_dict['stddev_value']) if stats_dict['stddev_value'] is not None else None,
                'count': int(stats_dict['count']) if stats_dict['count'] is not None else 0,
            }
        
        # Attach statistics to sensors
        for sensor in sensors:
            sensor_id = sensor['sensor_id']
            sensor['statistics_24h'] = stats_by_sensor.get(sensor_id, {
                'avg': None,
                'min': None,
                'max': None,
                'stddev': None,
                'count': 0,
            })
        
        # Device status (uppercase for frontend compatibility)
        device_status = 'ONLINE' if last_seen >= online_threshold else 'OFFLINE'
        sensors_online = sum(1 for sensor in sensors if sensor.get('is_online'))
        sensors_total = len(sensors)
        
        # Format statistics
        total_readings, sensor_count, avg_interval = stats_row
        avg_readings_per_hour = round((total_readings or 0) / 24, 2) if total_readings else 0
        
        # Tratar avg_interval None (pode acontecer com NULLIF ou sem leituras)
        avg_interval_seconds = float(avg_interval) if avg_interval is not None else None
        avg_interval_str = f"{int(avg_interval)}s" if avg_interval is not None else 'N/A'
        
        statistics = {
            'total_readings_24h': total_readings or 0,
            'sensor_count': sensor_count or sensors_total,
            'avg_interval': avg_interval_str,
            'avg_interval_seconds': avg_interval_seconds,
            'avg_readings_per_hour': avg_readings_per_hour,
            'sensors_total': sensors_total,
            'sensors_online': sensors_online,
        }
        
        # DEBUG: Log response antes de retornar
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"📊 Summary response for {device_id}: {len(sensors)} sensors")
        if sensors:
            logger.info(f"📊 First sensor example: {sensors[0]}")
        
        return Response({
            'device_id': device_id,
            'status': device_status,
            'last_seen': last_seen.isoformat() if last_seen else None,
            'sensors': sensors,
            'statistics': statistics
        })


class AssetTelemetryHistoryView(APIView):
    """
    Get historical telemetry data for an asset using asset_tag from MQTT topic.
    
    This is the preferred method as it uses the source of truth (MQTT topic hierarchy)
    instead of device_mqtt_client_id which may be empty or incorrect.
    
    Query parameters:
    - from: Start timestamp (ISO 8601)
    - to: End timestamp (ISO 8601)
    - sensor_id: Filter by specific sensor(s) (can be multiple)
    - interval: Aggregation level (raw, 1m, 5m, 1h, auto)
    """
    
    @extend_schema(
        summary="Get asset telemetry history by asset_tag",
        description="""
        Returns historical telemetry data for an asset using the asset_tag extracted
        from MQTT topic hierarchy. This is more reliable than device_id.
        
        Example: GET /api/telemetry/assets/CHILLER-001/history/?from=2025-11-01T00:00:00Z&to=2025-11-02T00:00:00Z
        """,
        parameters=[
            OpenApiParameter(
                name='asset_tag',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                required=True,
                description='Asset identifier (e.g., CHILLER-001)'
            ),
            OpenApiParameter(
                name='from',
                type=OpenApiTypes.DATETIME,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Start timestamp (defaults to 24h ago)'
            ),
            OpenApiParameter(
                name='to',
                type=OpenApiTypes.DATETIME,
                location=OpenApiParameter.QUERY,
                required=False,
                description='End timestamp (defaults to now)'
            ),
            OpenApiParameter(
                name='sensor_id',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Filter by sensor(s) - can be multiple'
            ),
            OpenApiParameter(
                name='interval',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Aggregation interval: raw, 1m, 5m, 15m, 1h, auto (default)'
            ),
        ],
        responses={
            200: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
        }
    )
    def get(self, request, asset_tag):
        """Get historical telemetry for asset."""
        import logging
        from dateutil import parser
        
        logger = logging.getLogger(__name__)
        
        # Parse query parameters
        from_str = request.query_params.get('from')
        to_str = request.query_params.get('to')
        sensor_ids = request.query_params.getlist('sensor_id')
        interval = request.query_params.get('interval', 'auto')
        
        # Parse timestamps
        try:
            ts_to = parser.isoparse(to_str) if to_str else timezone.now()
            ts_from = parser.isoparse(from_str) if from_str else ts_to - timedelta(hours=24)
        except (ValueError, TypeError) as e:
            return Response(
                {'error': f'Invalid timestamp format: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ensure timestamps are aware
        if timezone.is_naive(ts_from):
            ts_from = timezone.make_aware(ts_from)
        if timezone.is_naive(ts_to):
            ts_to = timezone.make_aware(ts_to)
        
        # Calculate time range and determine interval
        time_range_hours = (ts_to - ts_from).total_seconds() / 3600
        
        if interval == 'auto':
            if time_range_hours < 1:
                interval = 'raw'
            elif time_range_hours <= 6:
                interval = '1m'
            elif time_range_hours <= 24:
                interval = '5m'
            else:
                interval = '1h'
        
        logger.info(
            f"📊 Fetching telemetry for asset {asset_tag}: "
            f"from={ts_from.isoformat()}, to={ts_to.isoformat()}, "
            f"interval={interval}, sensors={sensor_ids or 'all'}"
        )
        
        # Build query
        queryset = Reading.objects.filter(
            asset_tag=asset_tag,
            ts__gte=ts_from,
            ts__lte=ts_to
        )
        
        if sensor_ids:
            queryset = queryset.filter(sensor_id__in=sensor_ids)
        
        # 🔧 PERFORMANCE FIX: Add pagination to prevent memory issues with large datasets
        # Limit results to prevent killing worker with month+ of raw data
        MAX_RAW_RESULTS = 10000  # ~10k readings max for raw data
        MAX_AGG_RESULTS = 2000   # ~2k buckets max for aggregated data
        
        # Get data
        if interval == 'raw':
            # Return raw data with limit
            queryset = queryset.order_by('sensor_id', 'ts')[:MAX_RAW_RESULTS]
            data = list(queryset.values('sensor_id', 'ts', 'value'))
            
            # Format for frontend
            result = []
            for reading in data:
                result.append({
                    'sensor_id': reading['sensor_id'],
                    'ts': reading['ts'].isoformat(),
                    'value': reading['value']
                })
            
            # Warn if limit was reached
            if len(result) >= MAX_RAW_RESULTS:
                return Response({
                    'data': result,
                    'warning': f'Result truncated to {MAX_RAW_RESULTS} readings. Use aggregation intervals (1m, 5m, 15m, 1h) for larger time ranges.',
                    'truncated': True,
                    'limit': MAX_RAW_RESULTS
                }, status=status.HTTP_200_OK)
        else:
            # Aggregate data using time_bucket with limit
            interval_map = {
                '1m': '1 minute',
                '5m': '5 minutes',
                '15m': '15 minutes',
                '1h': '1 hour',
            }
            bucket_interval = interval_map.get(interval, '5 minutes')
            
            sql = """
                SELECT 
                    sensor_id,
                    time_bucket(%s::interval, ts) AS bucket,
                    AVG(value) AS avg_value,
                    MIN(value) AS min_value,
                    MAX(value) AS max_value,
                    COUNT(*) AS count
                FROM reading
                WHERE asset_tag = %s
                  AND ts >= %s
                  AND ts <= %s
                  AND (%s IS NULL OR sensor_id = ANY(%s))
                GROUP BY sensor_id, bucket
                ORDER BY sensor_id, bucket
                LIMIT %s
            """
            
            with connection.cursor() as cursor:
                cursor.execute(sql, [
                    bucket_interval,
                    asset_tag,
                    ts_from,
                    ts_to,
                    None if not sensor_ids else sensor_ids,
                    sensor_ids or [],
                    MAX_AGG_RESULTS  # Add limit to query
                ])
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
            
            result = []
            for row in rows:
                row_dict = dict(zip(columns, row))
                result.append({
                    'sensor_id': row_dict['sensor_id'],
                    'ts': row_dict['bucket'].isoformat() if hasattr(row_dict['bucket'], 'isoformat') else row_dict['bucket'],
                    'avg_value': float(row_dict['avg_value']) if row_dict['avg_value'] is not None else None,
                    'min_value': float(row_dict['min_value']) if row_dict['min_value'] is not None else None,
                    'max_value': float(row_dict['max_value']) if row_dict['max_value'] is not None else None,
                    'count': row_dict['count']
                })
            
            # Warn if limit was reached for aggregated data
            if len(result) >= MAX_AGG_RESULTS:
                return Response({
                    'data': result,
                    'warning': f'Result truncated to {MAX_AGG_RESULTS} buckets. Use coarser intervals (15m, 1h) for larger time ranges.',
                    'truncated': True,
                    'limit': MAX_AGG_RESULTS
                }, status=status.HTTP_200_OK)
        
        logger.info(f"✅ Found {len(result)} data points for asset {asset_tag}")
        
        return Response({
            'asset_tag': asset_tag,
            'from': ts_from.isoformat(),
            'to': ts_to.isoformat(),
            'interval': interval,
            'count': len(result),
            'data': result
        })
