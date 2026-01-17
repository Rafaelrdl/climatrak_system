"""
Core Events Tasks - Outbox Dispatcher

Tasks Celery para processamento assíncrono de eventos da Outbox.
Implementa retry com backoff exponencial e tratamento de falhas.

Referência: docs/events/01-contrato-eventos.md
"""

import logging
import uuid
from typing import Callable, Dict, Optional

from django.db import transaction
from django.utils import timezone

from celery import shared_task
from django_tenants.utils import get_public_schema_name, schema_context

from .models import OutboxEvent, OutboxEventStatus
from apps.common.tenancy import iter_tenants

logger = logging.getLogger(__name__)


# Registry de handlers de eventos
# Formato: {'event_name': handler_function}
_event_handlers: Dict[str, Callable[[OutboxEvent], None]] = {}


def register_event_handler(event_name: str):
    """
    Decorator para registrar um handler de evento.

    Uso:
        from apps.core_events.tasks import register_event_handler

        @register_event_handler('work_order.closed')
        def handle_work_order_closed(event: OutboxEvent):
            # Processar o evento
            data = event.event_data
            ...

    Args:
        event_name: Nome do evento que o handler processa
    """

    def decorator(func: Callable[[OutboxEvent], None]):
        _event_handlers[event_name] = func
        logger.info(f"Registered handler for event: {event_name}")
        return func

    return decorator


def get_event_handler(event_name: str) -> Optional[Callable[[OutboxEvent], None]]:
    """
    Retorna o handler registrado para um evento.

    Args:
        event_name: Nome do evento

    Returns:
        Handler function ou None se não registrado
    """
    return _event_handlers.get(event_name)


def get_registered_events() -> list[str]:
    """Retorna lista de eventos com handlers registrados."""
    return list(_event_handlers.keys())


def _tenant_uuid_from_schema(schema_name: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_DNS, f"tenant:{schema_name}")


def _normalize_tenant_uuid(
    tenant_id_filter: str | uuid.UUID | None, schema_name: str
) -> uuid.UUID | None:
    if tenant_id_filter is None:
        return _tenant_uuid_from_schema(schema_name)

    if isinstance(tenant_id_filter, uuid.UUID):
        return tenant_id_filter

    value = str(tenant_id_filter)
    try:
        return uuid.UUID(value)
    except ValueError:
        pass

    if value.isdigit():
        try:
            from apps.tenants.models import Tenant

            with schema_context(get_public_schema_name()):
                tenant = Tenant.objects.filter(id=int(value)).first()
            if tenant:
                return _tenant_uuid_from_schema(tenant.schema_name)
        except Exception as exc:
            logger.warning("Could not resolve tenant id %s: %s", value, exc)

    return _tenant_uuid_from_schema(value)


def _tenant_matches_filter(tenant, tenant_id_filter: str | None) -> bool:
    if not tenant_id_filter:
        return True

    value = str(tenant_id_filter)
    if value == str(tenant.id):
        return True

    if value.lower() == tenant.schema_name.lower():
        return True

    try:
        return uuid.UUID(value) == _tenant_uuid_from_schema(tenant.schema_name)
    except ValueError:
        return False


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,  # Max 10 minutos
    retry_jitter=True,
    max_retries=5,
    acks_late=True,  # Acknowledge após processamento
)
def process_outbox_event(self, event_id: str, tenant_schema: str | None = None):
    """
    Processa um evento individual da Outbox.

    Esta task é chamada para cada evento pendente e:
    1. Busca o evento pelo ID
    2. Verifica se ainda está pendente
    3. Localiza e executa o handler registrado
    4. Marca como processed ou failed

    Args:
        event_id: UUID do evento a processar
    """
    error_to_raise = None
    can_retry = False

    def _process_event():
        nonlocal error_to_raise, can_retry

        try:
            with transaction.atomic():
                event = OutboxEvent.objects.select_for_update().get(id=event_id)

                # Verificar se ainda está pendente
                if event.status != OutboxEventStatus.PENDING:
                    logger.info(f"Event {event_id} already processed/failed, skipping")
                    return

                # Buscar handler
                handler = get_event_handler(event.event_name)

                if not handler:
                    error_msg = f"No handler registered for event: {event.event_name}"
                    logger.warning(error_msg)
                    # Marcar como failed se não há handler
                    event.mark_failed(error_msg)
                    return

                # Tentar processar
                try:
                    logger.info(f"Processing event {event_id}: {event.event_name}")

                    # Executar handler
                    handler(event)

                    # Marcar como processado
                    worker_id = (
                        f"celery-{self.request.id}" if self.request.id else "unknown"
                    )
                    event.mark_processed(processed_by=worker_id)

                    logger.info(f"Event {event_id} processed successfully")
                    return

                except Exception as e:
                    error_msg = f"{type(e).__name__}: {str(e)}"
                    logger.error(f"Error processing event {event_id}: {error_msg}")

                    # Incrementar tentativas
                    can_retry = event.increment_attempt(error_msg)

                    if not can_retry:
                        logger.error(
                            f"Event {event_id} marked as failed after {event.attempts} attempts"
                        )

                    error_to_raise = e

        except OutboxEvent.DoesNotExist:
            logger.error(f"Event not found: {event_id}")
            return

    if tenant_schema:
        with schema_context(tenant_schema):
            _process_event()
    else:
        _process_event()

    if error_to_raise and can_retry:
        # Re-raise para Celery fazer retry após persistir o estado
        raise error_to_raise


@shared_task(
    bind=True,
    acks_late=True,
)
def dispatch_pending_events(
    self,
    batch_size: int = 100,
    tenant_id: str = None,
    tenant_schema: str | None = None,
):
    """
    Dispatcher principal: busca eventos pendentes e agenda processamento.

    Esta task é executada periodicamente (via Celery Beat) para:
    1. Buscar eventos com status 'pending'
    2. Agendar uma task process_outbox_event para cada um

    Args:
        batch_size: Número máximo de eventos a processar por execução
        tenant_id: Filtrar por tenant específico (opcional)
    """
    def _dispatch_for_schema(schema_name: str, tenant_id_filter: str | None):
        tenant_uuid = _normalize_tenant_uuid(tenant_id_filter, schema_name)
        with schema_context(schema_name):
            queryset = OutboxEvent.objects.filter(
                status=OutboxEventStatus.PENDING
            ).order_by("created_at")
            if tenant_uuid:
                queryset = queryset.filter(tenant_id=tenant_uuid)

            pending_events = list(queryset[:batch_size])

        if not pending_events:
            return 0

        dispatched = 0
        for event in pending_events:
            try:
                process_outbox_event.delay(str(event.id), tenant_schema=schema_name)
                dispatched += 1
            except Exception as e:
                logger.error(f"Failed to dispatch event {event.id}: {e}")

        return dispatched

    if tenant_schema:
        dispatched = _dispatch_for_schema(tenant_schema, tenant_id)
        if dispatched == 0:
            logger.debug("No pending events to dispatch")
        else:
            logger.info(f"Dispatched {dispatched} events for processing")
        return {"dispatched": dispatched, "tenants": 1}

    total_dispatched = 0
    tenant_count = 0
    for tenant in iter_tenants():
        if not _tenant_matches_filter(tenant, tenant_id):
            continue
        tenant_count += 1
        total_dispatched += _dispatch_for_schema(
            tenant.schema_name, _tenant_uuid_from_schema(tenant.schema_name)
        )

    if total_dispatched == 0:
        logger.debug("No pending events to dispatch")
    else:
        logger.info(f"Dispatched {total_dispatched} events for processing")

    return {"dispatched": total_dispatched, "tenants": tenant_count}


@shared_task(bind=True)
def retry_failed_events(self, batch_size: int = 50, tenant_id: str = None):
    """
    Task para reprocessar eventos falhos.

    Reseta o status de eventos 'failed' para 'pending' e os re-enfileira.
    Útil para recovery após correção de bugs ou problemas de infra.

    Args:
        batch_size: Número máximo de eventos a reprocessar
        tenant_id: Filtrar por tenant específico (opcional)
    """
    from .services import EventRetrier

    count = EventRetrier.retry_failed_events(
        tenant_id=tenant_id,
        limit=batch_size,
    )

    if count > 0:
        # Disparar o dispatcher para processar os eventos resetados
        dispatch_pending_events.delay(batch_size=count, tenant_id=tenant_id)

    logger.info(f"Reset {count} failed events for retry")
    return {"reset": count}


@shared_task(bind=True)
def cleanup_old_events(self, days: int = 30, status: str = "processed"):
    """
    Task para limpeza de eventos antigos.

    Remove eventos processados com mais de X dias para evitar
    crescimento indefinido da tabela.

    Args:
        days: Eventos mais antigos que X dias serão removidos
        status: Status dos eventos a remover (default: processed)
    """
    from datetime import timedelta

    cutoff_date = timezone.now() - timedelta(days=days)

    deleted_count, _ = OutboxEvent.objects.filter(
        status=status,
        created_at__lt=cutoff_date,
    ).delete()

    logger.info(
        f"Cleaned up {deleted_count} old events (status={status}, older than {days} days)"
    )
    return {"deleted": deleted_count}


# =============================================================================
# Exemplo de handler (comentado - será implementado em outras issues)
# =============================================================================
#
# @register_event_handler('work_order.closed')
# def handle_work_order_closed(event: OutboxEvent):
#     """
#     Handler para evento work_order.closed.
#
#     Processa fechamento de OS e publica lançamentos no ledger.
#     Implementado em FIN-004.
#     """
#     data = event.event_data
#     work_order_id = data.get('work_order_id')
#     # ... processar evento ...
