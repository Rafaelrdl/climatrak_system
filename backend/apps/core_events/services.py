"""
Core Events Services - Event Publisher

Service layer para publicação de eventos na Outbox.
Garante que eventos sejam criados com formato correto e idempotência.

Referência: docs/events/01-contrato-eventos.md
"""

import uuid
import hashlib
from datetime import datetime
from typing import Any, Dict, Optional, Union
from django.db import transaction
from django.utils import timezone

from .models import OutboxEvent, OutboxEventStatus


class EventPublisher:
    """
    Service para publicar eventos de domínio na Outbox.
    
    Uso típico:
        from apps.core_events.services import EventPublisher
        
        # Dentro de uma transação de banco
        with transaction.atomic():
            work_order.status = 'closed'
            work_order.save()
            
            EventPublisher.publish(
                tenant_id=work_order.tenant_id,
                event_name='work_order.closed',
                aggregate_type='work_order',
                aggregate_id=work_order.id,
                data={'order_number': work_order.number, ...}
            )
    """
    
    @classmethod
    def publish(
        cls,
        tenant_id: Union[uuid.UUID, str],
        event_name: str,
        aggregate_type: str,
        aggregate_id: Union[uuid.UUID, str],
        data: Dict[str, Any],
        idempotency_key: Optional[str] = None,
        occurred_at: Optional[datetime] = None,
        max_attempts: int = 5,
    ) -> OutboxEvent:
        """
        Publica um evento de domínio na Outbox.
        
        O evento será processado de forma assíncrona pelo dispatcher Celery.
        
        Args:
            tenant_id: ID do tenant que originou o evento
            event_name: Nome qualificado do evento (ex: work_order.closed)
            aggregate_type: Tipo do agregado (ex: work_order, commitment)
            aggregate_id: ID do agregado que originou o evento
            data: Dados específicos do evento
            idempotency_key: Chave única para evitar duplicatas (auto-gerada se não fornecida)
            occurred_at: Timestamp do evento (usa timezone.now() se não fornecido)
            max_attempts: Número máximo de tentativas de processamento
            
        Returns:
            OutboxEvent: Evento criado na outbox
            
        Raises:
            IntegrityError: Se idempotency_key já existe para o tenant
        """
        # Normalizar UUIDs
        if isinstance(tenant_id, str):
            tenant_id = uuid.UUID(tenant_id)
        if isinstance(aggregate_id, str):
            aggregate_id = uuid.UUID(aggregate_id)
        
        # Gerar timestamps
        now = occurred_at or timezone.now()
        event_id = uuid.uuid4()
        
        # Gerar idempotency_key se não fornecida
        if not idempotency_key:
            idempotency_key = cls._generate_idempotency_key(
                event_name=event_name,
                aggregate_type=aggregate_type,
                aggregate_id=aggregate_id,
                occurred_at=now,
            )
        
        # Montar envelope do evento conforme contrato
        payload = {
            'event_id': str(event_id),
            'tenant_id': str(tenant_id),
            'event_name': event_name,
            'occurred_at': now.isoformat(),
            'aggregate': {
                'type': aggregate_type,
                'id': str(aggregate_id),
            },
            'data': data,
        }
        
        # Criar evento na outbox
        event = OutboxEvent.objects.create(
            id=event_id,
            tenant_id=tenant_id,
            event_name=event_name,
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            occurred_at=now,
            payload=payload,
            status=OutboxEventStatus.PENDING,
            idempotency_key=idempotency_key,
            max_attempts=max_attempts,
        )
        
        return event
    
    @classmethod
    def publish_idempotent(
        cls,
        tenant_id: Union[uuid.UUID, str],
        event_name: str,
        aggregate_type: str,
        aggregate_id: Union[uuid.UUID, str],
        data: Dict[str, Any],
        idempotency_key: str,
        occurred_at: Optional[datetime] = None,
        max_attempts: int = 5,
    ) -> tuple[OutboxEvent, bool]:
        """
        Publica um evento de forma idempotente (get_or_create).
        
        Se o evento já existe com a mesma idempotency_key, retorna o existente.
        
        Args:
            tenant_id: ID do tenant que originou o evento
            event_name: Nome qualificado do evento
            aggregate_type: Tipo do agregado
            aggregate_id: ID do agregado
            data: Dados específicos do evento
            idempotency_key: Chave única (obrigatória neste método)
            occurred_at: Timestamp do evento
            max_attempts: Número máximo de tentativas
            
        Returns:
            tuple: (OutboxEvent, created) - Evento e bool indicando se foi criado
        """
        # Normalizar UUIDs
        if isinstance(tenant_id, str):
            tenant_id = uuid.UUID(tenant_id)
        if isinstance(aggregate_id, str):
            aggregate_id = uuid.UUID(aggregate_id)
        
        # Verificar se já existe
        existing = OutboxEvent.objects.filter(
            tenant_id=tenant_id,
            idempotency_key=idempotency_key,
        ).first()
        
        if existing:
            return existing, False
        
        # Criar novo evento
        event = cls.publish(
            tenant_id=tenant_id,
            event_name=event_name,
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            data=data,
            idempotency_key=idempotency_key,
            occurred_at=occurred_at,
            max_attempts=max_attempts,
        )
        
        return event, True
    
    @staticmethod
    def _generate_idempotency_key(
        event_name: str,
        aggregate_type: str,
        aggregate_id: Union[uuid.UUID, str],
        occurred_at: datetime,
    ) -> str:
        """
        Gera uma chave de idempotência baseada nos dados do evento.
        
        A chave é um hash SHA256 dos componentes únicos do evento.
        """
        components = [
            event_name,
            aggregate_type,
            str(aggregate_id),
            occurred_at.isoformat(),
        ]
        combined = ':'.join(components)
        return hashlib.sha256(combined.encode()).hexdigest()[:64]


class EventRetrier:
    """
    Service para reprocessamento de eventos falhos.
    
    Permite reprocessar eventos que falharam, resetando o contador
    de tentativas e marcando como pending novamente.
    """
    
    @classmethod
    def retry_event(cls, event_id: Union[uuid.UUID, str]) -> OutboxEvent:
        """
        Reseta um evento para ser reprocessado.
        
        Args:
            event_id: ID do evento a reprocessar
            
        Returns:
            OutboxEvent: Evento atualizado
            
        Raises:
            OutboxEvent.DoesNotExist: Se evento não existe
        """
        if isinstance(event_id, str):
            event_id = uuid.UUID(event_id)
        
        event = OutboxEvent.objects.get(id=event_id)
        event.status = OutboxEventStatus.PENDING
        event.attempts = 0
        event.last_error = None
        event.last_attempt_at = None
        event.processed_at = None
        event.processed_by = None
        event.save()
        
        return event
    
    @classmethod
    def retry_failed_events(
        cls,
        tenant_id: Optional[Union[uuid.UUID, str]] = None,
        event_name: Optional[str] = None,
        limit: int = 100,
    ) -> int:
        """
        Reseta múltiplos eventos falhos para reprocessamento.
        
        Args:
            tenant_id: Filtrar por tenant (opcional)
            event_name: Filtrar por nome do evento (opcional)
            limit: Número máximo de eventos a resetar
            
        Returns:
            int: Número de eventos resetados
        """
        queryset = OutboxEvent.objects.filter(status=OutboxEventStatus.FAILED)
        
        if tenant_id:
            if isinstance(tenant_id, str):
                tenant_id = uuid.UUID(tenant_id)
            queryset = queryset.filter(tenant_id=tenant_id)
        
        if event_name:
            queryset = queryset.filter(event_name=event_name)
        
        events = queryset[:limit]
        count = 0
        
        for event in events:
            event.status = OutboxEventStatus.PENDING
            event.attempts = 0
            event.last_error = None
            event.last_attempt_at = None
            event.processed_at = None
            event.processed_by = None
            event.save()
            count += 1
        
        return count
