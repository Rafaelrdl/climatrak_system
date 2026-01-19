"""
AI Event Handlers (AI-006).

Handlers para eventos do Outbox processados pelo core_events.

Responsável por:
- procedure.updated: Enfileira task de indexação
"""

import logging

from django.db import connection

from apps.core_events.tasks import register_event_handler
from apps.tenants.models import Tenant

logger = logging.getLogger(__name__)


@register_event_handler("procedure.updated")
def handle_procedure_updated(event):
    """
    Handler para evento procedure.updated.

    Enfileira task de indexação na base de conhecimento.
    Executado dentro do schema do tenant (via schema_context no consumer).

    Args:
        event: OutboxEvent com dados do procedimento
    """
    from .tasks import index_procedure_knowledge

    # Extrai dados do evento
    event_data = event.event_data or {}
    procedure_id = event_data.get("procedure_id")
    action = event_data.get("action", "unknown")
    has_file = event_data.get("has_file", False)

    if not procedure_id:
        logger.warning(
            f"[handle_procedure_updated] Missing procedure_id in event {event.id}"
        )
        return

    # Só indexa se tiver arquivo
    if not has_file:
        logger.info(
            f"[handle_procedure_updated] Procedure {procedure_id} has no file, skipping"
        )
        return

    # Obtém tenant_id do schema atual
    tenant_schema = connection.schema_name
    try:
        tenant = Tenant.objects.get(schema_name=tenant_schema)
        tenant_id = str(tenant.id)
    except Tenant.DoesNotExist:
        logger.error(
            f"[handle_procedure_updated] Tenant not found for schema {tenant_schema}"
        )
        return

    # Enfileira task de indexação
    index_procedure_knowledge.delay(
        procedure_id=procedure_id,
        schema_name=tenant_schema,
        tenant_id=tenant_id,
    )

    logger.info(
        f"[handle_procedure_updated] Enqueued indexation for procedure {procedure_id} "
        f"({action}) in schema {tenant_schema}"
    )
