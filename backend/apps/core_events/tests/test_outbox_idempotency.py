"""
Testes de Outbox + Consumers Idempotentes (Regras Não-Negociáveis)

Verifica que:
1. Consumer processa 1 vez mesmo com reentrega
2. Retry não duplica efeitos colaterais
3. "At least once" do mundo real ≠ duplicação de ledger

Referência:
- .github/copilot-instructions.md (seção Eventos)
- docs/events/01-contrato-eventos.md
- apps/core_events/models.py (OutboxEvent)
"""

import uuid
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.db import IntegrityError, transaction
from django.utils import timezone

from django_tenants.test.cases import TenantTestCase

from apps.core_events.models import OutboxEvent, OutboxEventStatus
from apps.core_events.services import EventPublisher
from apps.core_events.tasks import (
    get_event_handler,
    process_outbox_event,
    register_event_handler,
)
from apps.finance.models import CostCenter, CostTransaction


class OutboxIdempotencyTests(TenantTestCase):
    """
    Testes de idempotência da Outbox.
    
    REGRA: Consumer processa 1 vez mesmo com reentrega.
    """

    def setUp(self):
        """Setup de dados para testes."""
        super().setUp()
        self.tenant_id = uuid.uuid4()
        self.aggregate_id = uuid.uuid4()

    def test_duplicate_idempotency_key_raises_integrity_error(self):
        """
        Chave de idempotência duplicada no mesmo tenant deve falhar.
        
        Garante unicidade: (tenant_id, idempotency_key)
        """
        key = "unique-key-test"

        # Primeiro evento - sucesso
        event1 = EventPublisher.publish(
            tenant_id=self.tenant_id,
            event_name="test.event",
            aggregate_type="test",
            aggregate_id=self.aggregate_id,
            data={"test": "data"},
            idempotency_key=key,
        )
        self.assertIsNotNone(event1)

        # Segundo evento com mesma chave - deve falhar
        with self.assertRaises(IntegrityError):
            EventPublisher.publish(
                tenant_id=self.tenant_id,
                event_name="test.event",
                aggregate_type="test",
                aggregate_id=uuid.uuid4(),
                data={"different": "data"},
                idempotency_key=key,
            )

    def test_same_key_different_tenant_allowed(self):
        """
        Mesma chave em tenants diferentes deve ser permitida.
        
        Idempotência é por tenant, não global.
        """
        key = "cross-tenant-key"
        tenant1 = uuid.uuid4()
        tenant2 = uuid.uuid4()

        # Evento no tenant 1
        event1, created1 = EventPublisher.publish_idempotent(
            tenant_id=tenant1,
            event_name="test.event",
            aggregate_type="test",
            aggregate_id=self.aggregate_id,
            data={},
            idempotency_key=key,
        )

        # Evento no tenant 2 com mesma chave - deve criar
        event2, created2 = EventPublisher.publish_idempotent(
            tenant_id=tenant2,
            event_name="test.event",
            aggregate_type="test",
            aggregate_id=self.aggregate_id,
            data={},
            idempotency_key=key,
        )

        self.assertTrue(created1)
        self.assertTrue(created2)
        self.assertNotEqual(event1.id, event2.id)

    def test_publish_idempotent_returns_existing_on_duplicate(self):
        """
        publish_idempotent deve retornar evento existente sem criar novo.
        
        Implementa padrão get_or_create para at-least-once.
        """
        key = "idempotent-test"

        # Primeira publicação
        event1, created1 = EventPublisher.publish_idempotent(
            tenant_id=self.tenant_id,
            event_name="test.event",
            aggregate_type="test",
            aggregate_id=self.aggregate_id,
            data={"first": "call"},
            idempotency_key=key,
        )

        # Segunda publicação - deve retornar o existente
        event2, created2 = EventPublisher.publish_idempotent(
            tenant_id=self.tenant_id,
            event_name="test.event.different",  # Nome diferente!
            aggregate_type="different",
            aggregate_id=uuid.uuid4(),
            data={"second": "call"},
            idempotency_key=key,
        )

        self.assertTrue(created1)
        self.assertFalse(created2)
        self.assertEqual(event1.id, event2.id)
        # Dados originais preservados
        self.assertEqual(event2.event_name, "test.event")


class ConsumerRedeliveryTests(TenantTestCase):
    """
    Testes para garantir que reentrega não causa duplicação.
    
    REGRA: Consumer processa 1 vez mesmo com reentrega.
    """

    def setUp(self):
        """Setup de dados para testes."""
        super().setUp()
        self.tenant_id = uuid.uuid4()
        self.processing_count = 0

    def test_processed_event_is_not_reprocessed(self):
        """
        Evento já processado não deve ser reprocessado.
        
        Task deve verificar status antes de executar handler.
        """
        # Criar evento e marcar como processado
        event = OutboxEvent.objects.create(
            tenant_id=self.tenant_id,
            event_name="test.processed",
            aggregate_type="test",
            aggregate_id=uuid.uuid4(),
            occurred_at=timezone.now(),
            payload={"data": {}},
            idempotency_key=f"processed-{uuid.uuid4()}",
            status=OutboxEventStatus.PROCESSED,
            processed_at=timezone.now(),
        )

        # Tentar processar novamente
        process_outbox_event(str(event.id))

        # Deve permanecer processado (não reprocessar)
        event.refresh_from_db()
        self.assertEqual(event.status, OutboxEventStatus.PROCESSED)

    def test_failed_event_with_max_attempts_not_retried(self):
        """
        Evento que atingiu max_attempts não deve ser reprocessado automaticamente.
        """
        event = OutboxEvent.objects.create(
            tenant_id=self.tenant_id,
            event_name="test.failed",
            aggregate_type="test",
            aggregate_id=uuid.uuid4(),
            occurred_at=timezone.now(),
            payload={"data": {}},
            idempotency_key=f"failed-{uuid.uuid4()}",
            status=OutboxEventStatus.FAILED,
            attempts=5,
            max_attempts=5,
            last_error="Max attempts reached",
        )

        # Tentar processar
        process_outbox_event(str(event.id))

        # Deve permanecer failed
        event.refresh_from_db()
        self.assertEqual(event.status, OutboxEventStatus.FAILED)

    def test_pending_event_with_no_handler_marks_failed(self):
        """
        Evento sem handler registrado deve ser marcado como failed.
        """
        event = OutboxEvent.objects.create(
            tenant_id=self.tenant_id,
            event_name="unregistered.event.type",
            aggregate_type="test",
            aggregate_id=uuid.uuid4(),
            occurred_at=timezone.now(),
            payload={"data": {}},
            idempotency_key=f"nohandler-{uuid.uuid4()}",
            status=OutboxEventStatus.PENDING,
        )

        # Processar (não deve haver handler)
        process_outbox_event(str(event.id))

        # Deve estar failed por falta de handler
        event.refresh_from_db()
        self.assertEqual(event.status, OutboxEventStatus.FAILED)
        self.assertIn("No handler", event.last_error)


class RetryNoSideEffectTests(TenantTestCase):
    """
    Testes para garantir que retry não duplica efeitos colaterais.
    
    REGRA: Retry não duplica efeitos colaterais.
    """

    def setUp(self):
        """Setup de dados para testes."""
        super().setUp()
        self.tenant_id = str(uuid.uuid4())
        self.cost_center = CostCenter.objects.create(
            code="CC-RETRY-TEST",
            name="Retry Test Cost Center",
            is_active=True,
        )

    def test_cost_engine_idempotent_on_retry(self):
        """
        Cost Engine deve ser idempotente em reprocessamento.
        
        Processar mesmo evento 2x não deve criar transações duplicadas.
        """
        from apps.finance.cost_engine import CostEngineService

        work_order_id = str(uuid.uuid4())
        event_data = {
            "work_order_id": work_order_id,
            "work_order_number": "OS-RETRY-001",
            "asset_id": str(uuid.uuid4()),
            "cost_center_id": str(self.cost_center.id),
            "category": "preventive",
            "completed_at": timezone.now().isoformat(),
            "labor": [
                {
                    "time_entry_id": str(uuid.uuid4()),
                    "role": "Técnico",
                    "hours": 2.0,
                    "hourly_rate": 100.00,
                },
            ],
            "parts": [],
            "third_party": [],
        }

        # Primeiro processamento
        result1 = CostEngineService.process_work_order_closed(
            event_data=event_data,
            tenant_id=self.tenant_id,
        )

        self.assertTrue(result1["success"])
        self.assertEqual(result1["transactions_created"], 1)
        self.assertEqual(result1["skipped"], 0)

        # Segundo processamento (simulando retry)
        result2 = CostEngineService.process_work_order_closed(
            event_data=event_data,
            tenant_id=self.tenant_id,
        )

        self.assertTrue(result2["success"])
        self.assertEqual(result2["transactions_created"], 0)  # Nenhuma nova
        self.assertEqual(result2["skipped"], 1)  # Uma pulada

        # Verificar que só existe 1 transação
        txs = CostTransaction.objects.filter(
            idempotency_key__startswith=f"wo:{work_order_id}:"
        )
        self.assertEqual(txs.count(), 1)

    def test_event_publishing_idempotent_on_retry(self):
        """
        Publicação de eventos deve ser idempotente.
        
        Se handler falha após publicar evento, reprocessamento não duplica.
        """
        key = f"retry-publish-{uuid.uuid4()}"

        # Simula primeira tentativa: publica evento
        event1, created1 = EventPublisher.publish_idempotent(
            tenant_id=self.tenant_id,
            event_name="cost.entry_posted",
            aggregate_type="cost_transaction",
            aggregate_id=uuid.uuid4(),
            data={"transaction_id": str(uuid.uuid4())},
            idempotency_key=key,
        )

        # Simula retry: tenta publicar novamente
        event2, created2 = EventPublisher.publish_idempotent(
            tenant_id=self.tenant_id,
            event_name="cost.entry_posted",
            aggregate_type="cost_transaction",
            aggregate_id=uuid.uuid4(),
            data={"different": "data"},
            idempotency_key=key,
        )

        self.assertTrue(created1)
        self.assertFalse(created2)

        # Apenas 1 evento com essa chave
        count = OutboxEvent.objects.filter(idempotency_key=key).count()
        self.assertEqual(count, 1)


class AtLeastOnceDeliveryTests(TenantTestCase):
    """
    Testes para garantir at-least-once não duplica ledger.
    
    REGRA: "At least once" do mundo real ≠ duplicação de ledger.
    """

    def setUp(self):
        """Setup de dados para testes."""
        super().setUp()
        self.tenant_id = str(uuid.uuid4())
        self.cost_center = CostCenter.objects.create(
            code="CC-ATLEAST",
            name="At Least Once Test",
            is_active=True,
        )

    def test_ledger_idempotency_key_prevents_duplicates(self):
        """
        idempotency_key no CostTransaction previne duplicação no ledger.
        
        Mesmo que handler seja chamado múltiplas vezes.
        """
        key = f"wo:{uuid.uuid4()}:labor"

        # Primeira transação
        tx1, created1 = CostTransaction.get_or_create_idempotent(
            idempotency_key=key,
            defaults={
                "cost_center": self.cost_center,
                "transaction_type": CostTransaction.TransactionType.LABOR,
                "category": CostTransaction.Category.PREVENTIVE,
                "amount": Decimal("500.00"),
                "occurred_at": timezone.now(),
                "description": "First attempt",
            },
        )

        # Segunda tentativa (simulando at-least-once)
        tx2, created2 = CostTransaction.get_or_create_idempotent(
            idempotency_key=key,
            defaults={
                "cost_center": self.cost_center,
                "transaction_type": CostTransaction.TransactionType.LABOR,
                "category": CostTransaction.Category.PREVENTIVE,
                "amount": Decimal("999.00"),  # Valor diferente!
                "occurred_at": timezone.now(),
                "description": "Second attempt",
            },
        )

        self.assertTrue(created1)
        self.assertFalse(created2)
        self.assertEqual(tx1.pk, tx2.pk)
        # Valor original preservado
        self.assertEqual(tx2.amount, Decimal("500.00"))

    def test_unique_constraint_enforces_idempotency(self):
        """
        UniqueConstraint no banco previne race conditions.
        
        Garantia em nível de banco, não apenas aplicação.
        Nota: Django valida antes de enviar ao banco, então pode ser
        IntegrityError (banco) ou ValidationError (Django validation).
        """
        from django.core.exceptions import ValidationError

        key = f"wo:{uuid.uuid4()}:parts"

        # Criar primeira transação
        CostTransaction.objects.create(
            idempotency_key=key,
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.PARTS,
            category=CostTransaction.Category.PARTS,
            amount=Decimal("200.00"),
            occurred_at=timezone.now(),
            description="Original transaction",
        )

        # Tentar criar duplicata - deve ser rejeitada (IntegrityError ou ValidationError)
        with self.assertRaises((IntegrityError, ValidationError)):
            with transaction.atomic():
                CostTransaction.objects.create(
                    idempotency_key=key,
                    cost_center=self.cost_center,
                    transaction_type=CostTransaction.TransactionType.PARTS,
                    category=CostTransaction.Category.PARTS,
                    amount=Decimal("999.00"),
                    occurred_at=timezone.now(),
                    description="Duplicate attempt",
                )

    def test_deterministic_idempotency_key_generation(self):
        """
        Chave de idempotência deve ser determinística.
        
        Mesma entrada sempre gera mesma chave.
        """
        work_order_id = str(uuid.uuid4())

        key1 = CostTransaction.generate_idempotency_key(work_order_id, "labor")
        key2 = CostTransaction.generate_idempotency_key(work_order_id, "labor")
        key3 = CostTransaction.generate_idempotency_key(work_order_id, "parts")

        self.assertEqual(key1, key2)  # Mesma entrada = mesma chave
        self.assertNotEqual(key1, key3)  # Tipo diferente = chave diferente
        self.assertEqual(key1, f"wo:{work_order_id}:labor")

    def test_event_count_not_inflated_by_reprocessing(self):
        """
        Reprocessamento não deve inflar contagem de eventos.
        """
        from apps.finance.cost_engine import CostEngineService

        work_order_id = str(uuid.uuid4())
        event_data = {
            "work_order_id": work_order_id,
            "asset_id": str(uuid.uuid4()),
            "cost_center_id": str(self.cost_center.id),
            "category": "corrective",
            "labor": [{"role": "Tech", "hours": 1.0, "hourly_rate": 80.00}],
            "parts": [{"part_name": "Filter", "qty": 1, "unit_cost": 50.00}],
            "third_party": [],
        }

        # Processar 3 vezes (simulando múltiplas entregas)
        for i in range(3):
            CostEngineService.process_work_order_closed(
                event_data=event_data,
                tenant_id=self.tenant_id,
            )

        # Deve ter apenas 2 transações (labor + parts), não 6
        tx_count = CostTransaction.objects.filter(
            idempotency_key__startswith=f"wo:{work_order_id}:"
        ).count()
        self.assertEqual(tx_count, 2)

        # Eventos publicados também não devem duplicar
        event_count = OutboxEvent.objects.filter(
            event_name="cost.entry_posted",
        ).count()
        # Deve ter apenas os eventos únicos
        self.assertLessEqual(event_count, 2)


class EventAttemptTrackingTests(TenantTestCase):
    """
    Testes para rastreamento de tentativas de processamento.
    """

    def setUp(self):
        """Setup de dados para testes."""
        super().setUp()
        self.tenant_id = uuid.uuid4()

    def test_attempt_increment_on_failure(self):
        """Tentativa deve ser incrementada em cada falha."""
        event = OutboxEvent.objects.create(
            tenant_id=self.tenant_id,
            event_name="test.track",
            aggregate_type="test",
            aggregate_id=uuid.uuid4(),
            occurred_at=timezone.now(),
            payload={"data": {}},
            idempotency_key=f"track-{uuid.uuid4()}",
            status=OutboxEventStatus.PENDING,
            attempts=0,
        )

        # Simular falhas
        event.increment_attempt("Error 1")
        self.assertEqual(event.attempts, 1)
        self.assertEqual(event.last_error, "Error 1")

        event.increment_attempt("Error 2")
        self.assertEqual(event.attempts, 2)
        self.assertEqual(event.last_error, "Error 2")

    def test_max_attempts_marks_failed(self):
        """Ao atingir max_attempts, evento deve ser marcado como failed."""
        event = OutboxEvent.objects.create(
            tenant_id=self.tenant_id,
            event_name="test.maxattempt",
            aggregate_type="test",
            aggregate_id=uuid.uuid4(),
            occurred_at=timezone.now(),
            payload={"data": {}},
            idempotency_key=f"max-{uuid.uuid4()}",
            status=OutboxEventStatus.PENDING,
            attempts=4,
            max_attempts=5,
        )

        # Última tentativa
        can_retry = event.increment_attempt("Final error")

        self.assertFalse(can_retry)
        self.assertEqual(event.status, OutboxEventStatus.FAILED)
        self.assertEqual(event.attempts, 5)

    def test_can_retry_property(self):
        """Propriedade can_retry deve refletir estado correto."""
        event = OutboxEvent.objects.create(
            tenant_id=self.tenant_id,
            event_name="test.canretry",
            aggregate_type="test",
            aggregate_id=uuid.uuid4(),
            occurred_at=timezone.now(),
            payload={"data": {}},
            idempotency_key=f"canretry-{uuid.uuid4()}",
            status=OutboxEventStatus.PENDING,
            attempts=0,
            max_attempts=3,
        )

        self.assertTrue(event.can_retry)

        # Após algumas tentativas
        event.attempts = 2
        self.assertTrue(event.can_retry)

        # Ao atingir máximo
        event.attempts = 3
        self.assertFalse(event.can_retry)

        # Se processado
        event.status = OutboxEventStatus.PROCESSED
        self.assertFalse(event.can_retry)
