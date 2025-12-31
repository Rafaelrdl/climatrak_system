"""
Testes para as tasks Celery de processamento de eventos.

Testa:
- Registro de handlers
- process_outbox_event task
- dispatch_pending_events task
- retry_failed_events task
"""

import uuid
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from django_tenants.test.cases import TenantTestCase

from apps.core_events.models import OutboxEvent, OutboxEventStatus
from apps.core_events.tasks import (
    _event_handlers,
    cleanup_old_events,
    dispatch_pending_events,
    get_event_handler,
    get_registered_events,
    process_outbox_event,
    register_event_handler,
    retry_failed_events,
)


class EventHandlerRegistryTest(TestCase):
    """Testes para o registro de handlers de eventos.

    Nota: Este teste usa TestCase padrão pois não acessa o banco de dados.
    """

    def setUp(self):
        """Limpar registry antes de cada teste."""
        # Salvar handlers existentes
        self._original_handlers = _event_handlers.copy()
        _event_handlers.clear()

    def tearDown(self):
        """Restaurar handlers originais após cada teste."""
        _event_handlers.clear()
        _event_handlers.update(self._original_handlers)

    def test_register_event_handler(self):
        """Testa registro de handler via decorator."""

        @register_event_handler("test.registered")
        def test_handler(event):
            pass

        self.assertIn("test.registered", get_registered_events())
        self.assertEqual(get_event_handler("test.registered"), test_handler)

    def test_get_event_handler_returns_none_for_unknown(self):
        """Testa que get_event_handler retorna None para evento desconhecido."""
        handler = get_event_handler("unknown.event")
        self.assertIsNone(handler)

    def test_get_registered_events_returns_list(self):
        """Testa que get_registered_events retorna lista de eventos."""

        @register_event_handler("event.one")
        def handler_one(event):
            pass

        @register_event_handler("event.two")
        def handler_two(event):
            pass

        events = get_registered_events()
        self.assertIn("event.one", events)
        self.assertIn("event.two", events)


class ProcessOutboxEventTaskTest(TenantTestCase):
    """Testes para a task process_outbox_event."""

    def setUp(self):
        """Setup comum para os testes."""
        super().setUp()
        self.tenant_id = uuid.uuid4()
        # Salvar handlers originais
        self._original_handlers = _event_handlers.copy()
        _event_handlers.clear()

    def tearDown(self):
        """Restaurar handlers originais."""
        _event_handlers.clear()
        _event_handlers.update(self._original_handlers)

    def _create_event(self, event_name="test.event", **kwargs):
        """Helper para criar evento."""
        defaults = {
            "tenant_id": self.tenant_id,
            "event_name": event_name,
            "aggregate_type": "test",
            "aggregate_id": uuid.uuid4(),
            "occurred_at": timezone.now(),
            "payload": {"data": {}},
            "idempotency_key": str(uuid.uuid4()),
        }
        defaults.update(kwargs)
        return OutboxEvent.objects.create(**defaults)

    def test_process_event_calls_handler(self):
        """Testa que handler é chamado para evento."""
        handler_called = {"called": False, "event": None}

        @register_event_handler("test.processed")
        def test_handler(event):
            handler_called["called"] = True
            handler_called["event"] = event

        event = self._create_event(event_name="test.processed")

        # Executar task diretamente (sem Celery)
        process_outbox_event(str(event.id))

        self.assertTrue(handler_called["called"])
        self.assertEqual(handler_called["event"].id, event.id)

    def test_process_event_marks_processed(self):
        """Testa que evento é marcado como processed após sucesso."""

        @register_event_handler("test.success")
        def success_handler(event):
            pass  # Sucesso

        event = self._create_event(event_name="test.success")

        process_outbox_event(str(event.id))

        event.refresh_from_db()
        self.assertEqual(event.status, OutboxEventStatus.PROCESSED)
        self.assertIsNotNone(event.processed_at)

    def test_process_event_increments_attempt_on_error(self):
        """Testa que tentativas são incrementadas em caso de erro."""

        @register_event_handler("test.error")
        def error_handler(event):
            raise ValueError("Test error")

        event = self._create_event(event_name="test.error", max_attempts=5)

        with self.assertRaises(ValueError):
            process_outbox_event(str(event.id))

        event.refresh_from_db()
        self.assertEqual(event.attempts, 1)
        self.assertIn("ValueError", event.last_error)

    def test_process_event_marks_failed_when_no_handler(self):
        """Testa que evento é marcado failed quando não há handler."""
        event = self._create_event(event_name="unknown.event")

        process_outbox_event(str(event.id))

        event.refresh_from_db()
        self.assertEqual(event.status, OutboxEventStatus.FAILED)
        self.assertIn("No handler registered", event.last_error)

    def test_process_event_skips_already_processed(self):
        """Testa que eventos já processados são ignorados."""

        @register_event_handler("test.skip")
        def handler(event):
            raise Exception("Should not be called")

        event = self._create_event(
            event_name="test.skip",
            status=OutboxEventStatus.PROCESSED,
        )

        # Não deve levantar exceção
        process_outbox_event(str(event.id))

    def test_process_event_handles_missing_event(self):
        """Testa que evento inexistente é tratado graciosamente."""
        fake_id = str(uuid.uuid4())

        # Não deve levantar exceção
        process_outbox_event(fake_id)


class DispatchPendingEventsTaskTest(TenantTestCase):
    """Testes para a task dispatch_pending_events."""

    def setUp(self):
        """Setup comum para os testes."""
        super().setUp()
        self.tenant_id = uuid.uuid4()

    def _create_event(self, status=OutboxEventStatus.PENDING, **kwargs):
        """Helper para criar evento."""
        defaults = {
            "tenant_id": self.tenant_id,
            "event_name": "test.event",
            "aggregate_type": "test",
            "aggregate_id": uuid.uuid4(),
            "occurred_at": timezone.now(),
            "payload": {"data": {}},
            "idempotency_key": str(uuid.uuid4()),
            "status": status,
        }
        defaults.update(kwargs)
        return OutboxEvent.objects.create(**defaults)

    @patch("apps.core_events.tasks.process_outbox_event.delay")
    def test_dispatch_schedules_pending_events(self, mock_delay):
        """Testa que eventos pendentes são agendados para processamento."""
        # Criar 3 eventos pendentes
        events = [self._create_event() for _ in range(3)]

        result = dispatch_pending_events(batch_size=10)

        self.assertEqual(result["dispatched"], 3)
        self.assertEqual(mock_delay.call_count, 3)

    @patch("apps.core_events.tasks.process_outbox_event.delay")
    def test_dispatch_respects_batch_size(self, mock_delay):
        """Testa que batch_size é respeitado."""
        # Criar 5 eventos
        for _ in range(5):
            self._create_event()

        result = dispatch_pending_events(batch_size=2)

        self.assertEqual(result["dispatched"], 2)
        self.assertEqual(mock_delay.call_count, 2)

    @patch("apps.core_events.tasks.process_outbox_event.delay")
    def test_dispatch_ignores_processed_events(self, mock_delay):
        """Testa que eventos processados são ignorados."""
        # Criar eventos em diferentes status
        self._create_event(status=OutboxEventStatus.PENDING)
        self._create_event(status=OutboxEventStatus.PROCESSED)
        self._create_event(status=OutboxEventStatus.FAILED)

        result = dispatch_pending_events(batch_size=10)

        self.assertEqual(result["dispatched"], 1)

    @patch("apps.core_events.tasks.process_outbox_event.delay")
    def test_dispatch_filters_by_tenant(self, mock_delay):
        """Testa filtro por tenant."""
        tenant_1 = uuid.uuid4()
        tenant_2 = uuid.uuid4()

        # Criar eventos em tenants diferentes
        self._create_event(tenant_id=tenant_1)
        self._create_event(tenant_id=tenant_1)
        self._create_event(tenant_id=tenant_2)

        result = dispatch_pending_events(batch_size=10, tenant_id=str(tenant_1))

        self.assertEqual(result["dispatched"], 2)

    @patch("apps.core_events.tasks.process_outbox_event.delay")
    def test_dispatch_returns_zero_when_no_pending(self, mock_delay):
        """Testa retorno quando não há eventos pendentes."""
        result = dispatch_pending_events(batch_size=10)

        self.assertEqual(result["dispatched"], 0)
        mock_delay.assert_not_called()


class RetryFailedEventsTaskTest(TenantTestCase):
    """Testes para a task retry_failed_events."""

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

    @patch("apps.core_events.tasks.dispatch_pending_events.delay")
    def test_retry_resets_failed_events(self, mock_dispatch):
        """Testa que retry reseta eventos falhos."""
        # Criar eventos falhos
        for _ in range(3):
            self._create_failed_event()

        result = retry_failed_events(batch_size=10, tenant_id=str(self.tenant_id))

        self.assertEqual(result["reset"], 3)
        mock_dispatch.assert_called_once()

    @patch("apps.core_events.tasks.dispatch_pending_events.delay")
    def test_retry_does_not_dispatch_when_zero(self, mock_dispatch):
        """Testa que dispatch não é chamado quando não há eventos."""
        result = retry_failed_events(batch_size=10)

        self.assertEqual(result["reset"], 0)
        mock_dispatch.assert_not_called()


class CleanupOldEventsTaskTest(TenantTestCase):
    """Testes para a task cleanup_old_events."""

    def setUp(self):
        """Setup comum para os testes."""
        super().setUp()
        self.tenant_id = uuid.uuid4()

    def test_cleanup_removes_old_processed_events(self):
        """Testa que eventos processados antigos são removidos."""
        from datetime import timedelta

        # Criar evento antigo (40 dias atrás)
        old_event = OutboxEvent.objects.create(
            tenant_id=self.tenant_id,
            event_name="old.event",
            aggregate_type="test",
            aggregate_id=uuid.uuid4(),
            occurred_at=timezone.now() - timedelta(days=40),
            payload={"data": {}},
            idempotency_key=str(uuid.uuid4()),
            status=OutboxEventStatus.PROCESSED,
        )
        # Atualizar created_at manualmente
        OutboxEvent.objects.filter(id=old_event.id).update(
            created_at=timezone.now() - timedelta(days=40)
        )

        # Criar evento recente
        OutboxEvent.objects.create(
            tenant_id=self.tenant_id,
            event_name="recent.event",
            aggregate_type="test",
            aggregate_id=uuid.uuid4(),
            occurred_at=timezone.now(),
            payload={"data": {}},
            idempotency_key=str(uuid.uuid4()),
            status=OutboxEventStatus.PROCESSED,
        )

        result = cleanup_old_events(days=30, status="processed")

        self.assertEqual(result["deleted"], 1)
        # Verificar que evento recente ainda existe
        self.assertEqual(OutboxEvent.objects.count(), 1)

    def test_cleanup_respects_status_filter(self):
        """Testa que apenas eventos do status especificado são removidos."""
        from datetime import timedelta

        # Criar evento failed antigo
        failed_event = OutboxEvent.objects.create(
            tenant_id=self.tenant_id,
            event_name="failed.event",
            aggregate_type="test",
            aggregate_id=uuid.uuid4(),
            occurred_at=timezone.now() - timedelta(days=40),
            payload={"data": {}},
            idempotency_key=str(uuid.uuid4()),
            status=OutboxEventStatus.FAILED,
        )
        OutboxEvent.objects.filter(id=failed_event.id).update(
            created_at=timezone.now() - timedelta(days=40)
        )

        # Cleanup de processed não deve afetar failed
        result = cleanup_old_events(days=30, status="processed")

        self.assertEqual(result["deleted"], 0)
        self.assertEqual(OutboxEvent.objects.count(), 1)
