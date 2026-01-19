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


# ==============================================================================
# SCHEDULED AGENT TASKS
# ==============================================================================


def _get_date_bucket(bucket_type: str = "day") -> str:
    """
    Retorna bucket temporal para idempotency_key.
    
    Args:
        bucket_type: "day", "hour" ou "week"
    
    Returns:
        String do bucket (ex: "2026-01-19", "2026-01-19T10", "2026-W03")
    """
    from django.utils import timezone
    
    now = timezone.now()
    
    if bucket_type == "hour":
        return now.strftime("%Y-%m-%dT%H")
    elif bucket_type == "week":
        return now.strftime("%Y-W%W")
    else:  # day
        return now.strftime("%Y-%m-%d")


@shared_task
def schedule_preventive_insights(max_assets_per_tenant: int = 50):
    """
    Task agendada para gerar insights preventivos por ativo.
    
    Itera todos os tenants e cria jobs de preventive para ativos ativos.
    Usa idempotency_key determinística por dia para evitar duplicatas.
    
    Args:
        max_assets_per_tenant: Limite de ativos por tenant
    """
    from django.db import connection
    
    from apps.assets.models import Asset
    
    from .services import AIJobService
    from .utils.related import normalize_related_id
    
    date_bucket = _get_date_bucket("day")
    total_created = 0
    total_skipped = 0
    
    for tenant in iter_tenants():
        with schema_context(tenant.schema_name):
            # Buscar ativos ativos
            assets = Asset.objects.filter(
                status__in=["OK", "MAINTENANCE", "ALERT"]
            ).values("id", "tag")[:max_assets_per_tenant]
            
            for asset in assets:
                # Gerar idempotency_key determinística
                idempotency_key = f"preventive:asset:{asset['id']}:asof:{date_bucket}:v1"
                
                try:
                    # Normalizar related_id
                    related_id = normalize_related_id("asset", asset["id"])
                    
                    job, created = AIJobService.create_job(
                        agent_key="preventive",
                        input_data={
                            "scope": "asset",
                            "asset_id": asset["id"],
                        },
                        related_type="asset",
                        related_id=related_id,
                        idempotency_key=idempotency_key,
                    )
                    
                    if created:
                        execute_ai_job.delay(
                            job_id=str(job.id),
                            schema_name=tenant.schema_name,
                        )
                        total_created += 1
                        logger.debug(
                            f"[schedule_preventive] Created job for asset {asset['tag']} "
                            f"in tenant {tenant.slug}"
                        )
                    else:
                        total_skipped += 1
                        
                except Exception as e:
                    logger.warning(
                        f"[schedule_preventive] Error for asset {asset['id']} "
                        f"in tenant {tenant.slug}: {e}"
                    )
    
    logger.info(
        f"[schedule_preventive] Completed: {total_created} created, "
        f"{total_skipped} skipped (idempotent)"
    )
    return {"created": total_created, "skipped": total_skipped}


@shared_task
def schedule_predictive_risk(max_assets_per_tenant: int = 50):
    """
    Task agendada para calcular risco preditivo por ativo.
    
    Itera todos os tenants e cria jobs de predictive para ativos.
    Usa idempotency_key determinística por hora para reavaliação frequente.
    
    Args:
        max_assets_per_tenant: Limite de ativos por tenant
    """
    from django.db import connection
    
    from apps.assets.models import Asset
    
    from .services import AIJobService
    from .utils.related import normalize_related_id
    
    hour_bucket = _get_date_bucket("hour")
    total_created = 0
    total_skipped = 0
    
    for tenant in iter_tenants():
        with schema_context(tenant.schema_name):
            # Priorizar ativos em alerta ou manutenção
            assets = Asset.objects.filter(
                status__in=["ALERT", "MAINTENANCE", "OK"]
            ).order_by(
                # Ativos em alerta primeiro
                "-status"
            ).values("id", "tag")[:max_assets_per_tenant]
            
            for asset in assets:
                idempotency_key = f"predictive:asset:{asset['id']}:bucket:{hour_bucket}:v1"
                
                try:
                    related_id = normalize_related_id("asset", asset["id"])
                    
                    job, created = AIJobService.create_job(
                        agent_key="predictive",
                        input_data={
                            "asset_id": asset["id"],
                        },
                        related_type="asset",
                        related_id=related_id,
                        idempotency_key=idempotency_key,
                    )
                    
                    if created:
                        execute_ai_job.delay(
                            job_id=str(job.id),
                            schema_name=tenant.schema_name,
                        )
                        total_created += 1
                    else:
                        total_skipped += 1
                        
                except Exception as e:
                    logger.warning(
                        f"[schedule_predictive] Error for asset {asset['id']} "
                        f"in tenant {tenant.slug}: {e}"
                    )
    
    logger.info(
        f"[schedule_predictive] Completed: {total_created} created, "
        f"{total_skipped} skipped"
    )
    return {"created": total_created, "skipped": total_skipped}


@shared_task
def schedule_patterns_report(scope: str = "all"):
    """
    Task agendada para gerar relatório de padrões.
    
    Executa uma vez por semana (ou conforme configurado no beat schedule).
    Usa idempotency_key determinística por semana.
    
    Args:
        scope: "all" para tenant-wide, ou "site" para por site
    """
    from django.db import connection
    
    from .services import AIJobService
    
    week_bucket = _get_date_bucket("week")
    total_created = 0
    total_skipped = 0
    
    for tenant in iter_tenants():
        with schema_context(tenant.schema_name):
            idempotency_key = f"patterns:scope:{scope}:tenant:week:{week_bucket}:v1"
            
            try:
                job, created = AIJobService.create_job(
                    agent_key="patterns",
                    input_data={
                        "scope": scope,
                        "window_days": 30,
                    },
                    idempotency_key=idempotency_key,
                )
                
                if created:
                    execute_ai_job.delay(
                        job_id=str(job.id),
                        schema_name=tenant.schema_name,
                    )
                    total_created += 1
                    logger.info(
                        f"[schedule_patterns] Created patterns report for tenant {tenant.slug}"
                    )
                else:
                    total_skipped += 1
                    
            except Exception as e:
                logger.warning(
                    f"[schedule_patterns] Error for tenant {tenant.slug}: {e}"
                )
    
    logger.info(
        f"[schedule_patterns] Completed: {total_created} created, "
        f"{total_skipped} skipped"
    )
    return {"created": total_created, "skipped": total_skipped}

