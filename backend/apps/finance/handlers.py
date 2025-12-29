"""
Finance Event Handlers

Handlers para processar eventos de domínio consumidos pelo Finance.

Registra handlers usando o decorator @register_event_handler do core_events.

Referências:
- docs/events/02-eventos-mvp.md
- docs/finance/02-regras-negocio.md
"""

import logging

from apps.core_events.tasks import register_event_handler
from apps.core_events.models import OutboxEvent

from .cost_engine import CostEngineService, CostEngineError

logger = logging.getLogger(__name__)


@register_event_handler('work_order.closed')
def handle_work_order_closed(event: OutboxEvent) -> None:
    """
    Handler para evento work_order.closed.
    
    Consome o evento e cria lançamentos no ledger (CostTransaction)
    para labor, parts e third_party.
    
    Após sucesso, emite eventos cost.entry_posted para cada transação criada.
    
    Args:
        event: OutboxEvent com o evento work_order.closed
        
    Raises:
        CostEngineError: Se falhar no processamento
    """
    logger.info(f"Processing work_order.closed event: {event.id}")
    
    # Extrair dados do evento
    # O payload tem o formato do envelope com 'data' contendo os dados específicos
    event_data = event.event_data
    tenant_id = event.tenant_id
    
    try:
        result = CostEngineService.process_work_order_closed(
            event_data=event_data,
            tenant_id=str(tenant_id),
        )
        
        logger.info(
            f"work_order.closed processed successfully - "
            f"transactions: {result['transactions_created']}, "
            f"skipped: {result['skipped']}, "
            f"events: {result['events_published']}"
        )
        
    except CostEngineError as e:
        logger.error(f"CostEngine error processing event {event.id}: {e}")
        raise
    except Exception as e:
        logger.exception(f"Unexpected error processing event {event.id}")
        raise CostEngineError(f"Unexpected error: {e}") from e


@register_event_handler('commitment.approved')
def handle_commitment_approved(event: OutboxEvent) -> None:
    """
    Handler para evento commitment.approved.
    
    Consome o evento e atualiza o sumário mensal de compromissos.
    No MVP, este handler apenas registra o processamento.
    Futuramente pode atualizar caches ou materializar views.
    
    Args:
        event: OutboxEvent com o evento commitment.approved
        
    Payload esperado (event_data):
    {
        "commitment_id": "uuid",
        "amount": 4300.00,
        "budget_month": "2026-01-01",
        "cost_center_id": "uuid",
        "category": "parts"
    }
    """
    logger.info(f"Processing commitment.approved event: {event.id}")
    
    event_data = event.event_data
    tenant_id = event.tenant_id
    
    commitment_id = event_data.get('commitment_id')
    amount = event_data.get('amount')
    budget_month = event_data.get('budget_month')
    cost_center_id = event_data.get('cost_center_id')
    category = event_data.get('category')
    
    logger.info(
        f"Commitment approved - "
        f"commitment_id: {commitment_id}, "
        f"amount: {amount}, "
        f"budget_month: {budget_month}, "
        f"cost_center_id: {cost_center_id}, "
        f"category: {category}, "
        f"tenant_id: {tenant_id}"
    )
    
    # MVP: Apenas logging para confirmar processamento
    # Futuramente:
    # - Atualizar cache de compromissos por mês
    # - Recalcular sumário de orçamento
    # - Notificar sistemas interessados
    
    # O handler é idempotente por natureza (apenas logging)
    # Se necessário processar de verdade, usar idempotency_key do evento
    
    logger.info(f"commitment.approved event {event.id} processed successfully")
