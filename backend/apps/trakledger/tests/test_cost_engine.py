"""
Tests for Cost Engine (FIN-004)

Testa:
1. Processamento do evento work_order.closed
2. Cálculo de custos (labor, parts, third_party)
3. Idempotência dos lançamentos
4. Emissão de eventos cost.entry_posted

NOTA: Usa django_tenants.test.cases.TenantTestCase para garantir que os testes
rodem em um schema de tenant isolado (modelos finance são tenant-specific).
"""

import uuid
from decimal import Decimal

from django.utils import timezone

from django_tenants.test.cases import TenantTestCase

from apps.core_events.models import OutboxEvent
from apps.trakledger.cost_engine import CostEngineError, CostEngineService
from apps.trakledger.models import CostCenter, CostTransaction, RateCard


class CostEngineTestCase(TenantTestCase):
    """Base test case with common setup for Cost Engine tests.

    Herda de TenantTestCase para criar automaticamente um tenant de teste
    e executar os testes dentro desse schema.
    """

    def setUp(self):
        """Set up test data."""
        super().setUp()
        # Usar UUID gerado para tenant_id (OutboxEvent.tenant_id é UUIDField)
        self.tenant_id = str(uuid.uuid4())

        # Create cost center
        self.cost_center = CostCenter.objects.create(
            code="CC001", name="Manutenção HVAC", is_active=True
        )

        # Create rate cards
        self.rate_card_tech = RateCard.objects.create(
            role="Técnico HVAC",
            role_code="TECH-HVAC",
            cost_per_hour=Decimal("85.00"),
            effective_from=timezone.now().date() - timezone.timedelta(days=365),
            is_active=True,
        )
        self.rate_card_senior = RateCard.objects.create(
            role="Técnico Sênior",
            role_code="TECH-SENIOR",
            cost_per_hour=Decimal("120.00"),
            effective_from=timezone.now().date() - timezone.timedelta(days=365),
            is_active=True,
        )

        # Sample work_order.closed event data
        self.work_order_id = str(uuid.uuid4())
        self.asset_id = str(uuid.uuid4())

        self.event_data = {
            "work_order_id": self.work_order_id,
            "work_order_number": "OS202412001",
            "asset_id": self.asset_id,
            "cost_center_id": str(self.cost_center.id),
            "category": "preventive",
            "completed_at": timezone.now().isoformat(),
            "labor": [
                {
                    "time_entry_id": str(uuid.uuid4()),
                    "role": "Técnico HVAC",
                    "role_code": "TECH-HVAC",
                    "hours": 2.5,
                    "hourly_rate": 85.00,
                    "work_date": str(timezone.now().date()),
                },
                {
                    "time_entry_id": str(uuid.uuid4()),
                    "role": "Técnico Sênior",
                    "role_code": "TECH-SENIOR",
                    "hours": 1.0,
                    "hourly_rate": 120.00,
                    "work_date": str(timezone.now().date()),
                },
            ],
            "parts": [
                {
                    "part_usage_id": str(uuid.uuid4()),
                    "part_id": str(uuid.uuid4()),
                    "part_name": "Filtro de Óleo",
                    "part_number": "FO-001",
                    "qty": 2,
                    "unit": "UN",
                    "unit_cost": 120.00,
                },
                {
                    "part_usage_id": str(uuid.uuid4()),
                    "part_id": str(uuid.uuid4()),
                    "part_name": "Correia",
                    "part_number": "COR-002",
                    "qty": 1,
                    "unit": "UN",
                    "unit_cost": 85.00,
                },
            ],
            "third_party": [
                {
                    "external_cost_id": str(uuid.uuid4()),
                    "cost_type": "SERVICE",
                    "supplier_name": "Calibra Serviços",
                    "description": "Calibração de sensores",
                    "amount": 800.00,
                    "invoice_number": "NF-2024-001",
                },
            ],
        }


class CostEngineProcessingTests(CostEngineTestCase):
    """Tests for CostEngineService.process_work_order_closed()"""

    def test_process_creates_labor_transaction(self):
        """Processing should create a labor CostTransaction."""
        result = CostEngineService.process_work_order_closed(
            event_data=self.event_data,
            tenant_id=self.tenant_id,
        )

        self.assertTrue(result["success"])

        # Verify labor transaction
        labor_tx = CostTransaction.objects.filter(
            idempotency_key=f"wo:{self.work_order_id}:labor"
        ).first()

        self.assertIsNotNone(labor_tx)
        self.assertEqual(
            labor_tx.transaction_type, CostTransaction.TransactionType.LABOR
        )
        self.assertEqual(labor_tx.category, CostTransaction.Category.PREVENTIVE)

        # Labor: (2.5 * 85) + (1.0 * 120) = 212.50 + 120.00 = 332.50
        self.assertEqual(labor_tx.amount, Decimal("332.50"))

    def test_process_creates_parts_transaction(self):
        """Processing should create a parts CostTransaction."""
        result = CostEngineService.process_work_order_closed(
            event_data=self.event_data,
            tenant_id=self.tenant_id,
        )

        self.assertTrue(result["success"])

        # Verify parts transaction
        parts_tx = CostTransaction.objects.filter(
            idempotency_key=f"wo:{self.work_order_id}:parts"
        ).first()

        self.assertIsNotNone(parts_tx)
        self.assertEqual(
            parts_tx.transaction_type, CostTransaction.TransactionType.PARTS
        )

        # Parts: (2 * 120) + (1 * 85) = 240 + 85 = 325
        self.assertEqual(parts_tx.amount, Decimal("325.00"))

    def test_process_creates_third_party_transaction(self):
        """Processing should create a third_party CostTransaction."""
        result = CostEngineService.process_work_order_closed(
            event_data=self.event_data,
            tenant_id=self.tenant_id,
        )

        self.assertTrue(result["success"])

        # Verify third_party transaction
        tp_tx = CostTransaction.objects.filter(
            idempotency_key=f"wo:{self.work_order_id}:third_party"
        ).first()

        self.assertIsNotNone(tp_tx)
        self.assertEqual(
            tp_tx.transaction_type, CostTransaction.TransactionType.THIRD_PARTY
        )
        self.assertEqual(tp_tx.amount, Decimal("800.00"))

    def test_process_returns_correct_counts(self):
        """Processing should return correct transaction counts."""
        result = CostEngineService.process_work_order_closed(
            event_data=self.event_data,
            tenant_id=self.tenant_id,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["transactions_created"], 3)  # labor, parts, third_party
        self.assertEqual(result["skipped"], 0)
        self.assertEqual(len(result["transactions"]), 3)

    def test_process_empty_entries(self):
        """Processing with empty entries should create no transactions."""
        empty_data = {
            "work_order_id": str(uuid.uuid4()),
            "asset_id": str(uuid.uuid4()),
            "cost_center_id": str(self.cost_center.id),
            "category": "corrective",
            "labor": [],
            "parts": [],
            "third_party": [],
        }

        result = CostEngineService.process_work_order_closed(
            event_data=empty_data,
            tenant_id=self.tenant_id,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["transactions_created"], 0)
        self.assertEqual(len(result["transactions"]), 0)


class CostEngineCostCalculationTests(CostEngineTestCase):
    """Tests for cost calculation logic."""

    def test_labor_uses_hourly_rate_from_event(self):
        """Labor cost should use hourly_rate from event when provided."""
        custom_rate_data = {
            **self.event_data,
            "work_order_id": str(uuid.uuid4()),
            "labor": [
                {
                    "time_entry_id": str(uuid.uuid4()),
                    "role": "Custom Role",
                    "hours": 3.0,
                    "hourly_rate": 150.00,  # Custom rate
                },
            ],
            "parts": [],
            "third_party": [],
        }

        result = CostEngineService.process_work_order_closed(
            event_data=custom_rate_data,
            tenant_id=self.tenant_id,
        )

        labor_tx = CostTransaction.objects.filter(
            idempotency_key=f"wo:{custom_rate_data['work_order_id']}:labor"
        ).first()

        # 3.0 * 150.00 = 450.00
        self.assertEqual(labor_tx.amount, Decimal("450.00"))

    def test_labor_uses_rate_card_when_no_hourly_rate(self):
        """Labor cost should use RateCard when hourly_rate not provided."""
        no_rate_data = {
            **self.event_data,
            "work_order_id": str(uuid.uuid4()),
            "labor": [
                {
                    "time_entry_id": str(uuid.uuid4()),
                    "role": "Técnico HVAC",
                    "role_code": "TECH-HVAC",
                    "hours": 2.0,
                    # No hourly_rate provided
                },
            ],
            "parts": [],
            "third_party": [],
        }

        result = CostEngineService.process_work_order_closed(
            event_data=no_rate_data,
            tenant_id=self.tenant_id,
        )

        labor_tx = CostTransaction.objects.filter(
            idempotency_key=f"wo:{no_rate_data['work_order_id']}:labor"
        ).first()

        # 2.0 * 85.00 (from RateCard) = 170.00
        self.assertEqual(labor_tx.amount, Decimal("170.00"))

    def test_transaction_meta_contains_breakdown(self):
        """Transaction meta should contain breakdown details."""
        result = CostEngineService.process_work_order_closed(
            event_data=self.event_data,
            tenant_id=self.tenant_id,
        )

        labor_tx = CostTransaction.objects.filter(
            idempotency_key=f"wo:{self.work_order_id}:labor"
        ).first()

        self.assertIn("breakdown", labor_tx.meta)
        self.assertEqual(len(labor_tx.meta["breakdown"]), 2)
        self.assertIn("total_hours", labor_tx.meta)


class CostEngineIdempotencyTests(CostEngineTestCase):
    """Tests for idempotency of cost transactions."""

    def test_duplicate_processing_is_idempotent(self):
        """Processing same event twice should not create duplicates."""
        # First processing
        result1 = CostEngineService.process_work_order_closed(
            event_data=self.event_data,
            tenant_id=self.tenant_id,
        )

        self.assertEqual(result1["transactions_created"], 3)
        self.assertEqual(result1["skipped"], 0)

        # Second processing (same work_order_id)
        result2 = CostEngineService.process_work_order_closed(
            event_data=self.event_data,
            tenant_id=self.tenant_id,
        )

        # Should skip all transactions
        self.assertEqual(result2["transactions_created"], 0)
        self.assertEqual(result2["skipped"], 3)

        # Total transactions in DB should still be 3 (filter by idempotency_key prefix)
        total_txs = CostTransaction.objects.filter(
            idempotency_key__startswith=f"wo:{self.work_order_id}:"
        ).count()
        self.assertEqual(total_txs, 3)

    def test_idempotency_key_format(self):
        """Idempotency keys should follow wo:{id}:{type} format."""
        CostEngineService.process_work_order_closed(
            event_data=self.event_data,
            tenant_id=self.tenant_id,
        )

        labor_tx = CostTransaction.objects.get(
            idempotency_key=f"wo:{self.work_order_id}:labor"
        )
        parts_tx = CostTransaction.objects.get(
            idempotency_key=f"wo:{self.work_order_id}:parts"
        )
        tp_tx = CostTransaction.objects.get(
            idempotency_key=f"wo:{self.work_order_id}:third_party"
        )

        self.assertEqual(labor_tx.idempotency_key, f"wo:{self.work_order_id}:labor")
        self.assertEqual(parts_tx.idempotency_key, f"wo:{self.work_order_id}:parts")
        self.assertEqual(tp_tx.idempotency_key, f"wo:{self.work_order_id}:third_party")


class CostEngineEventPublishingTests(CostEngineTestCase):
    """Tests for cost.entry_posted event publishing."""

    def test_publishes_cost_entry_posted_events(self):
        """Processing should publish cost.entry_posted events."""
        result = CostEngineService.process_work_order_closed(
            event_data=self.event_data,
            tenant_id=self.tenant_id,
        )

        # Should publish 3 events (one per transaction type)
        self.assertEqual(result["events_published"], 3)

        # Verify events in outbox
        cost_events = OutboxEvent.objects.filter(
            event_name="cost.entry_posted", tenant_id=self.tenant_id
        )
        self.assertEqual(cost_events.count(), 3)

    def test_cost_entry_posted_payload_format(self):
        """cost.entry_posted events should have correct payload format."""
        CostEngineService.process_work_order_closed(
            event_data=self.event_data,
            tenant_id=self.tenant_id,
        )

        # Get one of the events
        event = OutboxEvent.objects.filter(event_name="cost.entry_posted").first()

        payload = event.event_data

        # Verify required fields per docs/events/02-eventos-mvp.md
        required_fields = [
            "cost_transaction_id",
            "transaction_type",
            "amount",
            "work_order_id",
            "asset_id",
            "category",
            "cost_center_id",
        ]
        for field in required_fields:
            self.assertIn(field, payload, f"Missing field: {field}")

    def test_no_events_when_duplicate(self):
        """Duplicate processing should not publish new events."""
        # First processing
        CostEngineService.process_work_order_closed(
            event_data=self.event_data,
            tenant_id=self.tenant_id,
        )

        initial_event_count = OutboxEvent.objects.filter(
            event_name="cost.entry_posted"
        ).count()

        # Second processing
        CostEngineService.process_work_order_closed(
            event_data=self.event_data,
            tenant_id=self.tenant_id,
        )

        final_event_count = OutboxEvent.objects.filter(
            event_name="cost.entry_posted"
        ).count()

        # No new events should be created
        self.assertEqual(initial_event_count, final_event_count)


class CostEngineCategoryMappingTests(CostEngineTestCase):
    """Tests for category mapping from OS to Finance."""

    def test_category_mapping_preventive(self):
        """Category 'preventive' should map correctly."""
        data = {**self.event_data, "category": "preventive"}
        CostEngineService.process_work_order_closed(
            event_data=data,
            tenant_id=self.tenant_id,
        )

        # Query by idempotency_key since work_order FK is None for non-existent work orders
        tx = CostTransaction.objects.filter(
            idempotency_key=f"wo:{self.work_order_id}:labor"
        ).first()
        self.assertEqual(tx.category, CostTransaction.Category.PREVENTIVE)

    def test_category_mapping_corrective(self):
        """Category 'corrective' should map correctly."""
        wo_id = str(uuid.uuid4())
        data = {**self.event_data, "work_order_id": wo_id, "category": "corrective"}
        CostEngineService.process_work_order_closed(
            event_data=data,
            tenant_id=self.tenant_id,
        )

        tx = CostTransaction.objects.filter(idempotency_key=f"wo:{wo_id}:labor").first()
        self.assertEqual(tx.category, CostTransaction.Category.CORRECTIVE)

    def test_category_mapping_emergency(self):
        """Category 'emergency' should map to CORRECTIVE."""
        wo_id = str(uuid.uuid4())
        data = {**self.event_data, "work_order_id": wo_id, "category": "emergency"}
        CostEngineService.process_work_order_closed(
            event_data=data,
            tenant_id=self.tenant_id,
        )

        tx = CostTransaction.objects.filter(idempotency_key=f"wo:{wo_id}:labor").first()
        self.assertEqual(tx.category, CostTransaction.Category.CORRECTIVE)


class CostEngineValidationTests(CostEngineTestCase):
    """Tests for input validation."""

    def test_missing_work_order_id_raises_error(self):
        """Missing work_order_id should raise CostEngineError."""
        invalid_data = {
            "asset_id": str(uuid.uuid4()),
            "cost_center_id": str(self.cost_center.id),
        }

        with self.assertRaises(CostEngineError) as context:
            CostEngineService.process_work_order_closed(
                event_data=invalid_data,
                tenant_id=self.tenant_id,
            )

        self.assertIn("work_order_id", str(context.exception))

    def test_missing_asset_id_raises_error(self):
        """Missing asset_id should raise CostEngineError."""
        invalid_data = {
            "work_order_id": str(uuid.uuid4()),
            "cost_center_id": str(self.cost_center.id),
        }

        with self.assertRaises(CostEngineError) as context:
            CostEngineService.process_work_order_closed(
                event_data=invalid_data,
                tenant_id=self.tenant_id,
            )

        self.assertIn("asset_id", str(context.exception))

    def test_invalid_cost_center_uses_default(self):
        """Invalid cost_center_id should use default cost center."""
        wo_id = str(uuid.uuid4())
        data = {
            **self.event_data,
            "work_order_id": wo_id,
            "cost_center_id": str(uuid.uuid4()),  # Non-existent
        }

        result = CostEngineService.process_work_order_closed(
            event_data=data,
            tenant_id=self.tenant_id,
        )

        self.assertTrue(result["success"])

        # Transaction should use default cost center (query by idempotency_key)
        tx = CostTransaction.objects.filter(idempotency_key=f"wo:{wo_id}:labor").first()
        self.assertEqual(tx.cost_center_id, self.cost_center.id)
