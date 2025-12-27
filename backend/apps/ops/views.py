"""
Control Center views - staff-only telemetry monitoring.

All views require staff authentication and run on the public schema.
Uses schema_context to query tenant-specific data while maintaining isolation.

References:
- @staff_member_required: https://docs.djangoproject.com/en/5.2/topics/auth/default/
- schema_context: https://django-tenants.readthedocs.io/en/latest/use.html
- CSRF protection: https://docs.djangoproject.com/en/5.2/howto/csrf/
"""
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render, get_object_or_404, redirect
from django.http import HttpResponseBadRequest, HttpResponse, JsonResponse
from django.db import connection
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from django_tenants.utils import schema_context, get_tenant_model
from django.contrib import messages
from celery.result import AsyncResult
import csv
import datetime as dt
from decimal import Decimal
import time

from .forms import TelemetryFilterForm
from .models import ExportJob, AuditLog
from .tasks import export_telemetry_async
from .decorators import audit_action
from .utils import get_cached_tenants


@staff_member_required
@require_http_methods(["GET"])
def index(request):
    """
    Control Center home - tenant selector and filter form.
    
    Displays list of all tenants for selection and telemetry filter options.
    Staff-only access enforced by @staff_member_required decorator.
    
    Uses Redis cache for tenant list (5min TTL) for better performance.
    """
    # Get tenants from cache (auto-populated on cache miss)
    tenants = get_cached_tenants()
    
    form = TelemetryFilterForm()
    
    return render(request, "ops/home.html", {
        "tenants": tenants,
        "form": form,
        "current_schema": getattr(connection, "schema_name", None),
    })


@staff_member_required
@require_http_methods(["GET"])
def telemetry_list(request):
    """
    List aggregated telemetry data for selected tenant.
    
    Uses schema_context to query continuous aggregates (reading_1m/5m/1h)
    from the tenant's schema. Supports filtering by device_id, sensor_id,
    and time range.
    
    Query parameters:
    - tenant_slug (required): Tenant to query
    - device_id (optional): Filter by device
    - sensor_id (optional): Filter by sensor
    - from (optional): ISO-8601 timestamp for start
    - to (optional): ISO-8601 timestamp for end
    - bucket (optional): 1m, 5m, or 1h (default: 1m)
    - limit (optional): Results per page (default: 200, max: 1000)
    - offset (optional): Pagination offset (default: 0)
    """
    form = TelemetryFilterForm(request.GET)
    
    if not form.is_valid():
        return HttpResponseBadRequest(f"Invalid parameters: {form.errors}")
    
    cleaned = form.cleaned_data
    tenant_slug = cleaned['tenant_slug']
    device_id = cleaned.get('device_id')
    sensor_id = cleaned.get('sensor_id')
    ts_from = cleaned.get('from_timestamp')
    ts_to = cleaned.get('to_timestamp')
    bucket = cleaned.get('bucket') or '1m'
    limit = cleaned.get('limit') or 200
    offset = cleaned.get('offset') or 0
    
    # Get tenant object
    Tenant = get_tenant_model()
    try:
        tenant = Tenant.objects.get(slug=tenant_slug)
    except Tenant.DoesNotExist:
        return HttpResponseBadRequest(f"Tenant '{tenant_slug}' not found")
    
    # Query aggregated data using schema_context
    # This ensures proper isolation by executing in the tenant's schema
    data = []
    total_count = 0
    
    with schema_context(tenant.schema_name):
        # Note: Since we're using real-time aggregation (no materialized CAs),
        # we'll query the reading table directly with time_bucket
        sql = """
            SELECT 
                time_bucket(%(bucket_interval)s, ts) AS bucket,
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
        
        # Map bucket to SQL interval
        bucket_intervals = {
            '1m': '1 minute',
            '5m': '5 minutes',
            '1h': '1 hour',
        }
        
        params = {
            'bucket_interval': bucket_intervals[bucket],
            'device_id': device_id or None,
            'sensor_id': sensor_id or None,
            'ts_from': ts_from or None,
            'ts_to': ts_to or None,
            'limit': limit,
            'offset': offset,
        }
        
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            
            for row in rows:
                data.append({
                    'bucket': row[0],
                    'device_id': row[1],
                    'sensor_id': row[2],
                    'avg': float(row[3]) if row[3] is not None else None,
                    'min': float(row[4]) if row[4] is not None else None,
                    'max': float(row[5]) if row[5] is not None else None,
                    'last': float(row[6]) if row[6] is not None else None,
                    'count': row[7],
                })
            
            # Get total count for pagination (approximate)
            # For exact count on large datasets, this could be expensive
            # Consider using approximate count or cached value in production
            count_sql = """
                SELECT count(DISTINCT time_bucket(%(bucket_interval)s, ts))
                FROM reading
                WHERE 1=1
                  AND (%(device_id)s IS NULL OR device_id = %(device_id)s)
                  AND (%(sensor_id)s IS NULL OR sensor_id = %(sensor_id)s)
                  AND (%(ts_from)s IS NULL OR ts >= %(ts_from)s::timestamptz)
                  AND (%(ts_to)s IS NULL OR ts <= %(ts_to)s::timestamptz)
            """
            cursor.execute(count_sql, params)
            total_count = cursor.fetchone()[0] or 0
    
    # Pagination info
    has_next = (offset + limit) < total_count
    has_prev = offset > 0
    next_offset = offset + limit if has_next else None
    prev_offset = max(0, offset - limit) if has_prev else None
    
    context = {
        'results': data,
        'tenant': tenant,
        'tenant_slug': tenant_slug,
        'bucket': bucket,
        'device_id': device_id,
        'sensor_id': sensor_id,
        'from_timestamp': ts_from,
        'to_timestamp': ts_to,
        'limit': limit,
        'offset': offset,
        'total_count': total_count,
        'has_next': has_next,
        'has_prev': has_prev,
        'next_offset': next_offset,
        'prev_offset': prev_offset,
        'form': form,
    }
    
    return render(request, "ops/telemetry_list.html", context)


@staff_member_required
@require_http_methods(["GET"])
def telemetry_drilldown(request):
    """
    Drill-down view showing raw readings for a specific sensor.
    
    Uses schema_context to query the reading table directly for detailed
    inspection. Shows last N raw readings (default 500, max 1000).
    
    Query parameters:
    - tenant_slug (required): Tenant to query
    - sensor_id (required): Sensor to inspect
    - device_id (optional): Filter by device
    - limit (optional): Number of readings (default: 500, max: 1000)
    """
    tenant_slug = request.GET.get('tenant_slug')
    sensor_id = request.GET.get('sensor_id')
    device_id = request.GET.get('device_id')
    
    # Parse limit with fallback to 500, max 1000
    try:
        limit = int(request.GET.get('limit', 500))
        limit = min(max(limit, 1), 1000)  # Clamp between 1 and 1000
    except (ValueError, TypeError):
        limit = 500
    
    if not (tenant_slug and sensor_id):
        return HttpResponseBadRequest("tenant_slug and sensor_id are required")
    
    # Get tenant object
    Tenant = get_tenant_model()
    try:
        tenant = Tenant.objects.get(slug=tenant_slug)
    except Tenant.DoesNotExist:
        return HttpResponseBadRequest(f"Tenant '{tenant_slug}' not found")
    
    # Query raw readings using schema_context
    points = []
    stats = {}
    
    with schema_context(tenant.schema_name):
        # Get raw readings
        sql = """
            SELECT ts, device_id, sensor_id, value, labels
            FROM reading
            WHERE sensor_id = %(sensor_id)s
              AND (%(device_id)s IS NULL OR device_id = %(device_id)s)
            ORDER BY ts DESC
            LIMIT %(limit)s
        """
        
        params = {
            'sensor_id': sensor_id,
            'device_id': device_id or None,
            'limit': limit,
        }
        
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            
            for row in rows:
                points.append({
                    'ts': row[0],
                    'device_id': row[1],
                    'sensor_id': row[2],
                    'value': float(row[3]) if row[3] is not None else None,
                    'labels': row[4],
                })
            
            # Get basic statistics
            stats_sql = """
                SELECT 
                    count(*) as total_count,
                    avg(value) as avg_value,
                    min(value) as min_value,
                    max(value) as max_value,
                    min(ts) as earliest_ts,
                    max(ts) as latest_ts
                FROM reading
                WHERE sensor_id = %(sensor_id)s
                  AND (%(device_id)s IS NULL OR device_id = %(device_id)s)
            """
            
            cursor.execute(stats_sql, params)
            stats_row = cursor.fetchone()
            
            if stats_row:
                stats = {
                    'total_count': stats_row[0],
                    'avg_value': float(stats_row[1]) if stats_row[1] is not None else None,
                    'min_value': float(stats_row[2]) if stats_row[2] is not None else None,
                    'max_value': float(stats_row[3]) if stats_row[3] is not None else None,
                    'earliest_ts': stats_row[4],
                    'latest_ts': stats_row[5],
                }
    
    context = {
        'tenant': tenant,
        'tenant_slug': tenant_slug,
        'sensor_id': sensor_id,
        'device_id': device_id,
        'points': points,
        'stats': stats,
        'limit': limit,
    }
    
    return render(request, "ops/telemetry_drilldown.html", context)


@staff_member_required
@require_http_methods(["POST"])
def telemetry_export_csv(request):
    """
    Export telemetry data as CSV.
    
    POST-only to enforce CSRF protection. Uses same filters as telemetry_list.
    
    POST parameters: Same as telemetry_list GET parameters
    """
    form = TelemetryFilterForm(request.POST)
    
    if not form.is_valid():
        return HttpResponseBadRequest(f"Invalid parameters: {form.errors}")
    
    cleaned = form.cleaned_data
    tenant_slug = cleaned['tenant_slug']
    device_id = cleaned.get('device_id')
    sensor_id = cleaned.get('sensor_id')
    ts_from = cleaned.get('from_timestamp')
    ts_to = cleaned.get('to_timestamp')
    bucket = cleaned.get('bucket') or '1m'
    limit = min(cleaned.get('limit') or 1000, 10000)  # Max 10k for CSV
    
    # Get tenant object
    Tenant = get_tenant_model()
    try:
        tenant = Tenant.objects.get(slug=tenant_slug)
    except Tenant.DoesNotExist:
        return HttpResponseBadRequest(f"Tenant '{tenant_slug}' not found")
    
    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="telemetry_{tenant_slug}_{dt.datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
    
    writer = csv.writer(response)
    writer.writerow(['bucket', 'device_id', 'sensor_id', 'avg', 'min', 'max', 'last', 'count'])
    
    # Query data using schema_context
    with schema_context(tenant.schema_name):
        sql = """
            SELECT 
                time_bucket(%(bucket_interval)s, ts) AS bucket,
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
            LIMIT %(limit)s
        """
        
        bucket_intervals = {
            '1m': '1 minute',
            '5m': '5 minutes',
            '1h': '1 hour',
        }
        
        params = {
            'bucket_interval': bucket_intervals[bucket],
            'device_id': device_id or None,
            'sensor_id': sensor_id or None,
            'ts_from': ts_from or None,
            'ts_to': ts_to or None,
            'limit': limit,
        }
        
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            
            for row in rows:
                writer.writerow([
                    row[0].isoformat() if row[0] else '',
                    row[1] or '',
                    row[2] or '',
                    f"{row[3]:.2f}" if row[3] is not None else '',
                    f"{row[4]:.2f}" if row[4] is not None else '',
                    f"{row[5]:.2f}" if row[5] is not None else '',
                    f"{row[6]:.2f}" if row[6] is not None else '',
                    row[7] or 0,
                ])
    
    return response


@staff_member_required
@require_http_methods(["GET"])
def telemetry_dashboard(request):
    """
    Dashboard view with interactive charts for telemetry visualization.
    
    Displays time-series charts for selected sensors with Chart.js.
    Supports multiple sensors comparison on the same chart.
    
    Uses Redis cache for tenant list (5min TTL) for better performance.
    
    Query parameters:
    - tenant_slug (required): Tenant to query
    - sensor_ids (optional): Comma-separated sensor IDs
    - from_timestamp (optional): ISO-8601 start time
    - to_timestamp (optional): ISO-8601 end time
    - bucket (optional): Aggregation interval (1m, 5m, 1h, default: 5m)
    """
    # Get tenants from cache
    tenants = get_cached_tenants()
    
    tenant_slug = request.GET.get('tenant_slug')
    sensor_ids_param = request.GET.get('sensor_ids', '')
    sensor_ids = [s.strip() for s in sensor_ids_param.split(',') if s.strip()]
    from_ts = request.GET.get('from_timestamp')
    to_ts = request.GET.get('to_timestamp')
    bucket = request.GET.get('bucket', '5m')
    
    context = {
        'tenants': tenants,
        'tenant_slug': tenant_slug,
        'sensor_ids': sensor_ids,
        'sensor_ids_param': sensor_ids_param,
        'from_timestamp': from_ts,
        'to_timestamp': to_ts,
        'bucket': bucket,
        'current_schema': getattr(connection, "schema_name", None),
    }
    
    # Get available sensors if tenant is selected
    if tenant_slug:
        Tenant = get_tenant_model()
        try:
            tenant = Tenant.objects.get(slug=tenant_slug)
            context['tenant'] = tenant
            
            # Get list of available sensors in this tenant
            with schema_context(tenant.schema_name):
                sql = """
                    SELECT DISTINCT sensor_id
                    FROM reading
                    ORDER BY sensor_id
                    LIMIT 50
                """
                with connection.cursor() as cursor:
                    cursor.execute(sql)
                    available_sensors = [row[0] for row in cursor.fetchall()]
                context['available_sensors'] = available_sensors
        except Tenant.DoesNotExist:
            pass
    
    return render(request, "ops/dashboard.html", context)


@staff_member_required
@require_http_methods(["GET"])
def chart_data_api(request):
    """
    API endpoint to fetch chart data in JSON format for Chart.js.
    
    Returns aggregated telemetry data for the specified sensors.
    
    Query parameters:
    - tenant_slug (required): Tenant to query
    - sensor_ids (required): Comma-separated sensor IDs
    - from_timestamp (optional): ISO-8601 start time
    - to_timestamp (optional): ISO-8601 end time
    - bucket (optional): Aggregation interval (1m, 5m, 1h, default: 5m)
    - limit (optional): Max data points per sensor (default: 500, max: 1000)
    """
    tenant_slug = request.GET.get('tenant_slug')
    sensor_ids_param = request.GET.get('sensor_ids', '')
    sensor_ids = [s.strip() for s in sensor_ids_param.split(',') if s.strip()]
    from_ts = request.GET.get('from_timestamp')
    to_ts = request.GET.get('to_timestamp')
    bucket = request.GET.get('bucket', '5m')
    
    try:
        limit = int(request.GET.get('limit', 500))
        limit = min(max(limit, 1), 1000)  # Clamp between 1-1000
    except (ValueError, TypeError):
        limit = 500
    
    if not (tenant_slug and sensor_ids):
        return JsonResponse({
            'error': 'tenant_slug and sensor_ids are required'
        }, status=400)
    
    # Limit to 10 sensors max for performance
    if len(sensor_ids) > 10:
        return JsonResponse({
            'error': 'Maximum 10 sensors allowed'
        }, status=400)
    
    # Get tenant
    Tenant = get_tenant_model()
    try:
        tenant = Tenant.objects.get(slug=tenant_slug)
    except Tenant.DoesNotExist:
        return JsonResponse({
            'error': f"Tenant '{tenant_slug}' not found"
        }, status=404)
    
    # Bucket intervals
    bucket_intervals = {
        '1m': '1 minute',
        '5m': '5 minutes',
        '1h': '1 hour',
    }
    
    if bucket not in bucket_intervals:
        bucket = '5m'
    
    # Query data for each sensor
    datasets = []
    
    with schema_context(tenant.schema_name):
        for sensor_id in sensor_ids:
            sql = """
                SELECT 
                    time_bucket(%(bucket_interval)s, ts) AS bucket,
                    avg(value) AS avg_value,
                    min(value) AS min_value,
                    max(value) AS max_value,
                    count(*) AS count
                FROM reading
                WHERE sensor_id = %(sensor_id)s
                  AND (%(ts_from)s IS NULL OR ts >= %(ts_from)s::timestamptz)
                  AND (%(ts_to)s IS NULL OR ts <= %(ts_to)s::timestamptz)
                GROUP BY bucket
                ORDER BY bucket ASC
                LIMIT %(limit)s
            """
            
            params = {
                'bucket_interval': bucket_intervals[bucket],
                'sensor_id': sensor_id,
                'ts_from': from_ts or None,
                'ts_to': to_ts or None,
                'limit': limit,
            }
            
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                
                # Format data for Chart.js
                data_points = []
                for row in rows:
                    data_points.append({
                        'x': row[0].isoformat() if row[0] else None,
                        'y': float(row[1]) if row[1] is not None else None,
                        'min': float(row[2]) if row[2] is not None else None,
                        'max': float(row[3]) if row[3] is not None else None,
                        'count': row[4] or 0,
                    })
                
                datasets.append({
                    'label': sensor_id,
                    'data': data_points,
                    'sensor_id': sensor_id,
                })
    
    return JsonResponse({
        'tenant': {
            'slug': tenant.slug,
            'name': tenant.name,
        },
        'bucket': bucket,
        'from_timestamp': from_ts,
        'to_timestamp': to_ts,
        'datasets': datasets,
    })


# =============================================================================
# EXPORT VIEWS (Async with Celery)
# =============================================================================

@staff_member_required
@require_http_methods(["GET"])
def export_list(request):
    """
    List all export jobs for current user.
    Shows status, download links, and allows creating new exports.
    
    Uses Redis cache for tenant list (5min TTL) for better performance.
    """
    from .models import ExportJob
    
    # Get jobs for current user (or all if superuser)
    if request.user.is_superuser:
        jobs = ExportJob.objects.all()
    else:
        jobs = ExportJob.objects.filter(user=request.user)
    
    jobs = jobs.select_related('user').order_by('-created_at')[:50]
    
    # Get tenants from cache for new export form
    tenants = get_cached_tenants()
    
    return render(request, "ops/export_list.html", {
        "jobs": jobs,
        "tenants": tenants,
    })


@staff_member_required
@require_http_methods(["POST"])
def export_request(request):
    """
    Create a new async export job.
    Queues a Celery task and redirects to export list.
    """
    from .models import ExportJob
    from .tasks import export_telemetry_async
    from django.utils import timezone
    from django.shortcuts import redirect
    from django.contrib import messages
    
    # Get parameters
    tenant_slug = request.POST.get('tenant_slug', '').strip()
    sensor_id = request.POST.get('sensor_id', '').strip()
    from_timestamp = request.POST.get('from_timestamp', '').strip()
    to_timestamp = request.POST.get('to_timestamp', '').strip()
    
    if not tenant_slug:
        messages.error(request, 'Tenant é obrigatório')
        return redirect('ops:export_list')
    
    # Validate tenant
    Tenant = get_tenant_model()
    try:
        tenant = Tenant.objects.get(slug=tenant_slug)
    except Tenant.DoesNotExist:
        messages.error(request, f'Tenant "{tenant_slug}" não encontrado')
        return redirect('ops:export_list')
    
    # Parse timestamps
    from_ts = None
    to_ts = None
    
    if from_timestamp:
        try:
            from_ts = timezone.datetime.fromisoformat(from_timestamp.replace('Z', '+00:00'))
            if timezone.is_naive(from_ts):
                from_ts = timezone.make_aware(from_ts)
        except (ValueError, TypeError):
            messages.error(request, 'Data inicial inválida')
            return redirect('ops:export_list')
    
    if to_timestamp:
        try:
            to_ts = timezone.datetime.fromisoformat(to_timestamp.replace('Z', '+00:00'))
            if timezone.is_naive(to_ts):
                to_ts = timezone.make_aware(to_ts)
        except (ValueError, TypeError):
            messages.error(request, 'Data final inválida')
            return redirect('ops:export_list')
    
    # Create job
    job = ExportJob.objects.create(
        user=request.user,
        tenant_slug=tenant.slug,
        tenant_name=tenant.name,
        sensor_id=sensor_id,
        from_timestamp=from_ts,
        to_timestamp=to_ts,
    )
    
    # Queue Celery task
    task = export_telemetry_async.delay(job.pk)
    job.celery_task_id = task.id
    job.save(update_fields=['celery_task_id'])
    
    messages.success(
        request,
        f'Export #{job.pk} criado! Você receberá um email quando estiver pronto.'
    )
    
    return redirect('ops:export_list')


@staff_member_required
@require_http_methods(["GET"])
def export_download(request, job_id):
    """
    Redirect to MinIO presigned URL for download.
    Or serve file directly if using local storage.
    """
    from .models import ExportJob
    from django.shortcuts import redirect
    from django.contrib import messages
    
    job = get_object_or_404(ExportJob, pk=job_id)
    
    # Check permission (user or superuser)
    if not request.user.is_superuser and job.user != request.user:
        messages.error(request, 'Você não tem permissão para acessar este export')
        return redirect('ops:export_list')
    
    # Check status
    if job.status != ExportJob.STATUS_COMPLETED:
        messages.error(request, f'Export ainda não está pronto (status: {job.get_status_display()})')
        return redirect('ops:export_list')
    
    # Check expiration
    if job.is_expired or not job.file_url:
        messages.error(request, 'Este export expirou e não está mais disponível')
        return redirect('ops:export_list')
    
    # Redirect to presigned URL
    return redirect(job.file_url)


@staff_member_required
@require_http_methods(["POST"])
def export_cancel(request, job_id):
    """
    Cancel a pending export job.
    """
    from .models import ExportJob
    from django.shortcuts import redirect
    from django.contrib import messages
    from celery.result import AsyncResult
    
    job = get_object_or_404(ExportJob, pk=job_id)
    
    # Check permission
    if not request.user.is_superuser and job.user != request.user:
        messages.error(request, 'Você não tem permissão para cancelar este export')
        return redirect('ops:export_list')
    
    # Can only cancel pending jobs
    if job.status not in [ExportJob.STATUS_PENDING, ExportJob.STATUS_PROCESSING]:
        messages.error(request, f'Não é possível cancelar export com status: {job.get_status_display()}')
        return redirect('ops:export_list')
    
    # Revoke Celery task
    if job.celery_task_id:
        AsyncResult(job.celery_task_id).revoke(terminate=True)
    
    # Update job
    job.status = ExportJob.STATUS_FAILED
    job.error_message = 'Cancelado pelo usuário'
    job.completed_at = timezone.now()
    job.save(update_fields=['status', 'error_message', 'completed_at'])
    
    messages.success(request, f'Export #{job.pk} cancelado com sucesso')
    return redirect('ops:export_list')
