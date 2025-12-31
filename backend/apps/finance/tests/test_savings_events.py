"""
Testes para SavingsEvent API

Testes de:
- CRUD de eventos de economia
- Validações (campos obrigatórios, evidências)
- Publicação de evento na outbox
- Filtros e endpoints de agregação
- Summary (by_type, by_month, by_cost_center)

Ref: docs/finance/01-erd.md, docs/api/finance.yaml
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.finance.models import CostCenter, SavingsEvent
from apps.finance.views import SavingsEventViewSet


class SavingsEventAPITests(TenantTestCase):
    """Testes da API de Eventos de Economia."""

    @classmethod
    def setup_tenant(cls, tenant):
        """Configura o tenant de teste."""
        tenant.name = "Test Company"
        tenant.is_active = True

    def setUp(self):
        """Setup antes de cada teste."""
        self.factory = APIRequestFactory()

        # Criar usuário de teste
        User = get_user_model()
        self.user = User.objects.create_user(
            username="finance_savings",
            email="finance@test.com",
            password="testpass123",
            first_name="Finance",
            last_name="User",
        )

        # Criar centro de custo
        self.cost_center = CostCenter.objects.create(
            code="CC-SAV-01",
            name="Centro de Custo Savings",
            description="Para testes de savings",
            is_active=True,
            created_by=self.user,
        )

        # Criar segundo centro de custo
        self.cost_center_2 = CostCenter.objects.create(
            code="CC-SAV-02",
            name="Centro de Custo Savings 2",
            description="Para testes de savings 2",
            is_active=True,
            created_by=self.user,
        )

    def _create_savings_event(self, **kwargs):
        """Helper para criar savings event."""
        defaults = {
            "event_type": SavingsEvent.EventType.AVOIDED_FAILURE,
            "savings_amount": Decimal("1000.00"),
            "cost_center": self.cost_center,
            "occurred_at": timezone.now(),
            "description": "Falha evitada por manutenção preventiva",
            "confidence": SavingsEvent.Confidence.MEDIUM,
            "created_by": self.user,
        }
        defaults.update(kwargs)
        return SavingsEvent.objects.create(**defaults)

    # =========================================================================
    # Testes CRUD
    # =========================================================================

    def test_list_savings_events(self):
        """Deve listar eventos de economia."""
        # Criar eventos
        self._create_savings_event()
        self._create_savings_event(
            event_type=SavingsEvent.EventType.ENERGY_SAVINGS,
            savings_amount=Decimal("500.00"),
        )

        view = SavingsEventViewSet.as_view({"get": "list"})
        request = self.factory.get("/api/finance/savings-events/")
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_create_savings_event(self):
        """Deve criar evento de economia com dados válidos."""
        data = {
            "event_type": SavingsEvent.EventType.AVOIDED_FAILURE,
            "savings_amount": "1500.00",
            "cost_center": str(self.cost_center.id),
            "occurred_at": timezone.now().isoformat(),
            "description": "Falha evitada por detecção precoce de vibração anormal",
            "confidence": SavingsEvent.Confidence.HIGH,
            "calculation_method": "Custo médio de reparo similar: R$ 5.000",
            "evidence": {
                "attachments": ["relatorio_vibracao.pdf"],
                "notes": "Detectado pelo sensor de vibração",
            },
        }

        view = SavingsEventViewSet.as_view({"post": "create"})
        request = self.factory.post(
            "/api/finance/savings-events/", data=data, format="json"
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["event_type"], "avoided_failure")
        self.assertEqual(Decimal(response.data["savings_amount"]), Decimal("1500.00"))
        self.assertEqual(response.data["confidence"], "high")
        self.assertIsNotNone(response.data["evidence"])

    def test_create_savings_event_minimal(self):
        """Deve criar evento com apenas campos obrigatórios."""
        data = {
            "event_type": SavingsEvent.EventType.OTHER,
            "savings_amount": "250.00",
            "cost_center": str(self.cost_center.id),
            "occurred_at": timezone.now().isoformat(),
            "description": "Economia identificada",
        }

        view = SavingsEventViewSet.as_view({"post": "create"})
        request = self.factory.post(
            "/api/finance/savings-events/", data=data, format="json"
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["confidence"], "medium")  # default

    def test_create_savings_event_missing_required(self):
        """Deve falhar ao criar evento sem campos obrigatórios."""
        data = {
            "event_type": SavingsEvent.EventType.AVOIDED_FAILURE,
            # savings_amount faltando
            "cost_center": str(self.cost_center.id),
        }

        view = SavingsEventViewSet.as_view({"post": "create"})
        request = self.factory.post(
            "/api/finance/savings-events/", data=data, format="json"
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("savings_amount", response.data)

    def test_retrieve_savings_event(self):
        """Deve retornar detalhes de um evento."""
        event = self._create_savings_event()

        view = SavingsEventViewSet.as_view({"get": "retrieve"})
        request = self.factory.get(f"/api/finance/savings-events/{event.id}/")
        force_authenticate(request, user=self.user)

        response = view(request, pk=str(event.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(event.id))
        self.assertEqual(response.data["event_type_display"], "Falha Evitada")

    def test_update_savings_event(self):
        """Deve atualizar um evento existente."""
        event = self._create_savings_event()

        data = {"savings_amount": "2000.00", "confidence": SavingsEvent.Confidence.HIGH}

        view = SavingsEventViewSet.as_view({"patch": "partial_update"})
        request = self.factory.patch(
            f"/api/finance/savings-events/{event.id}/", data=data, format="json"
        )
        force_authenticate(request, user=self.user)

        response = view(request, pk=str(event.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data["savings_amount"]), Decimal("2000.00"))
        self.assertEqual(response.data["confidence"], "high")

    def test_delete_savings_event(self):
        """Deve deletar um evento."""
        event = self._create_savings_event()
        event_id = event.id

        view = SavingsEventViewSet.as_view({"delete": "destroy"})
        request = self.factory.delete(f"/api/finance/savings-events/{event_id}/")
        force_authenticate(request, user=self.user)

        response = view(request, pk=str(event_id))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SavingsEvent.objects.filter(id=event_id).exists())

    # =========================================================================
    # Testes de Validação
    # =========================================================================

    def test_create_invalid_evidence_format(self):
        """Deve falhar com formato de evidências inválido."""
        data = {
            "event_type": SavingsEvent.EventType.AVOIDED_FAILURE,
            "savings_amount": "1000.00",
            "cost_center": str(self.cost_center.id),
            "occurred_at": timezone.now().isoformat(),
            "description": "Teste",
            "evidence": {"invalid_key": "valor"},  # Campo não permitido
        }

        view = SavingsEventViewSet.as_view({"post": "create"})
        request = self.factory.post(
            "/api/finance/savings-events/", data=data, format="json"
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("evidence", response.data)

    def test_create_negative_amount_fails(self):
        """Deve falhar com valor negativo."""
        data = {
            "event_type": SavingsEvent.EventType.AVOIDED_FAILURE,
            "savings_amount": "-100.00",
            "cost_center": str(self.cost_center.id),
            "occurred_at": timezone.now().isoformat(),
            "description": "Teste",
        }

        view = SavingsEventViewSet.as_view({"post": "create"})
        request = self.factory.post(
            "/api/finance/savings-events/", data=data, format="json"
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # Testes de Evento na Outbox
    # =========================================================================

    @patch("apps.core_events.services.EventPublisher.publish")
    def test_create_publishes_event(self, mock_publish):
        """Deve publicar evento na outbox ao criar."""
        data = {
            "event_type": SavingsEvent.EventType.AVOIDED_FAILURE,
            "savings_amount": "1000.00",
            "cost_center": str(self.cost_center.id),
            "occurred_at": timezone.now().isoformat(),
            "description": "Falha evitada",
        }

        view = SavingsEventViewSet.as_view({"post": "create"})
        request = self.factory.post(
            "/api/finance/savings-events/", data=data, format="json"
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_publish.assert_called_once()

        # Verificar payload do evento
        call_args = mock_publish.call_args
        self.assertEqual(call_args.kwargs["event_name"], "savings.event_posted")
        self.assertEqual(call_args.kwargs["aggregate_type"], "savings_event")
        self.assertEqual(call_args.kwargs["data"]["amount"], 1000.0)
        self.assertEqual(
            call_args.kwargs["data"]["cost_center_id"], str(self.cost_center.id)
        )

    # =========================================================================
    # Testes de Filtros
    # =========================================================================

    def test_filter_by_event_type(self):
        """Deve filtrar por tipo de evento."""
        self._create_savings_event(event_type=SavingsEvent.EventType.AVOIDED_FAILURE)
        self._create_savings_event(event_type=SavingsEvent.EventType.ENERGY_SAVINGS)
        self._create_savings_event(event_type=SavingsEvent.EventType.AVOIDED_FAILURE)

        view = SavingsEventViewSet.as_view({"get": "list"})
        request = self.factory.get(
            "/api/finance/savings-events/", {"event_type": "avoided_failure"}
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_filter_by_cost_center(self):
        """Deve filtrar por centro de custo."""
        self._create_savings_event(cost_center=self.cost_center)
        self._create_savings_event(cost_center=self.cost_center_2)

        view = SavingsEventViewSet.as_view({"get": "list"})
        request = self.factory.get(
            "/api/finance/savings-events/", {"cost_center": str(self.cost_center.id)}
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_filter_by_date_range(self):
        """Deve filtrar por período de data."""
        # Criar eventos em datas diferentes
        now = timezone.now()
        self._create_savings_event(occurred_at=now - timedelta(days=30))
        self._create_savings_event(occurred_at=now - timedelta(days=5))
        self._create_savings_event(occurred_at=now)

        view = SavingsEventViewSet.as_view({"get": "list"})
        request = self.factory.get(
            "/api/finance/savings-events/",
            {
                "start_date": (now - timedelta(days=10)).date().isoformat(),
                "end_date": now.date().isoformat(),
            },
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_filter_by_amount_range(self):
        """Deve filtrar por faixa de valor."""
        self._create_savings_event(savings_amount=Decimal("500.00"))
        self._create_savings_event(savings_amount=Decimal("1500.00"))
        self._create_savings_event(savings_amount=Decimal("3000.00"))

        view = SavingsEventViewSet.as_view({"get": "list"})
        request = self.factory.get(
            "/api/finance/savings-events/", {"min_amount": "1000", "max_amount": "2000"}
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_filter_by_confidence(self):
        """Deve filtrar por nível de confiança."""
        self._create_savings_event(confidence=SavingsEvent.Confidence.HIGH)
        self._create_savings_event(confidence=SavingsEvent.Confidence.LOW)
        self._create_savings_event(confidence=SavingsEvent.Confidence.HIGH)

        view = SavingsEventViewSet.as_view({"get": "list"})
        request = self.factory.get(
            "/api/finance/savings-events/", {"confidence": "high"}
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    # =========================================================================
    # Testes de Endpoints de Agregação
    # =========================================================================

    def test_summary_endpoint(self):
        """Deve retornar resumo agregado."""
        self._create_savings_event(
            savings_amount=Decimal("1000.00"),
            event_type=SavingsEvent.EventType.AVOIDED_FAILURE,
            confidence=SavingsEvent.Confidence.HIGH,
        )
        self._create_savings_event(
            savings_amount=Decimal("500.00"),
            event_type=SavingsEvent.EventType.ENERGY_SAVINGS,
            confidence=SavingsEvent.Confidence.MEDIUM,
        )
        self._create_savings_event(
            savings_amount=Decimal("250.00"),
            event_type=SavingsEvent.EventType.AVOIDED_FAILURE,
            confidence=SavingsEvent.Confidence.LOW,
        )

        view = SavingsEventViewSet.as_view({"get": "summary"})
        request = self.factory.get("/api/finance/savings-events/summary/")
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Decimal(str(response.data["total_savings"])), Decimal("1750.00")
        )
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(len(response.data["by_event_type"]), 2)
        self.assertEqual(len(response.data["by_confidence"]), 3)

    def test_by_type_endpoint(self):
        """Deve retornar economias agrupadas por tipo."""
        self._create_savings_event(
            savings_amount=Decimal("1000.00"),
            event_type=SavingsEvent.EventType.AVOIDED_FAILURE,
        )
        self._create_savings_event(
            savings_amount=Decimal("500.00"),
            event_type=SavingsEvent.EventType.ENERGY_SAVINGS,
        )
        self._create_savings_event(
            savings_amount=Decimal("300.00"),
            event_type=SavingsEvent.EventType.AVOIDED_FAILURE,
        )

        view = SavingsEventViewSet.as_view({"get": "by_type"})
        request = self.factory.get("/api/finance/savings-events/by_type/")
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("by_type", response.data)

        # Verificar que avoided_failure está no topo (maior total)
        by_type = response.data["by_type"]
        self.assertEqual(by_type[0]["event_type"], "avoided_failure")
        self.assertEqual(Decimal(str(by_type[0]["total_savings"])), Decimal("1300.00"))

    def test_by_month_endpoint(self):
        """Deve retornar economias agrupadas por mês."""
        now = timezone.now()
        last_month = now - timedelta(days=35)

        self._create_savings_event(savings_amount=Decimal("1000.00"), occurred_at=now)
        self._create_savings_event(
            savings_amount=Decimal("500.00"), occurred_at=last_month
        )

        view = SavingsEventViewSet.as_view({"get": "by_month"})
        request = self.factory.get("/api/finance/savings-events/by_month/")
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("by_month", response.data)
        self.assertEqual(len(response.data["by_month"]), 2)

    def test_by_cost_center_endpoint(self):
        """Deve retornar economias agrupadas por centro de custo."""
        self._create_savings_event(
            savings_amount=Decimal("1000.00"), cost_center=self.cost_center
        )
        self._create_savings_event(
            savings_amount=Decimal("500.00"), cost_center=self.cost_center_2
        )
        self._create_savings_event(
            savings_amount=Decimal("300.00"), cost_center=self.cost_center
        )

        view = SavingsEventViewSet.as_view({"get": "by_cost_center"})
        request = self.factory.get("/api/finance/savings-events/by_cost_center/")
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("by_cost_center", response.data)

        # CC1 deve estar no topo (1300 vs 500)
        by_cc = response.data["by_cost_center"]
        self.assertEqual(by_cc[0]["cost_center_code"], "CC-SAV-01")
        self.assertEqual(Decimal(str(by_cc[0]["total_savings"])), Decimal("1300.00"))


class BudgetSummaryAPITests(TenantTestCase):
    """Testes do endpoint de Summary Mensal de Orçamento."""

    @classmethod
    def setup_tenant(cls, tenant):
        """Configura o tenant de teste."""
        tenant.name = "Test Company Summary"
        tenant.is_active = True

    def setUp(self):
        """Setup antes de cada teste."""
        from apps.finance.models import (
            BudgetEnvelope,
            BudgetMonth,
            BudgetPlan,
            Commitment,
            CostTransaction,
        )

        self.factory = APIRequestFactory()

        # Criar usuário de teste
        User = get_user_model()
        self.user = User.objects.create_user(
            username="summary_test", email="summary@test.com", password="testpass123"
        )

        # Criar centro de custo
        self.cost_center = CostCenter.objects.create(
            code="CC-SUM-01",
            name="Centro de Custo Summary",
            is_active=True,
            created_by=self.user,
        )

        # Criar budget plan
        self.budget_plan = BudgetPlan.objects.create(
            code="BP-2024-TEST",
            name="Plano 2024 Test",
            year=2024,
            total_planned=Decimal("100000.00"),
            status=BudgetPlan.Status.ACTIVE,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            created_by=self.user,
        )

        # Criar envelope
        self.envelope = BudgetEnvelope.objects.create(
            name="Envelope Preventive",
            budget_plan=self.budget_plan,
            cost_center=self.cost_center,
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal("50000.00"),
            is_active=True,
        )

        # Criar budget month (junho 2024)
        self.budget_month = BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2024, 6, 1),
            planned_amount=Decimal("5000.00"),
        )

        # Criar compromissos
        from apps.finance.models import Commitment

        self.commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=date(2024, 6, 1),
            amount=Decimal("1200.00"),
            category=Commitment.Category.PREVENTIVE,
            status=Commitment.Status.APPROVED,
            description="Compromisso aprovado",
            created_by=self.user,
        )

        # Criar transação no ledger
        self.transaction = CostTransaction.objects.create(
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("3500.00"),
            currency="BRL",
            occurred_at=timezone.make_aware(datetime(2024, 6, 15)),
            description="Despesa preventiva",
            idempotency_key="test-trans-001",
            created_by=self.user,
        )

        # Criar savings event
        self.savings_event = SavingsEvent.objects.create(
            event_type=SavingsEvent.EventType.AVOIDED_FAILURE,
            savings_amount=Decimal("800.00"),
            cost_center=self.cost_center,
            occurred_at=timezone.make_aware(datetime(2024, 6, 20)),
            description="Falha evitada",
            confidence=SavingsEvent.Confidence.HIGH,
            created_by=self.user,
        )

    def test_budget_summary_monthly(self):
        """Deve retornar summary mensal correto."""
        from apps.finance.views import BudgetSummaryViewSet

        view = BudgetSummaryViewSet.as_view({"get": "list"})
        request = self.factory.get(
            "/api/finance/budget-summary/", {"month": "2024-06-01"}
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["month"], "2024-06-01")
        self.assertEqual(Decimal(str(response.data["planned"])), Decimal("5000.00"))
        self.assertEqual(Decimal(str(response.data["committed"])), Decimal("1200.00"))
        self.assertEqual(Decimal(str(response.data["actual"])), Decimal("3500.00"))
        self.assertEqual(Decimal(str(response.data["savings"])), Decimal("800.00"))
        self.assertEqual(
            Decimal(str(response.data["variance"])), Decimal("1500.00")
        )  # 5000 - 3500

    def test_budget_summary_with_cost_center_filter(self):
        """Deve filtrar summary por centro de custo."""
        from apps.finance.views import BudgetSummaryViewSet

        view = BudgetSummaryViewSet.as_view({"get": "list"})
        request = self.factory.get(
            "/api/finance/budget-summary/",
            {"month": "2024-06-01", "cost_center": str(self.cost_center.id)},
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["cost_center_id"], str(self.cost_center.id))
        self.assertEqual(response.data["cost_center_name"], "Centro de Custo Summary")

    def test_budget_summary_missing_month(self):
        """Deve falhar sem parâmetro month."""
        from apps.finance.views import BudgetSummaryViewSet

        view = BudgetSummaryViewSet.as_view({"get": "list"})
        request = self.factory.get("/api/finance/budget-summary/")
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_budget_summary_invalid_month_format(self):
        """Deve falhar com formato de mês inválido."""
        from apps.finance.views import BudgetSummaryViewSet

        view = BudgetSummaryViewSet.as_view({"get": "list"})
        request = self.factory.get(
            "/api/finance/budget-summary/", {"month": "invalid-date"}
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_budget_summary_empty_month(self):
        """Deve retornar zeros para mês sem dados."""
        from apps.finance.views import BudgetSummaryViewSet

        view = BudgetSummaryViewSet.as_view({"get": "list"})
        request = self.factory.get(
            "/api/finance/budget-summary/", {"month": "2023-01-01"}  # Mês sem dados
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(response.data["planned"])), Decimal("0.00"))
        self.assertEqual(Decimal(str(response.data["actual"])), Decimal("0.00"))

    def test_budget_summary_by_category(self):
        """Deve retornar breakdown por categoria."""
        from apps.finance.views import BudgetSummaryViewSet

        view = BudgetSummaryViewSet.as_view({"get": "list"})
        request = self.factory.get(
            "/api/finance/budget-summary/", {"month": "2024-06-01"}
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("by_category", response.data)

        # Deve ter pelo menos a categoria preventive
        categories = {c["category"]: c for c in response.data["by_category"]}
        self.assertIn("preventive", categories)
        self.assertEqual(
            Decimal(str(categories["preventive"]["planned"])), Decimal("5000.00")
        )

    def test_budget_summary_year(self):
        """Deve retornar summary anual."""
        from apps.finance.views import BudgetSummaryViewSet

        view = BudgetSummaryViewSet.as_view({"get": "year"})
        request = self.factory.get(
            "/api/finance/budget-summary/year/", {"year": "2024"}
        )
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["year"], 2024)
        self.assertIn("by_month", response.data)
        self.assertEqual(len(response.data["by_month"]), 12)

        # Verificar junho
        june_data = next(
            m for m in response.data["by_month"] if m["month"] == "2024-06-01"
        )
        self.assertEqual(Decimal(str(june_data["planned"])), Decimal("5000.00"))

    def test_budget_summary_year_missing(self):
        """Deve falhar sem parâmetro year no endpoint anual."""
        from apps.finance.views import BudgetSummaryViewSet

        view = BudgetSummaryViewSet.as_view({"get": "year"})
        request = self.factory.get("/api/finance/budget-summary/year/")
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
