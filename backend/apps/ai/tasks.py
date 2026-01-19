"""
AI Tasks - Celery tasks for AI module.

Tasks para execução assíncrona de jobs de IA.
Implementa retry com backoff e tratamento de erros.
"""

import logging
import uuid

from celery import shared_task
from django.db import connection

from django_tenants.utils import schema_context

from apps.common.tenancy import iter_tenants

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
)
def execute_ai_job(self, job_id: str, schema_name: str):
    """
    Executa um job de IA dentro do contexto do tenant.

    Args:
        job_id: ID do job (string UUID)
        schema_name: Nome do schema do tenant
    """
    from .models import AIJob, AIJobStatus
    from .services import AIJobService

    logger.info(f"Executing AI job {job_id} in schema {schema_name}")

    with schema_context(schema_name):
        try:
            # Buscar job
            job = AIJob.objects.filter(id=job_id).first()
            if not job:
                logger.error(f"AI job {job_id} not found in schema {schema_name}")
                return {"error": "Job not found"}

            # Verificar se já foi processado
            if job.status not in [AIJobStatus.PENDING, AIJobStatus.FAILED]:
                logger.warning(f"AI job {job_id} already in status {job.status}")
                return {"status": job.status, "skipped": True}

            # Verificar tentativas
            if not job.can_retry() and job.status == AIJobStatus.FAILED:
                logger.warning(f"AI job {job_id} exceeded max attempts")
                return {"error": "Max attempts exceeded"}

            # Executar job
            job = AIJobService.execute_job(job)

            return {
                "job_id": str(job.id),
                "status": job.status,
                "success": job.status == AIJobStatus.SUCCEEDED,
            }

        except Exception as e:
            logger.exception(f"Error executing AI job {job_id}: {e}")

            # Marcar como falha se job existe
            try:
                job = AIJob.objects.filter(id=job_id).first()
                if job and job.status == AIJobStatus.RUNNING:
                    job.mark_failed(
                        error_message=str(e),
                        error_details={"type": type(e).__name__},
                    )
            except Exception:
                pass

            raise


@shared_task
def cleanup_old_ai_jobs(days: int = 30):
    """
    Limpa jobs antigos de todos os tenants.

    Args:
        days: Idade máxima em dias (default: 30)
    """
    from datetime import timedelta

    from django.utils import timezone

    from .models import AIJob, AIJobStatus

    cutoff = timezone.now() - timedelta(days=days)
    total_deleted = 0

    for tenant in iter_tenants():
        with schema_context(tenant.schema_name):
            # Deletar jobs completos antigos
            deleted, _ = AIJob.objects.filter(
                status__in=[AIJobStatus.SUCCEEDED, AIJobStatus.FAILED, AIJobStatus.CANCELLED],
                completed_at__lt=cutoff,
            ).delete()
            total_deleted += deleted

            if deleted > 0:
                logger.info(
                    f"Deleted {deleted} old AI jobs from tenant {tenant.slug}"
                )

    return {"deleted_total": total_deleted}


@shared_task
def check_stuck_ai_jobs(timeout_minutes: int = 30):
    """
    Verifica e marca jobs travados como timeout.

    Args:
        timeout_minutes: Tempo máximo de execução em minutos
    """
    from datetime import timedelta

    from django.utils import timezone

    from .models import AIJob, AIJobStatus

    cutoff = timezone.now() - timedelta(minutes=timeout_minutes)
    total_timeout = 0

    for tenant in iter_tenants():
        with schema_context(tenant.schema_name):
            # Buscar jobs running há muito tempo
            stuck_jobs = AIJob.objects.filter(
                status=AIJobStatus.RUNNING,
                started_at__lt=cutoff,
            )

            for job in stuck_jobs:
                job.mark_timeout()
                total_timeout += 1
                logger.warning(
                    f"Marked AI job {job.id} as timeout in tenant {tenant.slug}"
                )

    return {"timeout_total": total_timeout}
