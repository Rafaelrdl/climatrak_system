"""
Core Events - Domain Event Outbox

Este módulo implementa o padrão Outbox para eventos de domínio.
Garante processamento assíncrono, idempotência e rastreabilidade.

Referência: docs/events/01-contrato-eventos.md
"""

default_app_config = "apps.core_events.apps.CoreEventsConfig"
