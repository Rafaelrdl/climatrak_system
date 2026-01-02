"""
Testes para CMMS - Cost Components (CMMS-001)

Testes unitários e de integração para TimeEntry, PartUsage e ExternalCost.
Usa TenantTestCase para suporte multi-tenant e APIRequestFactory para testes de API.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from django_tenants.test.cases import TenantTestCase

User = get_user_model()


# ============================================
# BASE TEST CASE
# ============================================


class BaseCMSSTestCase(TenantTestCase):
    """Base class para testes de CMMS com setup comum."""

    def setUp(self):
        super().setUp()
        from apps.assets.models import Asset, Site
        from apps.cmms.models import WorkOrder

        self.factory = APIRequestFactory()

        self.user = User.objects.create_user(
            username="cmms_tech",
            email="tech@test.com",
            password="testpass123",
            first_name="Tech",
            last_name="Test",
        )

        # Criar Site primeiro (obrigatório para Asset)
        self.site = Site.objects.create(
            name="Site de Teste", company="Empresa Teste", sector="Climatização"
        )

        self.asset = Asset.objects.create(
            tag="AST-001", name="Chiller 01", status="OPERATIONAL", site=self.site
        )

        self.work_order = WorkOrder.objects.create(
            asset=self.asset,
            type="CORRECTIVE",
            priority="MEDIUM",
            status="OPEN",
            description="Teste de manutenção",
            created_by=self.user,
        )


# ============================================
# MODEL TESTS
# ============================================


class TimeEntryModelTests(BaseCMSSTestCase):
    """Testes unitários para TimeEntry."""

    def test_create_time_entry(self):
        """Testa criação de TimeEntry."""
        from apps.cmms.models import TimeEntry

        entry = TimeEntry.objects.create(
            work_order=self.work_order,
            technician=self.user,
            role="Técnico HVAC",
            role_code="TECH-HVAC",
            hours=Decimal("4.5"),
            work_date=date.today(),
            hourly_rate=Decimal("85.00"),
            description="Troca de filtros",
            created_by=self.user,
        )

        self.assertEqual(entry.role, "Técnico HVAC")
        self.assertEqual(entry.hours, Decimal("4.5"))
        self.assertIsNotNone(entry.id)

    def test_time_entry_total_cost(self):
        """Testa cálculo de custo total."""
        from apps.cmms.models import TimeEntry

        entry = TimeEntry.objects.create(
            work_order=self.work_order,
            role="Eletricista",
            hours=Decimal("8.0"),
            work_date=date.today(),
            hourly_rate=Decimal("100.00"),
        )

        self.assertEqual(entry.total_cost, Decimal("800.00"))

    def test_time_entry_total_cost_without_rate(self):
        """Testa custo total sem hourly_rate."""
        from apps.cmms.models import TimeEntry

        entry = TimeEntry.objects.create(
            work_order=self.work_order,
            role="Auxiliar",
            hours=Decimal("4.0"),
            work_date=date.today(),
        )

        self.assertIsNone(entry.total_cost)

    def test_time_entry_str(self):
        """Testa representação string."""
        from apps.cmms.models import TimeEntry

        entry = TimeEntry.objects.create(
            work_order=self.work_order,
            role="Técnico Mecânico",
            hours=Decimal("6.0"),
            work_date=date.today(),
        )

        self.assertIn(self.work_order.number, str(entry))
        self.assertIn("Técnico Mecânico", str(entry))


class PartUsageModelTests(BaseCMSSTestCase):
    """Testes unitários para PartUsage."""

    def test_create_part_usage_manual(self):
        """Testa criação de PartUsage com dados manuais."""
        from apps.cmms.models import PartUsage

        usage = PartUsage.objects.create(
            work_order=self.work_order,
            part_number="SEL-001",
            part_name="Selo Mecânico",
            quantity=Decimal("2"),
            unit="UN",
            unit_cost=Decimal("150.00"),
            created_by=self.user,
        )

        self.assertEqual(usage.part_name, "Selo Mecânico")
        self.assertEqual(usage.quantity, Decimal("2"))
        self.assertFalse(usage.inventory_deducted)

    def test_part_usage_total_cost(self):
        """Testa cálculo de custo total."""
        from apps.cmms.models import PartUsage

        usage = PartUsage.objects.create(
            work_order=self.work_order,
            part_name="Filtro",
            quantity=Decimal("5"),
            unit="UN",
            unit_cost=Decimal("25.00"),
        )

        self.assertEqual(usage.total_cost, Decimal("125.00"))

    def test_part_usage_validation_requires_identification(self):
        """Testa que é necessário identificar a peça."""
        from apps.cmms.models import PartUsage

        usage = PartUsage(
            work_order=self.work_order,
            quantity=Decimal("1"),
            unit="UN",
            # Sem part_name nem inventory_item
        )

        with self.assertRaises(ValidationError):
            usage.full_clean()

    def test_part_usage_str(self):
        """Testa representação string."""
        from apps.cmms.models import PartUsage

        usage = PartUsage.objects.create(
            work_order=self.work_order,
            part_name="Rolamento",
            quantity=Decimal("4"),
            unit="UN",
        )

        self.assertIn(self.work_order.number, str(usage))
        self.assertIn("Rolamento", str(usage))


class ExternalCostModelTests(BaseCMSSTestCase):
    """Testes unitários para ExternalCost."""

    def test_create_external_cost(self):
        """Testa criação de ExternalCost."""
        from apps.cmms.models import ExternalCost

        cost = ExternalCost.objects.create(
            work_order=self.work_order,
            cost_type="SERVICE",
            supplier_name="Serviço Técnico ABC",
            supplier_document="12345678000199",
            description="Serviço de solda especializada",
            amount=Decimal("2500.00"),
            invoice_number="NF-12345",
            invoice_date=date.today(),
            created_by=self.user,
        )

        self.assertEqual(cost.supplier_name, "Serviço Técnico ABC")
        self.assertEqual(cost.amount, Decimal("2500.00"))
        self.assertEqual(cost.cost_type, "SERVICE")

    def test_external_cost_types(self):
        """Testa tipos de custo externo."""
        from apps.cmms.models import ExternalCost

        for cost_type in ["SERVICE", "RENTAL", "MATERIAL", "OTHER"]:
            cost = ExternalCost.objects.create(
                work_order=self.work_order,
                cost_type=cost_type,
                supplier_name=f"Fornecedor {cost_type}",
                description=f"Teste {cost_type}",
                amount=Decimal("100.00"),
            )
            self.assertEqual(cost.cost_type, cost_type)

    def test_external_cost_str(self):
        """Testa representação string."""
        from apps.cmms.models import ExternalCost

        cost = ExternalCost.objects.create(
            work_order=self.work_order,
            supplier_name="Empresa XYZ",
            description="Aluguel de equipamento",
            amount=Decimal("1500.00"),
        )

        self.assertIn("Empresa XYZ", str(cost))
        self.assertIn("1500", str(cost))


class ExternalCostAttachmentModelTests(BaseCMSSTestCase):
    """Testes unitários para ExternalCostAttachment."""

    def setUp(self):
        super().setUp()
        from apps.cmms.models import ExternalCost

        self.external_cost = ExternalCost.objects.create(
            work_order=self.work_order,
            supplier_name="Limpeza Industrial",
            description="Limpeza química",
            amount=Decimal("5000.00"),
        )

    def test_attachment_file_types(self):
        """Testa tipos de arquivo de anexo."""
        from apps.cmms.models import ExternalCostAttachment

        types = ["INVOICE", "RECEIPT", "REPORT", "PHOTO", "CONTRACT", "OTHER"]

        for file_type in types:
            attachment = ExternalCostAttachment(
                external_cost=self.external_cost,
                file_type=file_type,
                file_name=f"documento_{file_type}.pdf",
            )
            self.assertEqual(attachment.file_type, file_type)

    def test_attachment_str(self):
        """Testa representação string."""
        from apps.cmms.models import ExternalCostAttachment

        attachment = ExternalCostAttachment(
            external_cost=self.external_cost,
            file_type="INVOICE",
            file_name="nota_fiscal.pdf",
        )

        self.assertIn("nota_fiscal.pdf", str(attachment))


# ============================================
# API TESTS
# ============================================


class TimeEntryAPITests(BaseCMSSTestCase):
    """Testes de API para TimeEntry."""

    def test_list_time_entries(self):
        """Testa listagem de apontamentos."""
        from apps.cmms.models import TimeEntry
        from apps.cmms.views import TimeEntryViewSet

        TimeEntry.objects.create(
            work_order=self.work_order,
            role="Técnico",
            hours=Decimal("4"),
            work_date=date.today(),
        )

        request = self.factory.get("/api/cmms/time-entries/")
        force_authenticate(request, user=self.user)
        view = TimeEntryViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["results"]), 1)

    def test_create_time_entry(self):
        """Testa criação via API."""
        from apps.cmms.views import TimeEntryViewSet

        data = {
            "work_order": str(self.work_order.id),
            "role": "Técnico HVAC",
            "role_code": "TECH-HVAC",
            "hours": "4.5",
            "work_date": str(date.today()),
            "hourly_rate": "85.00",
        }

        request = self.factory.post("/api/cmms/time-entries/", data, format="json")
        force_authenticate(request, user=self.user)
        view = TimeEntryViewSet.as_view({"post": "create"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], "Técnico HVAC")

    def test_filter_time_entries_by_work_order(self):
        """Testa filtro por OS."""
        from apps.cmms.models import TimeEntry
        from apps.cmms.views import TimeEntryViewSet

        TimeEntry.objects.create(
            work_order=self.work_order,
            role="Técnico",
            hours=Decimal("4"),
            work_date=date.today(),
        )

        request = self.factory.get(
            "/api/cmms/time-entries/", {"work_order": str(self.work_order.id)}
        )
        force_authenticate(request, user=self.user)
        view = TimeEntryViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for entry in response.data["results"]:
            self.assertEqual(str(entry["work_order"]), str(self.work_order.id))

    def test_filter_time_entries_by_date_range(self):
        """Testa filtro por range de datas."""
        from apps.cmms.models import TimeEntry
        from apps.cmms.views import TimeEntryViewSet

        today = date.today()
        yesterday = today - timedelta(days=1)

        TimeEntry.objects.create(
            work_order=self.work_order,
            role="Técnico Ontem",
            hours=Decimal("4"),
            work_date=yesterday,
        )
        TimeEntry.objects.create(
            work_order=self.work_order,
            role="Técnico Hoje",
            hours=Decimal("4"),
            work_date=today,
        )

        request = self.factory.get(
            "/api/cmms/time-entries/", {"start_date": str(today)}
        )
        force_authenticate(request, user=self.user)
        view = TimeEntryViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Todos os resultados devem ser de hoje ou depois
        for entry in response.data["results"]:
            self.assertGreaterEqual(entry["work_date"], str(today))


class PartUsageAPITests(BaseCMSSTestCase):
    """Testes de API para PartUsage."""

    def setUp(self):
        super().setUp()
        # Atualizar status da WO para IN_PROGRESS para aceitar parts
        self.work_order.status = "IN_PROGRESS"
        self.work_order.save()

    def test_create_part_usage(self):
        """Testa criação via API."""
        from apps.cmms.views import PartUsageViewSet

        data = {
            "work_order": str(self.work_order.id),
            "part_name": "Selo Mecânico",
            "part_number": "SEL-001",
            "quantity": "2",
            "unit": "UN",
            "unit_cost": "150.00",
        }

        request = self.factory.post("/api/cmms/part-usages/", data, format="json")
        force_authenticate(request, user=self.user)
        view = PartUsageViewSet.as_view({"post": "create"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["part_name"], "Selo Mecânico")

    def test_create_part_usage_without_identification(self):
        """Testa que requer identificação."""
        from apps.cmms.views import PartUsageViewSet

        data = {
            "work_order": str(self.work_order.id),
            "quantity": "1",
            "unit": "UN",
            # Sem part_name nem inventory_item
        }

        request = self.factory.post("/api/cmms/part-usages/", data, format="json")
        force_authenticate(request, user=self.user)
        view = PartUsageViewSet.as_view({"post": "create"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_part_usages_by_work_order(self):
        """Testa listagem por OS."""
        from apps.cmms.models import PartUsage
        from apps.cmms.views import PartUsageViewSet

        PartUsage.objects.create(
            work_order=self.work_order,
            part_name="Filtro",
            quantity=Decimal("5"),
            unit="UN",
            unit_cost=Decimal("25.00"),
        )

        request = self.factory.get(
            "/api/cmms/part-usages/", {"work_order": str(self.work_order.id)}
        )
        force_authenticate(request, user=self.user)
        view = PartUsageViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["results"]), 1)


class ExternalCostAPITests(BaseCMSSTestCase):
    """Testes de API para ExternalCost."""

    def setUp(self):
        super().setUp()
        self.work_order.status = "IN_PROGRESS"
        self.work_order.save()

    def test_create_external_cost(self):
        """Testa criação via API."""
        from apps.cmms.views import ExternalCostViewSet

        data = {
            "work_order": str(self.work_order.id),
            "cost_type": "SERVICE",
            "supplier_name": "Fornecedor ABC",
            "description": "Serviço especializado",
            "amount": "2500.00",
            "invoice_number": "NF-12345",
            "invoice_date": str(date.today()),
        }

        request = self.factory.post("/api/cmms/external-costs/", data, format="json")
        force_authenticate(request, user=self.user)
        view = ExternalCostViewSet.as_view({"post": "create"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["supplier_name"], "Fornecedor ABC")

    def test_list_external_costs(self):
        """Testa listagem de custos externos."""
        from apps.cmms.models import ExternalCost
        from apps.cmms.views import ExternalCostViewSet

        ExternalCost.objects.create(
            work_order=self.work_order,
            cost_type="SERVICE",
            supplier_name="Fornecedor X",
            description="Serviço",
            amount=Decimal("1000.00"),
        )

        request = self.factory.get("/api/cmms/external-costs/")
        force_authenticate(request, user=self.user)
        view = ExternalCostViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["results"]), 1)

    def test_filter_by_cost_type(self):
        """Testa filtro por tipo de custo."""
        from apps.cmms.models import ExternalCost
        from apps.cmms.views import ExternalCostViewSet

        ExternalCost.objects.create(
            work_order=self.work_order,
            cost_type="SERVICE",
            supplier_name="Service Provider",
            description="Teste",
            amount=Decimal("1000"),
        )
        ExternalCost.objects.create(
            work_order=self.work_order,
            cost_type="RENTAL",
            supplier_name="Locadora",
            description="Teste",
            amount=Decimal("500"),
        )

        request = self.factory.get(
            "/api/cmms/external-costs/", {"cost_type": "SERVICE"}
        )
        force_authenticate(request, user=self.user)
        view = ExternalCostViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for cost in response.data["results"]:
            self.assertEqual(cost["cost_type"], "SERVICE")


class WorkOrderCostSummaryAPITests(BaseCMSSTestCase):
    """Testes de API para resumo de custos da OS."""

    def setUp(self):
        super().setUp()
        from apps.cmms.models import ExternalCost, PartUsage, TimeEntry

        self.work_order.status = "IN_PROGRESS"
        self.work_order.save()

        # Criar custos
        TimeEntry.objects.create(
            work_order=self.work_order,
            role="Técnico",
            hours=Decimal("8"),
            work_date=date.today(),
            hourly_rate=Decimal("100"),
        )

        PartUsage.objects.create(
            work_order=self.work_order,
            part_name="Peça A",
            quantity=Decimal("2"),
            unit="UN",
            unit_cost=Decimal("50"),
        )

        ExternalCost.objects.create(
            work_order=self.work_order,
            supplier_name="Fornecedor",
            description="Serviço",
            amount=Decimal("500"),
        )

    def test_get_cost_summary(self):
        """Testa resumo de custos da OS."""
        from apps.cmms.views import WorkOrderCostSummaryViewSet

        request = self.factory.get(f"/api/cmms/work-order-costs/{self.work_order.id}/")
        force_authenticate(request, user=self.user)
        view = WorkOrderCostSummaryViewSet.as_view({"get": "retrieve"})
        response = view(request, pk=str(self.work_order.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["work_order_number"], self.work_order.number)

        # Verificar labor
        self.assertEqual(response.data["labor"]["entries_count"], 1)
        self.assertEqual(
            Decimal(str(response.data["labor"]["total_hours"])), Decimal("8")
        )
        self.assertEqual(
            Decimal(str(response.data["labor"]["total_cost"])), Decimal("800")
        )

        # Verificar parts
        self.assertEqual(response.data["parts"]["count"], 1)
        self.assertEqual(
            Decimal(str(response.data["parts"]["total_cost"])), Decimal("100")
        )

        # Verificar external
        self.assertEqual(response.data["external"]["count"], 1)
        self.assertEqual(
            Decimal(str(response.data["external"]["total_cost"])), Decimal("500")
        )

        # Grand total: 800 + 100 + 500 = 1400
        self.assertEqual(Decimal(str(response.data["grand_total"])), Decimal("1400"))

    def test_cost_summary_not_found(self):
        """Testa OS não encontrada."""
        from apps.cmms.views import WorkOrderCostSummaryViewSet

        # WorkOrder.id é IntegerField, não UUID
        fake_id = 999999
        request = self.factory.get(f"/api/cmms/work-order-costs/{fake_id}/")
        force_authenticate(request, user=self.user)
        view = WorkOrderCostSummaryViewSet.as_view({"get": "retrieve"})
        response = view(request, pk=fake_id)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
