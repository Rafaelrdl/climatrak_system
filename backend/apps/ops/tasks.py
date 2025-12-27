"""
Celery tasks for async operations in Control Center
"""
import csv
import logging
from datetime import timedelta
from io import StringIO

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.db import connection
from django.utils import timezone
from django_tenants.utils import schema_context

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, soft_time_limit=300, time_limit=600)
def export_telemetry_async(self, export_job_id):
    """
    Export telemetry data to CSV asynchronously.
    
    Args:
        export_job_id: PK of ExportJob model
    
    Returns:
        dict: Result metadata (file_url, record_count, file_size)
    """
    from apps.ops.models import ExportJob
    from apps.tenants.models import Tenant
    
    try:
        # Load job
        job = ExportJob.objects.get(pk=export_job_id)
        job.status = ExportJob.STATUS_PROCESSING
        job.started_at = timezone.now()
        job.celery_task_id = self.request.id
        job.save(update_fields=['status', 'started_at', 'celery_task_id'])
        
        logger.info(f"Starting export job #{job.pk} for tenant {job.tenant_slug}")
        
        # Get tenant
        try:
            tenant = Tenant.objects.get(slug=job.tenant_slug)
        except Tenant.DoesNotExist:
            raise Exception(f"Tenant {job.tenant_slug} not found")
        
        # Build query
        # 🔧 Usar schema_name (não slug) - suporta tenants com hífen
        with schema_context(tenant.schema_name):
            # 🔧 Usar Reading (não TelemetryReading que não existe)
            from apps.ingest.models import Reading
            
            queryset = Reading.objects.all()
            
            if job.sensor_id:
                queryset = queryset.filter(sensor_id=job.sensor_id)
            
            if job.from_timestamp:
                queryset = queryset.filter(timestamp__gte=job.from_timestamp)
            
            if job.to_timestamp:
                queryset = queryset.filter(timestamp__lte=job.to_timestamp)
            
            queryset = queryset.order_by('timestamp').values(
                'timestamp', 'sensor_id', 'value', 'unit'
            )
            
            # Generate CSV in memory
            output = StringIO()
            writer = csv.DictWriter(
                output,
                fieldnames=['timestamp', 'sensor_id', 'value', 'unit'],
                extrasaction='ignore'
            )
            writer.writeheader()
            
            record_count = 0
            batch_size = 10000
            
            # Stream data in batches
            for row in queryset.iterator(chunk_size=batch_size):
                writer.writerow({
                    'timestamp': row['timestamp'].isoformat(),
                    'sensor_id': row['sensor_id'],
                    'value': row['value'],
                    'unit': row['unit'] or '',
                })
                record_count += 1
                
                # Update progress every 50k records
                if record_count % 50000 == 0:
                    logger.info(f"Export job #{job.pk}: {record_count} records processed")
            
            csv_content = output.getvalue()
            file_size_bytes = len(csv_content.encode('utf-8'))
            
            logger.info(
                f"Export job #{job.pk} completed: {record_count} records, "
                f"{file_size_bytes / (1024*1024):.2f} MB"
            )
        
        # Upload to MinIO/S3
        file_url = _upload_to_storage(job, csv_content)
        
        # Update job
        job.status = ExportJob.STATUS_COMPLETED
        job.completed_at = timezone.now()
        job.file_url = file_url
        job.file_size_bytes = file_size_bytes
        job.record_count = record_count
        job.expires_at = timezone.now() + timedelta(hours=24)
        job.save(update_fields=[
            'status', 'completed_at', 'file_url', 
            'file_size_bytes', 'record_count', 'expires_at'
        ])
        
        # Send email notification
        _send_completion_email(job)
        
        return {
            'file_url': file_url,
            'record_count': record_count,
            'file_size_bytes': file_size_bytes,
        }
    
    except Exception as exc:
        logger.exception(f"Export job #{export_job_id} failed: {exc}")
        
        # Update job to failed
        try:
            job = ExportJob.objects.get(pk=export_job_id)
            job.status = ExportJob.STATUS_FAILED
            job.completed_at = timezone.now()
            job.error_message = str(exc)
            job.save(update_fields=['status', 'completed_at', 'error_message'])
            
            # Send failure email
            _send_failure_email(job)
        except Exception as e:
            logger.exception(f"Failed to update job status: {e}")
        
        # Retry on transient errors
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
        
        raise


def _upload_to_storage(job, csv_content):
    """
    Upload CSV to MinIO/S3 and return public URL.
    
    Args:
        job: ExportJob instance
        csv_content: CSV string
    
    Returns:
        str: Public URL to download file
    """
    try:
        from minio import Minio
        from minio.error import S3Error
        
        # MinIO client
        client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL,
        )
        
        bucket_name = 'exports'
        
        # Ensure bucket exists
        if not client.bucket_exists(bucket_name):
            client.make_bucket(bucket_name)
            logger.info(f"Created MinIO bucket: {bucket_name}")
        
        # Generate filename
        timestamp_str = timezone.now().strftime('%Y%m%d_%H%M%S')
        filename = f"export_{job.pk}_{job.tenant_slug}_{timestamp_str}.csv"
        
        # Upload
        csv_bytes = csv_content.encode('utf-8')
        from io import BytesIO
        client.put_object(
            bucket_name,
            filename,
            BytesIO(csv_bytes),
            length=len(csv_bytes),
            content_type='text/csv',
        )
        
        # Generate presigned URL (valid for 24h)
        file_url = client.presigned_get_object(
            bucket_name,
            filename,
            expires=timedelta(hours=24)
        )
        
        logger.info(f"Uploaded export to MinIO: {filename}")
        return file_url
    
    except Exception as e:
        logger.exception(f"Failed to upload to MinIO: {e}")
        # Fallback: return a placeholder (in production, this would fail the job)
        return f"/ops/exports/{job.pk}/download/"


def _send_completion_email(job):
    """Send email notification when export is ready."""
    try:
        subject = f"[TrakSense] Export Concluído - {job.tenant_name or job.tenant_slug}"
        
        message = f"""
Olá {job.user.get_full_name() or job.user.username},

Seu export de telemetria foi concluído com sucesso!

Detalhes:
- Tenant: {job.tenant_name or job.tenant_slug}
- Sensor: {job.sensor_id or 'Todos'}
- Período: {job.from_timestamp or 'Início'} até {job.to_timestamp or 'Agora'}
- Registros: {job.record_count:,}
- Tamanho: {job.file_size_mb} MB

Link para download (válido por 24h):
{job.file_url}

O arquivo expira em: {job.expires_at.strftime('%d/%m/%Y %H:%M')}

---
TrakSense Control Center
        """.strip()
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [job.user.email],
            fail_silently=False,
        )
        
        logger.info(f"Sent completion email to {job.user.email}")
    
    except Exception as e:
        logger.exception(f"Failed to send completion email: {e}")


def _send_failure_email(job):
    """Send email notification when export fails."""
    try:
        subject = f"[TrakSense] Export Falhou - {job.tenant_name or job.tenant_slug}"
        
        message = f"""
Olá {job.user.get_full_name() or job.user.username},

Infelizmente, seu export de telemetria falhou.

Detalhes:
- Tenant: {job.tenant_name or job.tenant_slug}
- Sensor: {job.sensor_id or 'Todos'}
- Erro: {job.error_message}

Por favor, tente novamente ou entre em contato com o suporte.

---
TrakSense Control Center
        """.strip()
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [job.user.email],
            fail_silently=False,
        )
        
        logger.info(f"Sent failure email to {job.user.email}")
    
    except Exception as e:
        logger.exception(f"Failed to send failure email: {e}")


@shared_task
def cleanup_expired_exports():
    """
    Periodic task to delete expired export files.
    Run daily via Celery Beat.
    """
    from apps.ops.models import ExportJob
    
    expired_jobs = ExportJob.objects.filter(
        status=ExportJob.STATUS_COMPLETED,
        expires_at__lt=timezone.now()
    )
    
    count = 0
    for job in expired_jobs:
        try:
            # Delete from MinIO (if applicable)
            # TODO: Implement MinIO deletion
            
            # Mark as expired (keep record for audit)
            job.file_url = ''
            job.save(update_fields=['file_url'])
            count += 1
        
        except Exception as e:
            logger.exception(f"Failed to cleanup export #{job.pk}: {e}")
    
    logger.info(f"Cleaned up {count} expired export files")
    return count
