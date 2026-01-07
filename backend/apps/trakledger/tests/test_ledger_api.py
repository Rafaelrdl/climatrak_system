"""
Ledger API Tests (API-002)

Testes de integração para os endpoints da API de Ledger:
- CostTransaction (listar, criar, filtrar, summary, lock)
- LedgerAdjustment (criar ajuste manual, listar)

Referências:
- docs/finance/02-regras-negocio.md

NOTA: Estes testes usam TenantTestCase com chamadas diretas às views via
RequestFactory em vez de HTTP client, para funcionar corretamente com
django-tenants multi-tenant.
"""

import uuid
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from django_tenants.test.cases import TenantTestCase

from apps.trakledger.models import CostCenter, CostTransaction
from apps.trakledger.views import CostTransactionViewSet, LedgerAdjustmentViewSet


class BaseLedgerAPITestCase(TenantTestCase):
    """Base class para testes de API Ledger.

    Herda de TenantTestCase para criar automaticamente um tenant de teste
    e executar os testes dentro desse schema.
    Usa APIRequestFactory + force_authenticate para criar requests
    autenticados e chama views diretamente.
    """

    def setUp(self):
        """Setup comum para todos os testes."""
        super().setUp()
        # Usar APIRequestFactory para criar requests
        self.factory = APIRequestFactory()

        # Criar usuário de teste
        from django.contrib.auth import get_user_model

        User = get_user_model()

        self.user = User.objects.create_user(
            username="ledger_tester",
            email="ledger_test@example.com",
            password="testpass123",
            first_name="Ledger",
            last_name="Tester",
        )

        # Criar centro de custo
        self.cost_center = CostCenter.objects.create(
            code="CC-TEST", name="Centro de Teste", is_active=True
        )

        # Criar algumas transações
        self.tx_labor = CostTransaction.objects.create(
            idempotency_key=f"wo:{uuid.uuid4()}:labor",
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("500.00"),
            occurred_at=timezone.now() - timedelta(days=5),
            description="Mão de obra manutenção preventiva",
            cost_center=self.cost_center,
            created_by=self.user,
        )

        self.tx_parts = CostTransaction.objects.create(
            idempotency_key=f"wo:{uuid.uuid4()}:parts",
            transaction_type=CostTransaction.TransactionType.PARTS,
            category=CostTransaction.Category.CORRECTIVE,
            amount=Decimal("320.00"),
            occurred_at=timezone.now() - timedelta(days=3),
            description="Peças corretiva",
            cost_center=self.cost_center,
            created_by=self.user,
        )

        self.tx_third_party = CostTransaction.objects.create(
            idempotency_key=f"wo:{uuid.uuid4()}:third_party",
            transaction_type=CostTransaction.TransactionType.THIRD_PARTY,
            category=CostTransaction.Category.CORRECTIVE,
            amount=Decimal("800.00"),
            occurred_at=timezone.now() - timedelta(days=1),
            description="Serviço terceirizado",
            cost_center=self.cost_center,
            created_by=self.user,
        )


class CostTransactionAPITests(BaseLedgerAPITestCase):
    """Testes para endpoints de CostTransaction (Ledger)."""

    def test_list_transactions(self):
        """GET /api/finance/transactions/ deve listar transações."""
        request = self.factory.get("/api/finance/transactions/")
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 3)

    def test_list_transactions_pagination(self):
        """Listagem deve ter paginação."""
        request = self.factory.get("/api/finance/transactions/")
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertIn("count", response.data)
        self.assertIn("next", response.data)
        self.assertIn("previous", response.data)
        self.assertEqual(response.data["count"], 3)

    def test_get_transaction_detail(self):
        """GET /api/finance/transactions/{id}/ deve retornar detalhes."""
        request = self.factory.get(f"/api/finance/transactions/{self.tx_labor.id}/")
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"get": "retrieve"})
        response = view(request, pk=self.tx_labor.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.tx_labor.id))
        self.assertEqual(response.data["transaction_type"], "labor")
        self.assertEqual(response.data["transaction_type_display"], "Mão de Obra")
        self.assertEqual(response.data["category"], "preventive")
        self.assertEqual(Decimal(response.data["amount"]), Decimal("500.00"))
        self.assertEqual(response.data["cost_center_name"], "Centro de Teste")
        self.assertTrue(response.data["is_editable"])

    def test_filter_by_transaction_type(self):
        """Filtrar por tipo de transação."""
        request = self.factory.get("/api/finance/transactions/?transaction_type=labor")
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["transaction_type"], "labor")

    def test_filter_by_category(self):
        """Filtrar por categoria."""
        request = self.factory.get("/api/finance/transactions/?category=corrective")
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)  # parts + third_party

    def test_create_transaction_manual(self):
        """POST /api/finance/transactions/ deve criar transação manual."""
        data = {
            "transaction_type": "other",
            "category": "other",
            "amount": "150.00",
            "occurred_at": timezone.now().isoformat(),
            "description": "Transação manual de teste",
            "cost_center": str(self.cost_center.id),
        }

        request = self.factory.post("/api/finance/transactions/", data, format="json")
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"post": "create"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data["amount"]), Decimal("150.00"))

    def test_update_unlocked_transaction(self):
        """PATCH deve funcionar em transação não bloqueada."""
        data = {"description": "Descrição atualizada"}

        request = self.factory.patch(
            f"/api/finance/transactions/{self.tx_labor.id}/", data, format="json"
        )
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"patch": "partial_update"})
        response = view(request, pk=self.tx_labor.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["description"], "Descrição atualizada")

    def test_update_locked_transaction_fails(self):
        """PATCH deve falhar em transação bloqueada."""
        # Bloquear a transação
        self.tx_labor.lock(self.user)

        data = {"description": "Tentativa de atualização"}

        request = self.factory.patch(
            f"/api/finance/transactions/{self.tx_labor.id}/", data, format="json"
        )
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"patch": "partial_update"})
        response = view(request, pk=self.tx_labor.id)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("bloqueada", str(response.data).lower())

    def test_delete_unlocked_transaction(self):
        """DELETE deve funcionar em transação não bloqueada."""
        request = self.factory.delete(f"/api/finance/transactions/{self.tx_labor.id}/")
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"delete": "destroy"})
        response = view(request, pk=self.tx_labor.id)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CostTransaction.objects.filter(id=self.tx_labor.id).exists())

    def test_summary_endpoint(self):
        """GET /api/finance/transactions/summary/ deve retornar agregações."""
        request = self.factory.get("/api/finance/transactions/summary/")
        force_authenticate(request, user=self.user)
        view = CostTransactionViewSet.as_view({"get": "summary"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verificar estrutura
        self.assertIn("totals", response.data)
        self.assertIn("by_category", response.data)
        self.assertIn("by_type", response.data)

        # Verificar totais (500 + 320 + 800 = 1620)
        self.assertEqual(
            Decimal(str(response.data["totals"]["total_amount"])), Decimal("1620.00")
        )
        self.assertEqual(response.data["totals"]["transaction_count"], 3)


class LedgerAdjustmentAPITests(BaseLedgerAPITestCase):
    """Testes para endpoints de LedgerAdjustment."""

    def test_create_adjustment_for_transaction(self):
        """POST /api/finance/adjustments/ deve criar ajuste para transação existente."""
        data = {
            "original_transaction": str(self.tx_labor.id),
            "adjustment_type": "correction",
            "reason": "Correção de valor lançado incorretamente",
            "adjustment_amount": "-100.00",
        }

        request = self.factory.post("/api/finance/adjustments/", data, format="json")
        force_authenticate(request, user=self.user)
        view = LedgerAdjustmentViewSet.as_view({"post": "create"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["adjustment_type"], "correction")
        self.assertEqual(
            Decimal(response.data["adjustment_amount"]), Decimal("-100.00")
        )
        self.assertEqual(Decimal(response.data["original_amount"]), Decimal("500.00"))

        # Verificar que criou transação de ajuste
        self.assertIsNotNone(response.data["adjustment_transaction"])

    def test_create_standalone_adjustment(self):
        """Criar ajuste avulso (sem transação original)."""
        data = {
            "adjustment_type": "reclassification",
            "reason": "Lançamento retroativo descoberto em auditoria",
            "adjustment_amount": "250.00",
            "cost_center": str(self.cost_center.id),
            "category": "corrective",
        }

        request = self.factory.post("/api/finance/adjustments/", data, format="json")
        force_authenticate(request, user=self.user)
        view = LedgerAdjustmentViewSet.as_view({"post": "create"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["original_transaction_info"])
        self.assertEqual(Decimal(response.data["adjustment_amount"]), Decimal("250.00"))

    def test_list_adjustments(self):
        """GET /api/finance/adjustments/ deve listar ajustes."""
        # Criar um ajuste via API (que cria adjustment_transaction automaticamente)
        data = {
            "original_transaction": str(self.tx_labor.id),
            "adjustment_type": "correction",
            "reason": "Ajuste para teste de listagem",
            "adjustment_amount": "-50.00",
        }

        create_request = self.factory.post(
            "/api/finance/adjustments/", data, format="json"
        )
        force_authenticate(create_request, user=self.user)
        create_view = LedgerAdjustmentViewSet.as_view({"post": "create"})
        create_view(create_request)

        # Agora listar
        request = self.factory.get("/api/finance/adjustments/")
        force_authenticate(request, user=self.user)
        view = LedgerAdjustmentViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 1)


class LedgerModelTests(TenantTestCase):
    """Testes de modelo para validar regras de negócio."""

    def setUp(self):
        super().setUp()
        from django.contrib.auth import get_user_model

        User = get_user_model()

        self.user = User.objects.create_user(
            username="model_tester",
            email="model_test@example.com",
            password="testpass123",
        )

        self.cost_center = CostCenter.objects.create(
            code="CC-MODEL", name="Centro Modelo", is_active=True
        )

    def test_transaction_idempotency_key_unique(self):
        """idempotency_key deve ser único."""
        idem_key = "unique-key-123"

        CostTransaction.objects.create(
            idempotency_key=idem_key,
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("100.00"),
            occurred_at=timezone.now(),
            description="Primeira transação",
            cost_center=self.cost_center,
            created_by=self.user,
        )

        # Segunda com mesma key deve falhar (validado no full_clean)
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            CostTransaction.objects.create(
                idempotency_key=idem_key,
                transaction_type=CostTransaction.TransactionType.PARTS,
                category=CostTransaction.Category.CORRECTIVE,
                amount=Decimal("200.00"),
                occurred_at=timezone.now(),
                description="Segunda transação duplicada",
                cost_center=self.cost_center,
                created_by=self.user,
            )

    def test_transaction_lock_prevents_edit(self):
        """Transação bloqueada não pode ter campos protegidos alterados."""
        tx = CostTransaction.objects.create(
            idempotency_key="lock-test",
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("100.00"),
            occurred_at=timezone.now(),
            description="Para testar lock",
            cost_center=self.cost_center,
            created_by=self.user,
        )

        # Bloquear
        tx.lock(self.user)

        self.assertTrue(tx.is_locked)
        self.assertIsNotNone(tx.locked_at)
        self.assertEqual(tx.locked_by, self.user)

        # Tentar alterar campo protegido (amount) deve levantar exceção
        tx.amount = Decimal("200.00")
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            tx.save()

    def test_adjustment_creates_transaction(self):
        """Criar LedgerAdjustment via serializer deve criar CostTransaction de ajuste."""
        from rest_framework.test import APIRequestFactory

        from apps.trakledger.serializers import LedgerAdjustmentCreateSerializer

        original = CostTransaction.objects.create(
            idempotency_key="original-for-adjust",
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("500.00"),
            occurred_at=timezone.now(),
            description="Original",
            cost_center=self.cost_center,
            created_by=self.user,
        )

        # Criar um mock request para o serializer
        factory = APIRequestFactory()
        request = factory.post("/api/finance/adjustments/")
        request.user = self.user

        serializer = LedgerAdjustmentCreateSerializer(
            data={
                "original_transaction": str(original.id),
                "adjustment_type": "correction",
                "reason": "Correção de valor teste",
                "adjustment_amount": "-100.00",
            },
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        adjustment = serializer.save()

        # Deve ter criado transação de ajuste
        self.assertIsNotNone(adjustment.adjustment_transaction)
        self.assertEqual(adjustment.adjustment_transaction.amount, Decimal("-100.00"))
        self.assertEqual(
            adjustment.adjustment_transaction.transaction_type,
            CostTransaction.TransactionType.ADJUSTMENT,
        )
