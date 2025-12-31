"""
Commitment API Tests

Testes de integração para os endpoints da API de Compromissos.
Usa django-tenants TenantTestCase para testes em ambiente multi-tenant.

Endpoints testados:
- Commitment CRUD
- submit, approve, reject, cancel actions
- pending, summary, by_month endpoints
- Event commitment.approved

NOTA: Estes testes usam TenantTestCase com chamadas diretas às views via
APIRequestFactory em vez de HTTP client, para funcionar corretamente com
django-tenants multi-tenant e autenticação JWT.
"""

import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch

from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from django_tenants.test.cases import TenantTestCase

from apps.finance.models import Commitment, CostCenter
from apps.finance.views import CommitmentViewSet


class BaseCommitmentTestCase(TenantTestCase):
    """
    Base class para testes de Commitment.

    Usa django-tenants TenantTestCase e APIRequestFactory para criar
    requests autenticados e chamar views diretamente.
    """

    def setUp(self):
        """Setup comum para todos os testes."""
        super().setUp()
        self.factory = APIRequestFactory()

        # Criar usuário de teste
        from django.contrib.auth import get_user_model

        User = get_user_model()

        self.user = User.objects.create_user(
            username="test_commitment",
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

        self.approver = User.objects.create_user(
            username="approver",
            email="approver@example.com",
            password="testpass123",
            first_name="Approver",
            last_name="User",
        )

        # Criar centro de custo para testes
        self.cost_center = CostCenter.objects.create(
            code="CC-001", name="Centro de Teste", is_active=True
        )

        self.budget_month = date(2024, 6, 1)


class CommitmentCRUDTests(BaseCommitmentTestCase):
    """Testes para operações CRUD de Commitment."""

    def test_list_commitments(self):
        """GET /api/finance/commitments/ deve listar compromissos."""
        Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=self.budget_month,
            amount=Decimal("1000.00"),
            category="preventive",
            description="Commitment 1",
            created_by=self.user,
        )
        Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=self.budget_month,
            amount=Decimal("2000.00"),
            category="corrective",
            description="Commitment 2",
            created_by=self.user,
        )

        request = self.factory.get("/api/finance/commitments/")
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 2)

    def test_create_commitment(self):
        """POST /api/finance/commitments/ deve criar compromisso."""
        data = {
            "cost_center": str(self.cost_center.id),
            "budget_month": "2024-06-01",
            "amount": "1500.00",
            "category": "preventive",
            "description": "Manutenção preventiva HVAC",
        }

        request = self.factory.post("/api/finance/commitments/", data, format="json")
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"post": "create"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "draft")
        self.assertEqual(response.data["category"], "preventive")
        self.assertEqual(Decimal(response.data["amount"]), Decimal("1500.00"))

    def test_create_commitment_with_submit(self):
        """Deve criar compromisso já submetido se submit=True."""
        data = {
            "cost_center": str(self.cost_center.id),
            "budget_month": "2024-06-01",
            "amount": "1500.00",
            "category": "preventive",
            "description": "Manutenção preventiva HVAC",
            "submit": True,
        }

        request = self.factory.post("/api/finance/commitments/", data, format="json")
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"post": "create"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "submitted")

    def test_create_commitment_normalizes_budget_month(self):
        """Deve normalizar budget_month para primeiro dia do mês."""
        data = {
            "cost_center": str(self.cost_center.id),
            "budget_month": "2024-06-15",  # dia 15
            "amount": "1500.00",
            "category": "preventive",
            "description": "Test",
        }

        request = self.factory.post("/api/finance/commitments/", data, format="json")
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"post": "create"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["budget_month"], "2024-06-01")

    def test_retrieve_commitment(self):
        """GET /api/finance/commitments/{id}/ deve retornar detalhes."""
        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=self.budget_month,
            amount=Decimal("1000.00"),
            category="preventive",
            description="Test commitment",
            created_by=self.user,
        )

        request = self.factory.get(f"/api/finance/commitments/{commitment.id}/")
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"get": "retrieve"})
        response = view(request, pk=commitment.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["description"], "Test commitment")
        self.assertEqual(response.data["cost_center_name"], "Centro de Teste")

    def test_update_commitment_draft(self):
        """PATCH deve atualizar compromisso em DRAFT."""
        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=self.budget_month,
            amount=Decimal("1000.00"),
            category="preventive",
            description="Original",
            created_by=self.user,
        )

        request = self.factory.patch(
            f"/api/finance/commitments/{commitment.id}/",
            {"description": "Updated"},
            format="json",
        )
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"patch": "partial_update"})
        response = view(request, pk=commitment.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["description"], "Updated")

    def test_update_commitment_not_draft_fails(self):
        """PATCH em compromisso não-DRAFT deve falhar."""
        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=self.budget_month,
            amount=Decimal("1000.00"),
            category="preventive",
            description="Test",
            status=Commitment.Status.SUBMITTED,
            created_by=self.user,
        )

        request = self.factory.patch(
            f"/api/finance/commitments/{commitment.id}/",
            {"description": "Updated"},
            format="json",
        )
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"patch": "partial_update"})
        response = view(request, pk=commitment.id)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_commitment_draft(self):
        """DELETE deve remover compromisso em DRAFT."""
        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=self.budget_month,
            amount=Decimal("1000.00"),
            category="preventive",
            description="To delete",
            created_by=self.user,
        )
        commitment_id = commitment.id

        request = self.factory.delete(f"/api/finance/commitments/{commitment_id}/")
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"delete": "destroy"})
        response = view(request, pk=commitment_id)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Commitment.objects.filter(id=commitment_id).exists())

    def test_delete_commitment_not_draft_fails(self):
        """DELETE em compromisso não-DRAFT deve falhar."""
        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=self.budget_month,
            amount=Decimal("1000.00"),
            category="preventive",
            description="Test",
            status=Commitment.Status.APPROVED,
            created_by=self.user,
        )

        request = self.factory.delete(f"/api/finance/commitments/{commitment.id}/")
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"delete": "destroy"})
        response = view(request, pk=commitment.id)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class CommitmentActionsTests(BaseCommitmentTestCase):
    """Testes para actions de Commitment (submit, approve, reject, cancel)."""

    def test_submit_commitment(self):
        """POST /api/finance/commitments/{id}/submit/ deve submeter."""
        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=self.budget_month,
            amount=Decimal("1000.00"),
            category="preventive",
            description="Test",
            created_by=self.user,
        )

        request = self.factory.post(f"/api/finance/commitments/{commitment.id}/submit/")
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"post": "submit"})
        response = view(request, pk=commitment.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "submitted")

        commitment.refresh_from_db()
        self.assertEqual(commitment.status, Commitment.Status.SUBMITTED)

    def test_submit_non_draft_fails(self):
        """Submit de compromisso não-DRAFT deve falhar."""
        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=self.budget_month,
            amount=Decimal("1000.00"),
            category="preventive",
            description="Test",
            status=Commitment.Status.SUBMITTED,
            created_by=self.user,
        )

        request = self.factory.post(f"/api/finance/commitments/{commitment.id}/submit/")
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"post": "submit"})
        response = view(request, pk=commitment.id)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.core_events.services.EventPublisher.publish")
    def test_approve_commitment(self, mock_publish):
        """POST /api/finance/commitments/{id}/approve/ deve aprovar e emitir evento."""
        mock_event = MagicMock()
        mock_event.id = uuid.uuid4()
        mock_publish.return_value = mock_event

        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=self.budget_month,
            amount=Decimal("1000.00"),
            category="preventive",
            description="Test",
            status=Commitment.Status.SUBMITTED,
            created_by=self.user,
        )

        request = self.factory.post(
            f"/api/finance/commitments/{commitment.id}/approve/"
        )
        force_authenticate(request, user=self.approver)
        view = CommitmentViewSet.as_view({"post": "approve"})
        response = view(request, pk=commitment.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "approved")
        self.assertIn("event_id", response.data)

        commitment.refresh_from_db()
        self.assertEqual(commitment.status, Commitment.Status.APPROVED)
        self.assertEqual(commitment.approved_by, self.approver)
        self.assertIsNotNone(commitment.approved_at)

        # Verificar chamada do EventPublisher
        mock_publish.assert_called_once()
        call_kwargs = mock_publish.call_args[1]
        self.assertEqual(call_kwargs["event_name"], "commitment.approved")
        self.assertEqual(call_kwargs["aggregate_type"], "commitment")
        self.assertEqual(call_kwargs["data"]["commitment_id"], str(commitment.id))

    def test_approve_non_submitted_fails(self):
        """Approve de compromisso não-SUBMITTED deve falhar."""
        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=self.budget_month,
            amount=Decimal("1000.00"),
            category="preventive",
            description="Test",
            status=Commitment.Status.DRAFT,
            created_by=self.user,
        )

        request = self.factory.post(
            f"/api/finance/commitments/{commitment.id}/approve/"
        )
        force_authenticate(request, user=self.approver)
        view = CommitmentViewSet.as_view({"post": "approve"})
        response = view(request, pk=commitment.id)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_commitment(self):
        """POST /api/finance/commitments/{id}/reject/ deve rejeitar."""
        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=self.budget_month,
            amount=Decimal("1000.00"),
            category="preventive",
            description="Test",
            status=Commitment.Status.SUBMITTED,
            created_by=self.user,
        )

        request = self.factory.post(
            f"/api/finance/commitments/{commitment.id}/reject/",
            {"reason": "Valor excede o limite do orçamento mensal."},
            format="json",
        )
        force_authenticate(request, user=self.approver)
        view = CommitmentViewSet.as_view({"post": "reject"})
        response = view(request, pk=commitment.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "rejected")

        commitment.refresh_from_db()
        self.assertEqual(commitment.status, Commitment.Status.REJECTED)
        self.assertEqual(
            commitment.rejection_reason, "Valor excede o limite do orçamento mensal."
        )

    def test_reject_without_reason_fails(self):
        """Reject sem motivo deve falhar."""
        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=self.budget_month,
            amount=Decimal("1000.00"),
            category="preventive",
            description="Test",
            status=Commitment.Status.SUBMITTED,
            created_by=self.user,
        )

        request = self.factory.post(
            f"/api/finance/commitments/{commitment.id}/reject/",
            {"reason": "short"},  # menos de 10 caracteres
            format="json",
        )
        force_authenticate(request, user=self.approver)
        view = CommitmentViewSet.as_view({"post": "reject"})
        response = view(request, pk=commitment.id)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancel_commitment(self):
        """POST /api/finance/commitments/{id}/cancel/ deve cancelar."""
        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=self.budget_month,
            amount=Decimal("1000.00"),
            category="preventive",
            description="Test",
            status=Commitment.Status.APPROVED,
            created_by=self.user,
        )

        request = self.factory.post(f"/api/finance/commitments/{commitment.id}/cancel/")
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"post": "cancel"})
        response = view(request, pk=commitment.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "cancelled")

        commitment.refresh_from_db()
        self.assertEqual(commitment.status, Commitment.Status.CANCELLED)

    def test_cancel_realized_fails(self):
        """Cancel de compromisso REALIZED deve falhar."""
        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=self.budget_month,
            amount=Decimal("1000.00"),
            category="preventive",
            description="Test",
            status=Commitment.Status.REALIZED,
            created_by=self.user,
        )

        request = self.factory.post(f"/api/finance/commitments/{commitment.id}/cancel/")
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"post": "cancel"})
        response = view(request, pk=commitment.id)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CommitmentSummaryTests(BaseCommitmentTestCase):
    """Testes para endpoints de summary e agregação."""

    def setUp(self):
        super().setUp()
        # Criar vários commitments para testes de agregação
        Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=date(2024, 6, 1),
            amount=Decimal("1000.00"),
            category="preventive",
            description="Test 1",
            status=Commitment.Status.APPROVED,
            created_by=self.user,
        )
        Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=date(2024, 6, 1),
            amount=Decimal("2000.00"),
            category="corrective",
            description="Test 2",
            status=Commitment.Status.APPROVED,
            created_by=self.user,
        )
        Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=date(2024, 7, 1),
            amount=Decimal("1500.00"),
            category="preventive",
            description="Test 3",
            status=Commitment.Status.SUBMITTED,
            created_by=self.user,
        )
        Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=date(2024, 7, 1),
            amount=Decimal("500.00"),
            category="parts",
            description="Test 4",
            status=Commitment.Status.DRAFT,
            created_by=self.user,
        )

    def test_pending_commitments(self):
        """GET /api/finance/commitments/pending/ deve retornar apenas SUBMITTED."""
        request = self.factory.get("/api/finance/commitments/pending/")
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"get": "pending"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Pode ter paginação ou não, checar o response
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["status"], "submitted")

    def test_summary(self):
        """GET /api/finance/commitments/summary/ deve retornar agregações."""
        request = self.factory.get("/api/finance/commitments/summary/")
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"get": "summary"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verificar totais
        self.assertIn("totals", response.data)
        self.assertEqual(response.data["totals"]["total_count"], 4)
        self.assertEqual(
            Decimal(str(response.data["totals"]["total_amount"])), Decimal("5000.00")
        )
        self.assertEqual(
            Decimal(str(response.data["totals"]["approved_amount"])), Decimal("3000.00")
        )
        self.assertEqual(
            Decimal(str(response.data["totals"]["pending_amount"])), Decimal("1500.00")
        )

        # Verificar agregação por status
        self.assertIn("by_status", response.data)

        # Verificar agregação por categoria
        self.assertIn("by_category", response.data)

    def test_by_month(self):
        """GET /api/finance/commitments/by_month/ deve retornar totais por mês."""
        request = self.factory.get("/api/finance/commitments/by_month/")
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"get": "by_month"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("by_month", response.data)
        self.assertEqual(len(response.data["by_month"]), 2)  # Junho e Julho


class CommitmentFilterTests(BaseCommitmentTestCase):
    """Testes para filtros de Commitment."""

    def setUp(self):
        super().setUp()

        self.cost_center2 = CostCenter.objects.create(
            code="CC-002", name="Centro 2", is_active=True
        )

        Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=date(2024, 6, 1),
            amount=Decimal("1000.00"),
            category="preventive",
            description="Commitment CC1 Preventive",
            status=Commitment.Status.APPROVED,
            created_by=self.user,
        )
        Commitment.objects.create(
            cost_center=self.cost_center2,
            budget_month=date(2024, 6, 1),
            amount=Decimal("2000.00"),
            category="corrective",
            description="Commitment CC2 Corrective",
            status=Commitment.Status.SUBMITTED,
            created_by=self.user,
        )
        Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=date(2024, 7, 1),
            amount=Decimal("1500.00"),
            category="preventive",
            description="Commitment CC1 July",
            status=Commitment.Status.DRAFT,
            created_by=self.user,
        )

    def test_filter_by_status(self):
        """Deve filtrar por status."""
        request = self.factory.get("/api/finance/commitments/", {"status": "approved"})
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["status"], "approved")

    def test_filter_by_cost_center(self):
        """Deve filtrar por centro de custo."""
        request = self.factory.get(
            "/api/finance/commitments/", {"cost_center": str(self.cost_center2.id)}
        )
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["cost_center_code"], "CC-002")

    def test_filter_by_category(self):
        """Deve filtrar por categoria."""
        request = self.factory.get(
            "/api/finance/commitments/", {"category": "preventive"}
        )
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 2)
        for r in results:
            self.assertEqual(r["category"], "preventive")

    def test_filter_by_budget_month(self):
        """Deve filtrar por mês do orçamento."""
        request = self.factory.get(
            "/api/finance/commitments/", {"budget_month": "2024-06-01"}
        )
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 2)

    def test_filter_by_year(self):
        """Deve filtrar por ano."""
        request = self.factory.get("/api/finance/commitments/", {"year": "2024"})
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 3)

    def test_filter_by_amount_range(self):
        """Deve filtrar por range de valor."""
        request = self.factory.get(
            "/api/finance/commitments/", {"min_amount": "1500", "max_amount": "2500"}
        )
        force_authenticate(request, user=self.user)
        view = CommitmentViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 2)
