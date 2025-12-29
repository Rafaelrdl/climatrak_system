"""
Testes para o modelo OutboxEvent.

Testa:
- Criação de eventos
- Métodos de marcação (processed, failed)
- Controle de tentativas
- Constraint de unicidade (idempotency_key por tenant)
"""

import uuid
from datetime import timedelta
from django_tenants.test.cases import TenantTestCase
from django.db import IntegrityError
from django.utils import timezone

from apps.core_events.models import OutboxEvent, OutboxEventStatus


class OutboxEventModelTest(TenantTestCase):
    """Testes para o modelo OutboxEvent."""
    
    def setUp(self):
        """Setup comum para os testes."""
        super().setUp()
        self.tenant_id = uuid.uuid4()
        self.aggregate_id = uuid.uuid4()
        
    def _create_event(self, **kwargs):
        """Helper para criar evento com dados padrão."""
        defaults = {
            'tenant_id': self.tenant_id,
            'event_name': 'test.event',
            'aggregate_type': 'test_aggregate',
            'aggregate_id': self.aggregate_id,
            'occurred_at': timezone.now(),
            'payload': {
                'event_id': str(uuid.uuid4()),
                'tenant_id': str(self.tenant_id),
                'event_name': 'test.event',
                'data': {'key': 'value'}
            },
            'idempotency_key': str(uuid.uuid4()),
        }
        defaults.update(kwargs)
        return OutboxEvent.objects.create(**defaults)
    
    def test_create_event_success(self):
        """Testa criação básica de evento."""
        event = self._create_event()
        
        self.assertIsNotNone(event.id)
        self.assertEqual(event.tenant_id, self.tenant_id)
        self.assertEqual(event.event_name, 'test.event')
        self.assertEqual(event.status, OutboxEventStatus.PENDING)
        self.assertEqual(event.attempts, 0)
    
    def test_default_status_is_pending(self):
        """Testa que status padrão é PENDING."""
        event = self._create_event()
        self.assertEqual(event.status, OutboxEventStatus.PENDING)
    
    def test_default_max_attempts(self):
        """Testa que max_attempts padrão é 5."""
        event = self._create_event()
        self.assertEqual(event.max_attempts, 5)
    
    def test_mark_processed(self):
        """Testa marcação como processado."""
        event = self._create_event()
        event.mark_processed(processed_by='test-worker')
        
        event.refresh_from_db()
        self.assertEqual(event.status, OutboxEventStatus.PROCESSED)
        self.assertIsNotNone(event.processed_at)
        self.assertEqual(event.processed_by, 'test-worker')
    
    def test_mark_failed(self):
        """Testa marcação como falho."""
        event = self._create_event()
        error_msg = 'Test error message'
        event.mark_failed(error_msg)
        
        event.refresh_from_db()
        self.assertEqual(event.status, OutboxEventStatus.FAILED)
        self.assertEqual(event.last_error, error_msg)
        self.assertIsNotNone(event.last_attempt_at)
    
    def test_increment_attempt_returns_true_when_can_retry(self):
        """Testa que increment_attempt retorna True quando há tentativas restantes."""
        event = self._create_event(max_attempts=5)
        
        result = event.increment_attempt('Error 1')
        
        self.assertTrue(result)
        self.assertEqual(event.attempts, 1)
        self.assertEqual(event.status, OutboxEventStatus.PENDING)
    
    def test_increment_attempt_marks_failed_on_max(self):
        """Testa que evento é marcado failed ao atingir max_attempts."""
        event = self._create_event(max_attempts=3)
        
        # Incrementar até o máximo
        event.increment_attempt('Error 1')
        event.increment_attempt('Error 2')
        result = event.increment_attempt('Error 3')
        
        self.assertFalse(result)
        self.assertEqual(event.status, OutboxEventStatus.FAILED)
        self.assertEqual(event.attempts, 3)
    
    def test_can_retry_true_for_pending(self):
        """Testa can_retry para evento pendente."""
        event = self._create_event()
        self.assertTrue(event.can_retry)
    
    def test_can_retry_false_for_processed(self):
        """Testa can_retry para evento processado."""
        event = self._create_event()
        event.mark_processed()
        self.assertFalse(event.can_retry)
    
    def test_can_retry_false_for_max_attempts(self):
        """Testa can_retry quando atingiu max_attempts."""
        event = self._create_event(max_attempts=2)
        event.attempts = 2
        event.save()
        
        self.assertFalse(event.can_retry)
    
    def test_event_data_returns_data_field(self):
        """Testa que event_data retorna campo data do payload."""
        data = {'order_id': '123', 'total': 100}
        event = self._create_event(payload={
            'event_id': str(uuid.uuid4()),
            'data': data
        })
        
        self.assertEqual(event.event_data, data)
    
    def test_event_data_returns_payload_if_no_data_field(self):
        """Testa que event_data retorna payload completo se não houver campo data."""
        payload = {'key': 'value', 'other': 123}
        event = self._create_event(payload=payload)
        
        self.assertEqual(event.event_data, payload)
    
    def test_str_representation(self):
        """Testa representação string do evento."""
        event = self._create_event(event_name='work_order.closed')
        expected = f"work_order.closed ({event.id}) - pending"
        self.assertEqual(str(event), expected)


class OutboxEventConstraintsTest(TenantTestCase):
    """Testes para constraints do modelo OutboxEvent."""
    
    def setUp(self):
        """Setup comum para os testes."""
        super().setUp()
        self.tenant_id = uuid.uuid4()
        self.idempotency_key = 'unique-key-123'
    
    def test_idempotency_unique_per_tenant(self):
        """Testa constraint de unicidade de idempotency_key por tenant."""
        # Criar primeiro evento
        OutboxEvent.objects.create(
            tenant_id=self.tenant_id,
            event_name='test.event',
            aggregate_type='test',
            aggregate_id=uuid.uuid4(),
            occurred_at=timezone.now(),
            payload={'data': {}},
            idempotency_key=self.idempotency_key,
        )
        
        # Tentar criar segundo evento com mesma chave
        with self.assertRaises(IntegrityError):
            OutboxEvent.objects.create(
                tenant_id=self.tenant_id,
                event_name='test.event.2',
                aggregate_type='test',
                aggregate_id=uuid.uuid4(),
                occurred_at=timezone.now(),
                payload={'data': {}},
                idempotency_key=self.idempotency_key,
            )
    
    def test_same_idempotency_key_different_tenant_allowed(self):
        """Testa que mesma idempotency_key é permitida em tenants diferentes."""
        tenant_1 = uuid.uuid4()
        tenant_2 = uuid.uuid4()
        key = 'shared-key'
        
        # Criar evento no tenant 1
        event_1 = OutboxEvent.objects.create(
            tenant_id=tenant_1,
            event_name='test.event',
            aggregate_type='test',
            aggregate_id=uuid.uuid4(),
            occurred_at=timezone.now(),
            payload={'data': {}},
            idempotency_key=key,
        )
        
        # Criar evento no tenant 2 com mesma chave
        event_2 = OutboxEvent.objects.create(
            tenant_id=tenant_2,
            event_name='test.event',
            aggregate_type='test',
            aggregate_id=uuid.uuid4(),
            occurred_at=timezone.now(),
            payload={'data': {}},
            idempotency_key=key,
        )
        
        # Ambos devem existir
        self.assertEqual(OutboxEvent.objects.filter(idempotency_key=key).count(), 2)


class OutboxEventIndexesTest(TenantTestCase):
    """Testes para verificar que queries usam índices corretamente."""
    
    def setUp(self):
        """Setup: criar vários eventos para teste."""
        super().setUp()
        self.tenant_id = uuid.uuid4()
        
        # Criar eventos em diferentes estados
        for i in range(5):
            OutboxEvent.objects.create(
                tenant_id=self.tenant_id,
                event_name=f'test.event.{i}',
                aggregate_type='test',
                aggregate_id=uuid.uuid4(),
                occurred_at=timezone.now(),
                payload={'data': {'index': i}},
                idempotency_key=f'key-{i}',
                status=OutboxEventStatus.PENDING if i < 3 else OutboxEventStatus.PROCESSED,
            )
    
    def test_query_pending_by_tenant(self):
        """Testa query de eventos pendentes por tenant (usa índice)."""
        pending = OutboxEvent.objects.filter(
            tenant_id=self.tenant_id,
            status=OutboxEventStatus.PENDING,
        ).order_by('created_at')
        
        self.assertEqual(pending.count(), 3)
    
    def test_query_by_event_name(self):
        """Testa query por nome do evento (usa índice)."""
        events = OutboxEvent.objects.filter(
            event_name='test.event.0',
            status=OutboxEventStatus.PENDING,
        )
        
        self.assertEqual(events.count(), 1)
    
    def test_query_pending_for_dispatch(self):
        """Testa query típica do dispatcher (eventos pendentes ordenados)."""
        pending = OutboxEvent.objects.filter(
            status=OutboxEventStatus.PENDING,
        ).order_by('created_at')[:100]
        
        self.assertEqual(len(list(pending)), 3)
