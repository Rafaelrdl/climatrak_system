"""
Tests for work_order.closed event publication (FIN-003)

NOTA: Usa django_tenants.test.cases.TenantTestCase para garantir que os testes
rodem em um schema de tenant isolado (modelos cmms e finance são tenant-specific).
"""

import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone

from django_tenants.test.cases import TenantTestCase

from apps.assets.models import Asset
from apps.cmms.models import ExternalCost, PartUsage, TimeEntry, WorkOrder
from apps.cmms.services import WorkOrderService
from apps.core_events.models import OutboxEvent
from apps.trakledger.models import CostCenter

User = get_user_model()


class WorkOrderEventTestCase(TenantTestCase):
    """Base test case with common setup for work order event tests.

    Herda de TenantTestCase para criar automaticamente um tenant de teste
    e executar os testes dentro desse schema.
    """

    def setUp(self):
        """Set up test data."""
        super().setUp()

        # Create user
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )

        # Create cost center
        self.cost_center = CostCenter.objects.create(
            code="CC001", name="Manutenção Industrial", is_active=True
        )

        # Create site (required for Asset)
        from apps.assets.models import Site

        self.site = Site.objects.create(
            name="Hospital Central",
            company="TrakSense Healthcare",
            timezone="America/Sao_Paulo",
        )

        # Create asset
        self.asset = Asset.objects.create(
            name="Chiller 01",
            tag="CH-001",
            site=self.site,
            asset_type="CHILLER",
            status="OK",
        )

        # Create work order (WorkOrder usa 'description', não 'title')
        self.work_order = WorkOrder.objects.create(
            description="Manutenção Preventiva Chiller - Troca de filtros e verificação geral",
            type="PREVENTIVE",
            priority="MEDIUM",
            status="OPEN",
            asset=self.asset,
            cost_center=self.cost_center,
            created_by=self.user,
        )

        # Create time entries (labor)
        self.time_entry1 = TimeEntry.objects.create(
            work_order=self.work_order,
            technician=self.user,
            role="Técnico HVAC",
            hours=Decimal("2.0"),
            work_date=timezone.now().date(),
            hourly_rate=Decimal("50.00"),
            description="Troca de filtros",
        )
        self.time_entry2 = TimeEntry.objects.create(
            work_order=self.work_order,
            technician=self.user,
            role="Técnico Sênior",
            hours=Decimal("1.5"),
            work_date=timezone.now().date(),
            hourly_rate=Decimal("75.00"),
            description="Verificação elétrica",
        )

        # Create part usages
        self.part_usage = PartUsage.objects.create(
            work_order=self.work_order,
            part_name="Filtro de Óleo",
            part_number="FO-001",
            quantity=Decimal("2"),
            unit_cost=Decimal("120.00"),
            description="Filtros substituídos",
        )

        # Create external costs (third party)
        self.external_cost = ExternalCost.objects.create(
            work_order=self.work_order,
            description="Calibração de sensores",
            supplier_name="Calibra Serviços",
            amount=Decimal("800.00"),
            invoice_number="NF-2024-001",
        )

        # Usar um UUID fixo para tenant_id nos eventos
        # (OutboxEvent.tenant_id é UUIDField, não relacionado ao Tenant.id integer)
        self.tenant_id = str(uuid.uuid4())


class WorkOrderServiceCloseTests(WorkOrderEventTestCase):
    """Tests for WorkOrderService.close_work_order()"""

    def test_close_work_order_creates_outbox_event(self):
        """Closing a work order should create an OutboxEvent."""
        result = WorkOrderService.close_work_order(
            work_order=self.work_order,
            tenant_id=self.tenant_id,
        )

        # Verify work order is completed
        self.work_order.refresh_from_db()
        self.assertEqual(self.work_order.status, "COMPLETED")
        self.assertIsNotNone(self.work_order.completed_at)

        # Verify event was created
        self.assertTrue(result["event_published"])
        self.assertIsNotNone(result["event_id"])

        # Verify OutboxEvent exists
        event = OutboxEvent.objects.get(id=result["event_id"])
        self.assertEqual(event.event_name, "work_order.closed")
        self.assertEqual(event.aggregate_type, "work_order")
        # aggregate_id é convertido de integer para UUID via uuid5
        expected_uuid = uuid.uuid5(uuid.NAMESPACE_OID, str(self.work_order.id))
        self.assertEqual(event.aggregate_id, expected_uuid)
        self.assertEqual(str(event.tenant_id), self.tenant_id)
        self.assertEqual(event.status, "pending")

    def test_close_work_order_event_payload_complete(self):
        """Event payload should contain all required fields."""
        result = WorkOrderService.close_work_order(
            work_order=self.work_order,
            tenant_id=self.tenant_id,
        )

        event = OutboxEvent.objects.get(id=result["event_id"])
        payload = event.payload

        # Os dados específicos estão em payload['data'] (envelope pattern)
        data = payload["data"]

        # Verify required fields
        self.assertEqual(data["work_order_id"], str(self.work_order.id))
        self.assertEqual(data["asset_id"], str(self.asset.id))
        self.assertEqual(data["cost_center_id"], str(self.cost_center.id))
        self.assertEqual(data["category"], "preventive")

        # Verify labor entries
        self.assertIn("labor", data)
        self.assertEqual(len(data["labor"]), 2)

        labor_roles = {entry["role"] for entry in data["labor"]}
        self.assertIn("Técnico HVAC", labor_roles)
        self.assertIn("Técnico Sênior", labor_roles)

        # Verify parts entries
        self.assertIn("parts", data)
        self.assertEqual(len(data["parts"]), 1)
        self.assertEqual(data["parts"][0]["part_name"], "Filtro de Óleo")
        self.assertEqual(float(data["parts"][0]["qty"]), 2.0)
        self.assertEqual(float(data["parts"][0]["unit_cost"]), 120.00)

        # Verify third_party entries
        self.assertIn("third_party", data)
        self.assertEqual(len(data["third_party"]), 1)
        self.assertEqual(
            data["third_party"][0]["description"], "Calibração de sensores"
        )
        self.assertEqual(float(data["third_party"][0]["amount"]), 800.00)

    def test_close_work_order_idempotency(self):
        """Closing same work order twice should not create duplicate events."""
        # First close
        result1 = WorkOrderService.close_work_order(
            work_order=self.work_order,
            tenant_id=self.tenant_id,
        )
        self.assertTrue(result1["event_published"])

        # Refresh work order
        self.work_order.refresh_from_db()

        # Second close attempt should raise ValueError (already completed)
        with self.assertRaises(ValueError) as context:
            WorkOrderService.close_work_order(
                work_order=self.work_order,
                tenant_id=self.tenant_id,
            )
        self.assertIn("já está concluída", str(context.exception))

        # Should only have one event
        expected_uuid = uuid.uuid5(uuid.NAMESPACE_OID, str(self.work_order.id))
        events = OutboxEvent.objects.filter(
            aggregate_type="work_order",
            aggregate_id=expected_uuid,
            event_name="work_order.closed",
        )
        self.assertEqual(events.count(), 1)

    def test_close_work_order_without_cost_center(self):
        """Work order without cost center should have null cost_center_id in event."""
        self.work_order.cost_center = None
        self.work_order.status = "OPEN"
        self.work_order.save()

        result = WorkOrderService.close_work_order(
            work_order=self.work_order,
            tenant_id=self.tenant_id,
        )

        event = OutboxEvent.objects.get(id=result["event_id"])
        data = event.payload.get("data", {})
        self.assertIsNone(data.get("cost_center_id"))

    def test_close_work_order_empty_costs(self):
        """Work order without any costs should have empty arrays in payload."""
        # Create a new work order without any costs
        empty_wo = WorkOrder.objects.create(
            description="OS Simples para teste",
            type="CORRECTIVE",
            priority="LOW",
            status="OPEN",
            asset=self.asset,
            created_by=self.user,
        )

        result = WorkOrderService.close_work_order(
            work_order=empty_wo,
            tenant_id=self.tenant_id,
        )

        event = OutboxEvent.objects.get(id=result["event_id"])
        data = event.payload.get("data", {})

        self.assertEqual(data.get("labor", []), [])
        self.assertEqual(data.get("parts", []), [])
        self.assertEqual(data.get("third_party", []), [])


class WorkOrderCostSummaryTests(WorkOrderEventTestCase):
    """Tests for WorkOrderService.get_work_order_cost_summary()"""

    def test_cost_summary_calculation(self):
        """Cost summary should correctly calculate all cost components."""
        summary = WorkOrderService.get_work_order_cost_summary(self.work_order)

        # Labor: (2.0 * 50.00) + (1.5 * 75.00) = 100.00 + 112.50 = 212.50
        self.assertAlmostEqual(summary["labor_cost"], 212.50, places=2)

        # Parts: 2 * 120.00 = 240.00
        self.assertAlmostEqual(summary["parts_cost"], 240.00, places=2)

        # Third party: 800.00
        self.assertAlmostEqual(summary["third_party_cost"], 800.00, places=2)

        # Total: 212.50 + 240.00 + 800.00 = 1252.50
        self.assertAlmostEqual(summary["total_cost"], 1252.50, places=2)

    def test_cost_summary_empty_work_order(self):
        """Cost summary for work order with no costs should be zero."""
        empty_wo = WorkOrder.objects.create(
            description="OS Vazia para teste",
            type="CORRECTIVE",
            priority="LOW",
            status="OPEN",
            asset=self.asset,
            created_by=self.user,
        )

        summary = WorkOrderService.get_work_order_cost_summary(empty_wo)

        self.assertEqual(summary["labor_cost"], 0)
        self.assertEqual(summary["parts_cost"], 0)
        self.assertEqual(summary["third_party_cost"], 0)
        self.assertEqual(summary["total_cost"], 0)


class WorkOrderModelCompleteTests(WorkOrderEventTestCase):
    """Tests for WorkOrder.complete() method integration."""

    def test_complete_with_publish_event_true(self):
        """complete(publish_event=True) should publish event via service."""
        with patch.object(WorkOrderService, "close_work_order") as mock_close:
            mock_close.return_value = {
                "work_order": self.work_order,
                "event_published": True,
                "event_id": uuid.uuid4(),
            }

            self.work_order.complete(publish_event=True, tenant_id=self.tenant_id)

            mock_close.assert_called_once()

    def test_complete_with_publish_event_false(self):
        """complete(publish_event=False) should not publish event."""
        initial_event_count = OutboxEvent.objects.count()

        self.work_order.complete(publish_event=False)

        self.work_order.refresh_from_db()
        self.assertEqual(self.work_order.status, "COMPLETED")

        # No new events should be created
        self.assertEqual(OutboxEvent.objects.count(), initial_event_count)


class WorkOrderEventPayloadFormatTests(WorkOrderEventTestCase):
    """Tests for event payload format compliance with contract."""

    def test_payload_matches_contract_format(self):
        """Payload should match the format defined in docs/events/02-eventos-mvp.md."""
        result = WorkOrderService.close_work_order(
            work_order=self.work_order,
            tenant_id=self.tenant_id,
        )

        event = OutboxEvent.objects.get(id=result["event_id"])
        payload = event.payload

        # Os dados específicos estão em payload['data'] (envelope pattern)
        data = payload.get("data", {})

        # Contract requires these fields in data
        required_fields = [
            "work_order_id",
            "asset_id",
            "cost_center_id",
            "category",
            "labor",
            "parts",
            "third_party",
        ]
        for field in required_fields:
            self.assertIn(field, data, f"Missing required field: {field}")

        # Labor entry format
        for labor in data["labor"]:
            self.assertIn("role", labor)
            self.assertIn("hours", labor)
            self.assertIsInstance(labor["hours"], (int, float))

        # Parts entry format
        for part in data["parts"]:
            self.assertIn("qty", part)
            self.assertIn("unit_cost", part)
            self.assertIsInstance(part["qty"], (int, float))
            self.assertIsInstance(part["unit_cost"], (int, float))

        # Third party entry format
        for tp in data["third_party"]:
            self.assertIn("description", tp)
            self.assertIn("amount", tp)
            self.assertIsInstance(tp["amount"], (int, float))

    def test_event_envelope_format(self):
        """Event should follow the envelope format from docs/events/01-contrato-eventos.md."""
        result = WorkOrderService.close_work_order(
            work_order=self.work_order,
            tenant_id=self.tenant_id,
        )

        event = OutboxEvent.objects.get(id=result["event_id"])

        # Envelope fields
        self.assertIsNotNone(event.id)
        self.assertEqual(event.event_name, "work_order.closed")
        self.assertEqual(event.aggregate_type, "work_order")
        # aggregate_id é convertido de integer para UUID via uuid5
        expected_uuid = uuid.uuid5(uuid.NAMESPACE_OID, str(self.work_order.id))
        self.assertEqual(event.aggregate_id, expected_uuid)
        self.assertEqual(str(event.tenant_id), self.tenant_id)
        self.assertIsNotNone(event.created_at)
        self.assertEqual(event.status, "pending")
        self.assertIsNotNone(event.idempotency_key)

    def test_idempotency_key_format(self):
        """Idempotency key should follow wo:{id}:closed format."""
        result = WorkOrderService.close_work_order(
            work_order=self.work_order,
            tenant_id=self.tenant_id,
        )

        event = OutboxEvent.objects.get(id=result["event_id"])
        expected_key = f"wo:{self.work_order.id}:closed"
        self.assertEqual(event.idempotency_key, expected_key)
