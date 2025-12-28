"""
Core Events Models - Domain Event Outbox

Implementa o padrão Transactional Outbox para eventos de domínio.

Campos conforme docs/events/01-contrato-eventos.md:
- id (uuid)
- tenant_id
- event_name (string)
- aggregate_type (string)
- aggregate_id (uuid)
- occurred_at (timestamptz)
- payload (jsonb)
- status (pending|processed|failed)
- idempotency_key (string)
- attempts (int), last_error (text)
"""

import uuid
from django.db import models
from django.utils import timezone


class OutboxEventStatus(models.TextChoices):
    """Status possíveis para um evento na outbox."""
    PENDING = 'pending', 'Pendente'
    PROCESSED = 'processed', 'Processado'
    FAILED = 'failed', 'Falhou'


class OutboxEvent(models.Model):
    """
    Evento de domínio armazenado para processamento assíncrono.
    
    O padrão Outbox garante:
    - Atomicidade: evento é gravado na mesma transação do agregado
    - Idempotência: via idempotency_key único por tenant
    - Rastreabilidade: histórico completo de tentativas
    - Resiliência: reprocessamento seguro com retry/backoff
    
    Envelope do evento (payload) segue o formato:
    {
        "event_id": "uuid",
        "tenant_id": "uuid",
        "event_name": "work_order.closed",
        "occurred_at": "2026-01-10T12:00:00-03:00",
        "aggregate": { "type": "work_order", "id": "uuid" },
        "data": { ... }
    }
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID do Evento'
    )
    
    # Identificação do tenant (denormalizado para queries eficientes)
    tenant_id = models.UUIDField(
        verbose_name='Tenant ID',
        db_index=True,
        help_text='ID do tenant que originou o evento'
    )
    
    # Identificação do evento
    event_name = models.CharField(
        max_length=100,
        verbose_name='Nome do Evento',
        db_index=True,
        help_text='Nome qualificado do evento (ex: work_order.closed, cost.entry_posted)'
    )
    
    # Agregado de origem
    aggregate_type = models.CharField(
        max_length=100,
        verbose_name='Tipo do Agregado',
        help_text='Tipo do agregado de origem (ex: work_order, commitment)'
    )
    aggregate_id = models.UUIDField(
        verbose_name='ID do Agregado',
        help_text='ID do agregado que originou o evento'
    )
    
    # Timestamp do evento
    occurred_at = models.DateTimeField(
        verbose_name='Ocorreu em',
        help_text='Momento em que o evento ocorreu no domínio'
    )
    
    # Payload completo do evento (envelope JSON)
    payload = models.JSONField(
        verbose_name='Payload',
        help_text='Envelope completo do evento conforme contrato'
    )
    
    # Status de processamento
    status = models.CharField(
        max_length=20,
        choices=OutboxEventStatus.choices,
        default=OutboxEventStatus.PENDING,
        db_index=True,
        verbose_name='Status'
    )
    
    # Idempotência
    idempotency_key = models.CharField(
        max_length=255,
        verbose_name='Chave de Idempotência',
        help_text='Chave única para garantir processamento exatamente uma vez'
    )
    
    # Controle de tentativas
    attempts = models.PositiveIntegerField(
        default=0,
        verbose_name='Tentativas',
        help_text='Número de tentativas de processamento'
    )
    max_attempts = models.PositiveIntegerField(
        default=5,
        verbose_name='Máximo de Tentativas',
        help_text='Número máximo de tentativas antes de marcar como failed'
    )
    last_error = models.TextField(
        blank=True,
        null=True,
        verbose_name='Último Erro',
        help_text='Mensagem do último erro de processamento'
    )
    last_attempt_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Última Tentativa em',
        help_text='Timestamp da última tentativa de processamento'
    )
    
    # Controle de processamento
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Processado em',
        help_text='Timestamp de quando foi processado com sucesso'
    )
    processed_by = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Processado por',
        help_text='Identificador do worker/handler que processou'
    )
    
    # Auditoria
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Criado em'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Atualizado em'
    )
    
    class Meta:
        verbose_name = 'Evento Outbox'
        verbose_name_plural = 'Eventos Outbox'
        ordering = ['-created_at']
        
        # Índices para performance
        indexes = [
            # Busca de eventos pendentes por tenant
            models.Index(
                fields=['tenant_id', 'status', 'created_at'],
                name='outbox_tenant_status_idx'
            ),
            # Busca por nome do evento
            models.Index(
                fields=['event_name', 'status'],
                name='outbox_event_name_idx'
            ),
            # Busca por agregado
            models.Index(
                fields=['aggregate_type', 'aggregate_id'],
                name='outbox_aggregate_idx'
            ),
            # Busca de pending para processamento
            models.Index(
                fields=['status', 'created_at'],
                name='outbox_pending_idx'
            ),
        ]
        
        # Constraint de unicidade para idempotência por tenant
        constraints = [
            models.UniqueConstraint(
                fields=['tenant_id', 'idempotency_key'],
                name='outbox_tenant_idempotency_unique'
            )
        ]
    
    def __str__(self):
        return f"{self.event_name} ({self.id}) - {self.status}"
    
    def mark_processed(self, processed_by: str = None):
        """
        Marca o evento como processado com sucesso.
        
        Args:
            processed_by: Identificador do worker/handler que processou
        """
        self.status = OutboxEventStatus.PROCESSED
        self.processed_at = timezone.now()
        self.processed_by = processed_by
        self.save(update_fields=['status', 'processed_at', 'processed_by', 'updated_at'])
    
    def mark_failed(self, error_message: str):
        """
        Marca o evento como falho após esgotar tentativas.
        
        Args:
            error_message: Mensagem de erro para registro
        """
        self.status = OutboxEventStatus.FAILED
        self.last_error = error_message
        self.last_attempt_at = timezone.now()
        self.save(update_fields=['status', 'last_error', 'last_attempt_at', 'updated_at'])
    
    def increment_attempt(self, error_message: str = None):
        """
        Incrementa contador de tentativas e registra erro se fornecido.
        
        Args:
            error_message: Mensagem de erro opcional
            
        Returns:
            bool: True se ainda há tentativas restantes, False se deve marcar como failed
        """
        self.attempts += 1
        self.last_attempt_at = timezone.now()
        
        if error_message:
            self.last_error = error_message
        
        if self.attempts >= self.max_attempts:
            self.status = OutboxEventStatus.FAILED
            self.save(update_fields=['attempts', 'last_attempt_at', 'last_error', 'status', 'updated_at'])
            return False
        
        self.save(update_fields=['attempts', 'last_attempt_at', 'last_error', 'updated_at'])
        return True
    
    @property
    def can_retry(self) -> bool:
        """Verifica se o evento pode ser reprocessado."""
        return self.status != OutboxEventStatus.PROCESSED and self.attempts < self.max_attempts
    
    @property
    def event_data(self) -> dict:
        """Retorna o campo 'data' do payload, ou payload completo se não existir."""
        if isinstance(self.payload, dict):
            return self.payload.get('data', self.payload)
        return {}
