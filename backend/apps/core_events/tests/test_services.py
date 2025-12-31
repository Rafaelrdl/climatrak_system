"""
Testes para o service EventPublisher.

Testa:
- Publicação de eventos
- Geração de idempotency_key
- Publicação idempotente (get_or_create)
- Formato do envelope de evento
"""

import uuid

from django.db import IntegrityError
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase

from apps.core_events.models import OutboxEvent, OutboxEventStatus
from apps.core_events.services import EventPublisher, EventRetrier


class EventPublisherTest(TenantTestCase):
    """Testes para o service EventPublisher."""

    def setUp(self):
        """Setup comum para os testes."""
        super().setUp()
        self.tenant_id = uuid.uuid4()
        self.aggregate_id = uuid.uuid4()
        self.event_name = "work_order.closed"
        self.aggregate_type = "work_order"
        self.data = {
            "order_number": "OS-001",
            "closed_by": "user-123",
            "labor_cost": 150.00,
        }

    def test_publish_creates_event(self):
        """Testa que publish cria evento na outbox."""
        event = EventPublisher.publish(
            tenant_id=self.tenant_id,
            event_name=self.event_name,
            aggregate_type=self.aggregate_type,
            aggregate_id=self.aggregate_id,
            data=self.data,
        )

        self.assertIsNotNone(event.id)
        self.assertEqual(event.tenant_id, self.tenant_id)
        self.assertEqual(event.event_name, self.event_name)
        self.assertEqual(event.aggregate_type, self.aggregate_type)
        self.assertEqual(event.aggregate_id, self.aggregate_id)
        self.assertEqual(event.status, OutboxEventStatus.PENDING)

    def test_publish_generates_idempotency_key(self):
        """Testa que idempotency_key é gerada automaticamente."""
        event = EventPublisher.publish(
            tenant_id=self.tenant_id,
            event_name=self.event_name,
            aggregate_type=self.aggregate_type,
            aggregate_id=self.aggregate_id,
            data=self.data,
        )

        self.assertIsNotNone(event.idempotency_key)
        self.assertTrue(len(event.idempotency_key) > 0)

    def test_publish_uses_provided_idempotency_key(self):
        """Testa que idempotency_key fornecida é usada."""
        custom_key = "my-custom-key-123"

        event = EventPublisher.publish(
            tenant_id=self.tenant_id,
            event_name=self.event_name,
            aggregate_type=self.aggregate_type,
            aggregate_id=self.aggregate_id,
            data=self.data,
            idempotency_key=custom_key,
        )

        self.assertEqual(event.idempotency_key, custom_key)

    def test_publish_payload_format(self):
        """Testa que payload segue formato de envelope correto."""
        event = EventPublisher.publish(
            tenant_id=self.tenant_id,
            event_name=self.event_name,
            aggregate_type=self.aggregate_type,
            aggregate_id=self.aggregate_id,
            data=self.data,
        )

        payload = event.payload

        # Verificar campos obrigatórios do envelope
        self.assertIn("event_id", payload)
        self.assertIn("tenant_id", payload)
        self.assertIn("event_name", payload)
        self.assertIn("occurred_at", payload)
        self.assertIn("aggregate", payload)
        self.assertIn("data", payload)

        # Verificar valores
        self.assertEqual(payload["event_name"], self.event_name)
        self.assertEqual(payload["tenant_id"], str(self.tenant_id))
        self.assertEqual(payload["aggregate"]["type"], self.aggregate_type)
        self.assertEqual(payload["aggregate"]["id"], str(self.aggregate_id))
        self.assertEqual(payload["data"], self.data)

    def test_publish_accepts_string_uuids(self):
        """Testa que publish aceita UUIDs como strings."""
        event = EventPublisher.publish(
            tenant_id=str(self.tenant_id),
            event_name=self.event_name,
            aggregate_type=self.aggregate_type,
            aggregate_id=str(self.aggregate_id),
            data=self.data,
        )

        self.assertEqual(event.tenant_id, self.tenant_id)
        self.assertEqual(event.aggregate_id, self.aggregate_id)

    def test_publish_uses_provided_occurred_at(self):
        """Testa que occurred_at fornecido é usado."""
        custom_time = timezone.now() - timezone.timedelta(hours=1)

        event = EventPublisher.publish(
            tenant_id=self.tenant_id,
            event_name=self.event_name,
            aggregate_type=self.aggregate_type,
            aggregate_id=self.aggregate_id,
            data=self.data,
            occurred_at=custom_time,
        )

        self.assertEqual(event.occurred_at, custom_time)

    def test_publish_with_custom_max_attempts(self):
        """Testa configuração de max_attempts."""
        event = EventPublisher.publish(
            tenant_id=self.tenant_id,
            event_name=self.event_name,
            aggregate_type=self.aggregate_type,
            aggregate_id=self.aggregate_id,
            data=self.data,
            max_attempts=10,
        )

        self.assertEqual(event.max_attempts, 10)

    def test_publish_duplicate_idempotency_key_raises_error(self):
        """Testa que chave duplicada no mesmo tenant gera erro."""
        key = "duplicate-key"

        # Primeiro evento
        EventPublisher.publish(
            tenant_id=self.tenant_id,
            event_name=self.event_name,
            aggregate_type=self.aggregate_type,
            aggregate_id=self.aggregate_id,
            data=self.data,
            idempotency_key=key,
        )

        # Segundo evento com mesma chave
        with self.assertRaises(IntegrityError):
            EventPublisher.publish(
                tenant_id=self.tenant_id,
                event_name="other.event",
                aggregate_type="other",
                aggregate_id=uuid.uuid4(),
                data={},
                idempotency_key=key,
            )


class EventPublisherIdempotentTest(TenantTestCase):
    """Testes para publicação idempotente."""

    def setUp(self):
        """Setup comum para os testes."""
        super().setUp()
        self.tenant_id = uuid.uuid4()
        self.aggregate_id = uuid.uuid4()
        self.idempotency_key = "idempotent-test-key"

    def test_publish_idempotent_creates_new(self):
        """Testa que publish_idempotent cria evento quando não existe."""
        event, created = EventPublisher.publish_idempotent(
            tenant_id=self.tenant_id,
            event_name="test.event",
            aggregate_type="test",
            aggregate_id=self.aggregate_id,
            data={"key": "value"},
            idempotency_key=self.idempotency_key,
        )

        self.assertTrue(created)
        self.assertIsNotNone(event.id)

    def test_publish_idempotent_returns_existing(self):
        """Testa que publish_idempotent retorna existente quando há duplicata."""
        # Primeiro evento
        event_1, created_1 = EventPublisher.publish_idempotent(
            tenant_id=self.tenant_id,
            event_name="test.event",
            aggregate_type="test",
            aggregate_id=self.aggregate_id,
            data={"key": "value"},
            idempotency_key=self.idempotency_key,
        )

        # Segundo evento com mesma chave
        event_2, created_2 = EventPublisher.publish_idempotent(
            tenant_id=self.tenant_id,
            event_name="different.event",  # Nome diferente
            aggregate_type="different",
            aggregate_id=uuid.uuid4(),
            data={"other": "data"},
            idempotency_key=self.idempotency_key,
        )

        self.assertTrue(created_1)
        self.assertFalse(created_2)
        self.assertEqual(event_1.id, event_2.id)

    def test_publish_idempotent_different_tenant_creates_new(self):
        """Testa que mesma chave em tenant diferente cria novo evento."""
        tenant_1 = uuid.uuid4()
        tenant_2 = uuid.uuid4()

        event_1, created_1 = EventPublisher.publish_idempotent(
            tenant_id=tenant_1,
            event_name="test.event",
            aggregate_type="test",
            aggregate_id=self.aggregate_id,
            data={},
            idempotency_key=self.idempotency_key,
        )

        event_2, created_2 = EventPublisher.publish_idempotent(
            tenant_id=tenant_2,
            event_name="test.event",
            aggregate_type="test",
            aggregate_id=self.aggregate_id,
            data={},
            idempotency_key=self.idempotency_key,
        )

        self.assertTrue(created_1)
        self.assertTrue(created_2)
        self.assertNotEqual(event_1.id, event_2.id)


class EventRetrierTest(TenantTestCase):
    """Testes para o service EventRetrier."""

    def setUp(self):
        """Setup comum para os testes."""
        super().setUp()
        self.tenant_id = uuid.uuid4()

    def _create_failed_event(self):
        """Helper para criar evento falho."""
        return OutboxEvent.objects.create(
            tenant_id=self.tenant_id,
            event_name="test.event",
            aggregate_type="test",
            aggregate_id=uuid.uuid4(),
            occurred_at=timezone.now(),
            payload={"data": {}},
            idempotency_key=str(uuid.uuid4()),
            status=OutboxEventStatus.FAILED,
            attempts=5,
            last_error="Test error",
        )

    def test_retry_event_resets_status(self):
        """Testa que retry_event reseta status para pending."""
        event = self._create_failed_event()

        retried = EventRetrier.retry_event(event.id)

        self.assertEqual(retried.status, OutboxEventStatus.PENDING)
        self.assertEqual(retried.attempts, 0)
        self.assertIsNone(retried.last_error)

    def test_retry_event_accepts_string_id(self):
        """Testa que retry_event aceita ID como string."""
        event = self._create_failed_event()

        retried = EventRetrier.retry_event(str(event.id))

        self.assertEqual(retried.id, event.id)
        self.assertEqual(retried.status, OutboxEventStatus.PENDING)

    def test_retry_failed_events_resets_multiple(self):
        """Testa retry de múltiplos eventos falhos."""
        # Criar 3 eventos falhos
        for _ in range(3):
            self._create_failed_event()

        count = EventRetrier.retry_failed_events(tenant_id=self.tenant_id)

        self.assertEqual(count, 3)

        # Verificar que todos foram resetados
        pending = OutboxEvent.objects.filter(
            tenant_id=self.tenant_id,
            status=OutboxEventStatus.PENDING,
        ).count()
        self.assertEqual(pending, 3)

    def test_retry_failed_events_respects_limit(self):
        """Testa que retry respeita limite."""
        # Criar 5 eventos falhos
        for _ in range(5):
            self._create_failed_event()

        count = EventRetrier.retry_failed_events(
            tenant_id=self.tenant_id,
            limit=2,
        )

        self.assertEqual(count, 2)

    def test_retry_failed_events_filters_by_event_name(self):
        """Testa filtro por nome do evento."""
        # Criar eventos com nomes diferentes
        OutboxEvent.objects.create(
            tenant_id=self.tenant_id,
            event_name="target.event",
            aggregate_type="test",
            aggregate_id=uuid.uuid4(),
            occurred_at=timezone.now(),
            payload={"data": {}},
            idempotency_key=str(uuid.uuid4()),
            status=OutboxEventStatus.FAILED,
        )
        OutboxEvent.objects.create(
            tenant_id=self.tenant_id,
            event_name="other.event",
            aggregate_type="test",
            aggregate_id=uuid.uuid4(),
            occurred_at=timezone.now(),
            payload={"data": {}},
            idempotency_key=str(uuid.uuid4()),
            status=OutboxEventStatus.FAILED,
        )

        count = EventRetrier.retry_failed_events(
            tenant_id=self.tenant_id,
            event_name="target.event",
        )

        self.assertEqual(count, 1)
