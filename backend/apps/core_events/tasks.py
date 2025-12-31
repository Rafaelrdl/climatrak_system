"""
Core Events Tasks - Outbox Dispatcher

Tasks Celery para processamento assíncrono de eventos da Outbox.
Implementa retry com backoff exponencial e tratamento de falhas.

Referência: docs/events/01-contrato-eventos.md
"""

import logging
from typing import Callable, Dict, Optional

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from .models import OutboxEvent, OutboxEventStatus

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


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,  # Max 10 minutos
    retry_jitter=True,
    max_retries=5,
    acks_late=True,  # Acknowledge após processamento
)
def process_outbox_event(self, event_id: str):
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

    if error_to_raise and can_retry:
        # Re-raise para Celery fazer retry após persistir o estado
        raise error_to_raise


@shared_task(
    bind=True,
    acks_late=True,
)
def dispatch_pending_events(self, batch_size: int = 100, tenant_id: str = None):
    """
    Dispatcher principal: busca eventos pendentes e agenda processamento.

    Esta task é executada periodicamente (via Celery Beat) para:
    1. Buscar eventos com status 'pending'
    2. Agendar uma task process_outbox_event para cada um

    Args:
        batch_size: Número máximo de eventos a processar por execução
        tenant_id: Filtrar por tenant específico (opcional)
    """
    queryset = OutboxEvent.objects.filter(status=OutboxEventStatus.PENDING).order_by(
        "created_at"
    )

    if tenant_id:
        queryset = queryset.filter(tenant_id=tenant_id)

    # Buscar batch de eventos pendentes
    pending_events = list(queryset[:batch_size])

    if not pending_events:
        logger.debug("No pending events to dispatch")
        return {"dispatched": 0}

    dispatched = 0
    for event in pending_events:
        try:
            # Agendar processamento individual
            process_outbox_event.delay(str(event.id))
            dispatched += 1
        except Exception as e:
            logger.error(f"Failed to dispatch event {event.id}: {e}")

    logger.info(f"Dispatched {dispatched} events for processing")
    return {"dispatched": dispatched}


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
