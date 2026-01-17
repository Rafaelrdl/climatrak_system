"""
Tests for source_category filter in CostTransaction API

Testes para o filtro source_category que separa:
- 'entries': Lançamentos financeiros (commitments + inventory IN)
- 'operations': Custos operacionais (labor + inventory OUT)

Referências:
- docs/finance/02-regras-negocio.md
"""

import uuid
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from django_tenants.test.cases import TenantTestCase

from apps.trakledger.models import CostCenter, CostTransaction
from apps.trakledger.views import CostTransactionViewSet


class SourceCategoryFilterTests(TenantTestCase):
    """Testes para o filtro source_category."""

    def setUp(self):
        """Setup: criar transações de diferentes tipos."""
        super().setUp()
        self.factory = APIRequestFactory()

        from django.contrib.auth import get_user_model
        User = get_user_model()

        self.user = User.objects.create_user(
            username="filter_tester",
            email="filter_test@example.com",
            password="testpass123",
        )

        self.cost_center = CostCenter.objects.create(
            code="CC-FILTER", name="Centro de Teste Filtro", is_active=True
        )

        now = timezone.now()

        # === ENTRIES (Lançamentos) ===
        
        # 1. Commitment aprovado
        self.tx_commitment = CostTransaction.objects.create(
            idempotency_key=f"commitment:{uuid.uuid4()}",
            transaction_type=CostTransaction.TransactionType.OTHER,
            category=CostTransaction.Category.CONTRACTS,
            amount=Decimal("1000.00"),
            occurred_at=now,
            description="Compromisso aprovado",
            cost_center=self.cost_center,
            created_by=self.user,
            meta={"source": "commitment", "commitment_id": str(uuid.uuid4())},
        )

        # 2. Inventory IN (compra)
        self.tx_inventory_in = CostTransaction.objects.create(
            idempotency_key=f"inv:{uuid.uuid4()}:in",
            transaction_type=CostTransaction.TransactionType.PARTS,
            category=CostTransaction.Category.PARTS,
            amount=Decimal("500.00"),
            occurred_at=now,
            description="Entrada de estoque - compra",
            cost_center=self.cost_center,
            created_by=self.user,
            meta={"source": "inventory_movement", "movement_type": "IN", "item_name": "Filtro HEPA"},
        )

        # === OPERATIONS (Operações) ===
        
        # 3. Labor (mão de obra)
        self.tx_labor = CostTransaction.objects.create(
            idempotency_key=f"wo:{uuid.uuid4()}:labor",
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("800.00"),
            occurred_at=now,
            description="Mão de obra preventiva",
            cost_center=self.cost_center,
            created_by=self.user,
            meta={"work_order_id": str(uuid.uuid4()), "technician": "João"},
        )

        # 4. Inventory OUT (consumo)
        self.tx_inventory_out = CostTransaction.objects.create(
            idempotency_key=f"inv:{uuid.uuid4()}:out",
            transaction_type=CostTransaction.TransactionType.PARTS,
            category=CostTransaction.Category.CORRECTIVE,
            amount=Decimal("150.00"),
            occurred_at=now,
            description="Saída de estoque - consumo",
            cost_center=self.cost_center,
            created_by=self.user,
            meta={"source": "inventory_movement", "movement_type": "OUT", "item_name": "Correia V"},
        )

        # 5. Ajuste manual (não categorizado - deve aparecer em nenhum dos dois)
        self.tx_adjustment = CostTransaction.objects.create(
            idempotency_key=f"adj:{uuid.uuid4()}",
            transaction_type=CostTransaction.TransactionType.ADJUSTMENT,
            category=CostTransaction.Category.OTHER,
            amount=Decimal("50.00"),
            occurred_at=now,
            description="Ajuste manual",
            cost_center=self.cost_center,
            created_by=self.user,
            meta={"reason": "Correção de valor"},
        )

    def test_filter_source_category_entries(self):
        """
        source_category=entries deve retornar apenas:
        - Commitments (meta.source='commitment')
        - Inventory IN (meta.source='inventory_movement' AND meta.movement_type='IN')
        """
        request = self.factory.get("/api/finance/transactions/?source_category=entries")
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        
        # Deve ter 2 transações: commitment + inventory IN
        self.assertEqual(len(results), 2)
        
        result_ids = {r["id"] for r in results}
        self.assertIn(str(self.tx_commitment.id), result_ids)
        self.assertIn(str(self.tx_inventory_in.id), result_ids)
        
        # Não deve incluir labor, inventory OUT ou adjustment
        self.assertNotIn(str(self.tx_labor.id), result_ids)
        self.assertNotIn(str(self.tx_inventory_out.id), result_ids)
        self.assertNotIn(str(self.tx_adjustment.id), result_ids)

    def test_filter_source_category_operations(self):
        """
        source_category=operations deve retornar apenas:
        - Labor (transaction_type='labor')
        - Inventory OUT (meta.source='inventory_movement' AND meta.movement_type='OUT')
        """
        request = self.factory.get("/api/finance/transactions/?source_category=operations")
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        
        # Deve ter 2 transações: labor + inventory OUT
        self.assertEqual(len(results), 2)
        
        result_ids = {r["id"] for r in results}
        self.assertIn(str(self.tx_labor.id), result_ids)
        self.assertIn(str(self.tx_inventory_out.id), result_ids)
        
        # Não deve incluir commitment, inventory IN ou adjustment
        self.assertNotIn(str(self.tx_commitment.id), result_ids)
        self.assertNotIn(str(self.tx_inventory_in.id), result_ids)
        self.assertNotIn(str(self.tx_adjustment.id), result_ids)

    def test_no_source_category_returns_all(self):
        """Sem source_category, deve retornar todas as transações."""
        request = self.factory.get("/api/finance/transactions/")
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Deve ter todas as 5 transações
        self.assertEqual(len(response.data["results"]), 5)

    def test_source_category_entries_total_amount(self):
        """Total de entries deve somar corretamente."""
        request = self.factory.get("/api/finance/transactions/?source_category=entries")
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"get": "list"})
        response = view(request)

        results = response.data["results"]
        total = sum(Decimal(r["amount"]) for r in results)
        
        # commitment (1000) + inventory IN (500) = 1500
        self.assertEqual(total, Decimal("1500.00"))

    def test_source_category_operations_total_amount(self):
        """Total de operations deve somar corretamente."""
        request = self.factory.get("/api/finance/transactions/?source_category=operations")
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"get": "list"})
        response = view(request)

        results = response.data["results"]
        total = sum(Decimal(r["amount"]) for r in results)
        
        # labor (800) + inventory OUT (150) = 950
        self.assertEqual(total, Decimal("950.00"))

    def test_source_category_can_combine_with_other_filters(self):
        """source_category pode ser combinado com outros filtros."""
        # Filtrar entries + category=parts (só inventory IN)
        request = self.factory.get(
            "/api/finance/transactions/?source_category=entries&category=parts"
        )
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        
        # Só inventory IN (parts + entries)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(self.tx_inventory_in.id))

    def test_source_category_operations_with_date_filter(self):
        """source_category=operations com filtro de data."""
        today = timezone.now().date().isoformat()
        request = self.factory.get(
            f"/api/finance/transactions/?source_category=operations&start_date={today}&end_date={today}"
        )
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # labor + inventory OUT criados hoje
        self.assertEqual(len(response.data["results"]), 2)


class SourceCategoryMultiTenantTests(TenantTestCase):
    """Testes de isolamento multi-tenant para source_category."""

    def setUp(self):
        """Setup: criar transações no tenant de teste."""
        super().setUp()
        self.factory = APIRequestFactory()

        from django.contrib.auth import get_user_model
        User = get_user_model()

        self.user = User.objects.create_user(
            username="tenant_tester",
            email="tenant_test@example.com",
            password="testpass123",
        )

        self.cost_center = CostCenter.objects.create(
            code="CC-MT", name="Centro Multi-Tenant", is_active=True
        )

        # Criar transação de operação
        self.tx_operation = CostTransaction.objects.create(
            idempotency_key=f"wo:{uuid.uuid4()}:labor",
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("500.00"),
            occurred_at=timezone.now(),
            description="Operação do tenant",
            cost_center=self.cost_center,
            created_by=self.user,
        )

    def test_operations_filter_respects_tenant(self):
        """source_category=operations deve respeitar isolamento de tenant."""
        request = self.factory.get("/api/finance/transactions/?source_category=operations")
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        
        # Todas as transações retornadas devem ser do tenant atual
        for result in results:
            tx = CostTransaction.objects.get(id=result["id"])
            # A transação existe no tenant atual (não vazou de outro tenant)
            self.assertEqual(tx.cost_center.id, self.cost_center.id)
