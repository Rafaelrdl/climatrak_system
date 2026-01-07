"""
Finance Tests

Testes unitários para:
- Models (CostCenter, RateCard, BudgetPlan, BudgetEnvelope, BudgetMonth)
- Models Ledger (CostTransaction, LedgerAdjustment)
- Serializers
- ViewSets/Endpoints

NOTE: Finance is a TENANT_APP, so all tests must use TenantTestCase
to ensure tables are created in the test tenant schema.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone

from django_tenants.test.cases import TenantTestCase

from apps.trakledger.models import (
    BudgetEnvelope,
    BudgetMonth,
    BudgetPlan,
    CostCenter,
    CostTransaction,
    LedgerAdjustment,
    RateCard,
)
from apps.trakledger.serializers import (
    CostCenterSerializer,
    CostTransactionCreateSerializer,
    CostTransactionSerializer,
    RateCardSerializer,
)


class CostCenterModelTests(TenantTestCase):
    """Testes para model CostCenter."""

    def setUp(self):
        """Limpa dados antes de cada teste."""
        CostCenter.objects.all().delete()

    def test_create_cost_center(self):
        """Deve criar centro de custo básico."""
        cc = CostCenter.objects.create(
            code="CC-001", name="Sede São Paulo", description="Sede principal"
        )
        self.assertEqual(cc.code, "CC-001")
        self.assertEqual(cc.name, "Sede São Paulo")
        self.assertTrue(cc.is_active)
        self.assertIsNone(cc.parent)
        self.assertEqual(cc.level, 0)

    def test_create_hierarchy(self):
        """Deve criar hierarquia de centros de custo."""
        parent = CostCenter.objects.create(code="CC-001", name="Sede")
        child = CostCenter.objects.create(code="CC-001-01", name="HVAC", parent=parent)
        grandchild = CostCenter.objects.create(
            code="CC-001-01-01", name="Chiller", parent=child
        )

        self.assertEqual(parent.level, 0)
        self.assertEqual(child.level, 1)
        self.assertEqual(grandchild.level, 2)
        self.assertEqual(grandchild.full_path, "Sede > HVAC > Chiller")

    def test_prevent_self_reference(self):
        """Não deve permitir auto-referência."""
        cc = CostCenter.objects.create(code="CC-001", name="Test")
        cc.parent = cc

        with self.assertRaises(ValidationError):
            cc.save()

    def test_unique_code(self):
        """Código deve ser único."""
        CostCenter.objects.create(code="CC-001", name="First")

        # Django pode levantar ValidationError (validate_unique)
        # ou IntegrityError (banco de dados) dependendo do caminho de validação
        with self.assertRaises((IntegrityError, ValidationError)):
            CostCenter.objects.create(code="CC-001", name="Second")

    def test_tags_default(self):
        """Tags deve ser lista vazia por padrão."""
        cc = CostCenter.objects.create(code="CC-001", name="Test")
        self.assertEqual(cc.tags, [])

    def test_tags_json(self):
        """Deve armazenar tags como JSON."""
        cc = CostCenter.objects.create(
            code="CC-001", name="Test", tags=["hvac", "crítico"]
        )
        cc.refresh_from_db()
        self.assertEqual(cc.tags, ["hvac", "crítico"])


class RateCardModelTests(TenantTestCase):
    """Testes para model RateCard."""

    def test_create_rate_card(self):
        """Deve criar rate card básico."""
        rc = RateCard.objects.create(
            role="Técnico HVAC",
            role_code="TECH-HVAC",
            cost_per_hour=Decimal("85.00"),
            effective_from=date(2024, 1, 1),
        )
        self.assertEqual(rc.role, "Técnico HVAC")
        self.assertEqual(rc.cost_per_hour, Decimal("85.00"))
        self.assertEqual(rc.currency, "BRL")
        self.assertIsNone(rc.effective_to)

    def test_rate_card_with_end_date(self):
        """Deve criar rate card com data de fim."""
        rc = RateCard.objects.create(
            role="Eletricista",
            cost_per_hour=Decimal("100.00"),
            effective_from=date(2024, 1, 1),
            effective_to=date(2024, 12, 31),
        )
        self.assertEqual(rc.effective_to, date(2024, 12, 31))

    def test_effective_to_before_from(self):
        """Data de fim não pode ser anterior à de início."""
        with self.assertRaises(ValidationError):
            RateCard.objects.create(
                role="Test",
                cost_per_hour=Decimal("50.00"),
                effective_from=date(2024, 6, 1),
                effective_to=date(2024, 1, 1),
            )

    def test_get_rate_for_role(self):
        """Deve retornar rate card vigente para função."""
        RateCard.objects.create(
            role="Técnico",
            cost_per_hour=Decimal("80.00"),
            effective_from=date(2023, 1, 1),
            effective_to=date(2023, 12, 31),
        )
        current = RateCard.objects.create(
            role="Técnico",
            cost_per_hour=Decimal("90.00"),
            effective_from=date(2024, 1, 1),
        )

        result = RateCard.get_rate_for_role("Técnico", date(2024, 6, 1))
        self.assertEqual(result, current)

    def test_get_rate_for_role_not_found(self):
        """Deve retornar None se não encontrar rate card."""
        result = RateCard.get_rate_for_role("Inexistente", date(2024, 1, 1))
        self.assertIsNone(result)


class BudgetPlanModelTests(TenantTestCase):
    """Testes para model BudgetPlan."""

    def setUp(self):
        """Limpa dados antes de cada teste."""
        BudgetPlan.objects.all().delete()

    def test_create_budget_plan(self):
        """Deve criar plano orçamentário."""
        plan = BudgetPlan.objects.create(
            code="BUDGET-2024",
            name="Orçamento 2024",
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
        )
        self.assertEqual(plan.code, "BUDGET-2024")
        self.assertEqual(plan.status, BudgetPlan.Status.DRAFT)
        self.assertEqual(plan.total_planned, Decimal("0.00"))

    def test_unique_code(self):
        """Código deve ser único."""
        BudgetPlan.objects.create(
            code="BUDGET-2024",
            name="First",
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
        )

        # Django pode levantar ValidationError (validate_unique)
        # ou IntegrityError (banco de dados) dependendo do caminho de validação
        with self.assertRaises((IntegrityError, ValidationError)):
            BudgetPlan.objects.create(
                code="BUDGET-2024",
                name="Second",
                year=2024,
                start_date=date(2024, 1, 1),
                end_date=date(2024, 12, 31),
            )

    def test_end_before_start(self):
        """Data de fim não pode ser anterior à de início."""
        with self.assertRaises(ValidationError):
            BudgetPlan.objects.create(
                code="TEST",
                name="Test",
                year=2024,
                start_date=date(2024, 12, 31),
                end_date=date(2024, 1, 1),
            )


class BudgetEnvelopeModelTests(TenantTestCase):
    """Testes para model BudgetEnvelope."""

    def setUp(self):
        BudgetEnvelope.objects.all().delete()
        BudgetMonth.objects.all().delete()
        BudgetPlan.objects.all().delete()
        CostCenter.objects.all().delete()
        self.cost_center = CostCenter.objects.create(code="CC-001", name="Test")
        self.plan = BudgetPlan.objects.create(
            code="BUDGET-2024",
            name="Orçamento 2024",
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
        )

    def test_create_envelope(self):
        """Deve criar envelope de orçamento."""
        envelope = BudgetEnvelope.objects.create(
            budget_plan=self.plan,
            cost_center=self.cost_center,
            name="Manutenção Preventiva",
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal("120000.00"),
        )
        self.assertEqual(envelope.amount, Decimal("120000.00"))
        self.assertEqual(envelope.category, "preventive")

    def test_envelope_updates_plan_total(self):
        """Criar envelope deve atualizar total do plano."""
        BudgetEnvelope.objects.create(
            budget_plan=self.plan,
            cost_center=self.cost_center,
            name="Envelope 1",
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal("50000.00"),
        )

        self.plan.refresh_from_db()
        self.assertEqual(self.plan.total_planned, Decimal("50000.00"))

        BudgetEnvelope.objects.create(
            budget_plan=self.plan,
            cost_center=self.cost_center,
            name="Envelope 2",
            category=BudgetEnvelope.Category.CORRECTIVE,
            amount=Decimal("30000.00"),
        )

        self.plan.refresh_from_db()
        self.assertEqual(self.plan.total_planned, Decimal("80000.00"))

    def test_unique_plan_cc_category(self):
        """Não pode haver dois envelopes para mesmo plano/cc/categoria."""
        BudgetEnvelope.objects.create(
            budget_plan=self.plan,
            cost_center=self.cost_center,
            name="First",
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal("10000.00"),
        )

        with self.assertRaises(IntegrityError):
            BudgetEnvelope.objects.create(
                budget_plan=self.plan,
                cost_center=self.cost_center,
                name="Second",
                category=BudgetEnvelope.Category.PREVENTIVE,
                amount=Decimal("20000.00"),
            )


class BudgetMonthModelTests(TenantTestCase):
    """Testes para model BudgetMonth."""

    def setUp(self):
        BudgetMonth.objects.all().delete()
        BudgetEnvelope.objects.all().delete()
        BudgetPlan.objects.all().delete()
        CostCenter.objects.all().delete()
        self.cost_center = CostCenter.objects.create(code="CC-001", name="Test")
        self.plan = BudgetPlan.objects.create(
            code="BUDGET-2024",
            name="Orçamento 2024",
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
        )
        self.envelope = BudgetEnvelope.objects.create(
            budget_plan=self.plan,
            cost_center=self.cost_center,
            name="Test Envelope",
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal("120000.00"),
        )

    def test_create_budget_month(self):
        """Deve criar mês do orçamento."""
        month = BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2024, 1, 1),
            planned_amount=Decimal("10000.00"),
        )
        self.assertEqual(month.planned_amount, Decimal("10000.00"))
        self.assertFalse(month.is_locked)

    def test_normalizes_to_first_day(self):
        """Deve normalizar data para primeiro dia do mês."""
        month = BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2024, 1, 15),  # Dia 15
            planned_amount=Decimal("10000.00"),
        )
        self.assertEqual(month.month.day, 1)

    def test_unique_envelope_month(self):
        """Não pode haver dois registros para mesmo envelope/mês."""
        BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2024, 1, 1),
            planned_amount=Decimal("10000.00"),
        )

        # Django pode levantar ValidationError (validate_unique)
        # ou IntegrityError (banco de dados) dependendo do caminho de validação
        with self.assertRaises((IntegrityError, ValidationError)):
            BudgetMonth.objects.create(
                envelope=self.envelope,
                month=date(2024, 1, 1),
                planned_amount=Decimal("5000.00"),
            )

    def test_lock_unlock(self):
        """Deve bloquear e desbloquear mês."""
        from django.contrib.auth import get_user_model

        User = get_user_model()

        # Criar usuário real para o teste
        user = User.objects.create_user(
            username="test_lock_user",
            email="test_lock@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

        month = BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2024, 1, 1),
            planned_amount=Decimal("10000.00"),
        )

        self.assertFalse(month.is_locked)

        month.lock(user)
        self.assertTrue(month.is_locked)
        self.assertIsNotNone(month.locked_at)

        month.unlock(user)
        self.assertFalse(month.is_locked)
        self.assertIsNone(month.locked_at)


class CostCenterSerializerTests(TenantTestCase):
    """Testes para CostCenterSerializer."""

    def test_serialize_cost_center(self):
        """Deve serializar centro de custo."""
        cc = CostCenter.objects.create(code="CC-001", name="Test", tags=["hvac"])
        serializer = CostCenterSerializer(cc)
        data = serializer.data

        self.assertEqual(data["code"], "CC-001")
        self.assertEqual(data["name"], "Test")
        self.assertEqual(data["level"], 0)
        self.assertEqual(data["tags"], ["hvac"])

    def test_deserialize_cost_center(self):
        """Deve deserializar centro de custo."""
        data = {"code": "CC-002", "name": "New CC", "description": "Test description"}
        serializer = CostCenterSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        cc = serializer.save()

        self.assertEqual(cc.code, "CC-002")
        self.assertEqual(cc.name, "New CC")


class RateCardSerializerTests(TenantTestCase):
    """Testes para RateCardSerializer."""

    def test_serialize_rate_card(self):
        """Deve serializar rate card."""
        rc = RateCard.objects.create(
            role="Técnico",
            cost_per_hour=Decimal("85.00"),
            effective_from=date(2024, 1, 1),
        )
        serializer = RateCardSerializer(rc)
        data = serializer.data

        self.assertEqual(data["role"], "Técnico")
        self.assertEqual(data["cost_per_hour"], "85.00")
        self.assertTrue(data["is_current"])

    def test_is_current_false_for_future(self):
        """is_current deve ser False para rate card futuro."""
        rc = RateCard.objects.create(
            role="Técnico",
            cost_per_hour=Decimal("100.00"),
            effective_from=date.today() + timedelta(days=30),
        )
        serializer = RateCardSerializer(rc)
        self.assertFalse(serializer.data["is_current"])


# =============================================================================
# API Tests (precisam de setup de tenant para funcionar no django-tenants)
# =============================================================================

# Nota: Os testes de API abaixo requerem setup especial para django-tenants
# Em ambiente real, usar TenantTestCase ou similar do django-tenants


class FinanceAPITests(TenantTestCase):
    """
    Testes de API Finance.

    Nota: Estes testes são estruturais. Em ambiente com django-tenants,
    usar TenantTestCase para testes de integração completos.
    """

    def test_models_exist(self):
        """Verifica que os models existem e podem ser instanciados."""
        # CostCenter
        cc = CostCenter(code="TEST", name="Test")
        self.assertIsNotNone(cc)

        # RateCard
        rc = RateCard(
            role="Test", cost_per_hour=Decimal("50"), effective_from=date.today()
        )
        self.assertIsNotNone(rc)

        # BudgetPlan
        bp = BudgetPlan(
            code="TEST",
            name="Test",
            year=2024,
            start_date=date.today(),
            end_date=date.today(),
        )
        self.assertIsNotNone(bp)


# =============================================================================
# Ledger Tests (CostTransaction, LedgerAdjustment)
# =============================================================================


class CostTransactionModelTests(TenantTestCase):
    """Testes para model CostTransaction."""

    def setUp(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()

        CostTransaction.objects.all().delete()
        CostCenter.objects.all().delete()
        User.objects.filter(email="test_costx@example.com").delete()

        self.cost_center = CostCenter.objects.create(code="CC-001", name="Test CC")
        self.test_user = User.objects.create_user(
            username="test_costx_user",
            email="test_costx@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

    def test_create_transaction(self):
        """Deve criar transação de custo básica."""
        tx = CostTransaction.objects.create(
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("500.00"),
            occurred_at=timezone.now(),
            cost_center=self.cost_center,
            description="Manutenção preventiva HVAC",
        )
        self.assertEqual(tx.transaction_type, "labor")
        self.assertEqual(tx.category, "preventive")
        self.assertEqual(tx.amount, Decimal("500.00"))
        self.assertFalse(tx.is_locked)
        self.assertIsNone(tx.idempotency_key)

    def test_create_transaction_with_idempotency_key(self):
        """Deve criar transação com chave de idempotência."""
        work_order_id = "b1c2d3e4-f5a6-7890-abcd-ef1234567890"
        key = CostTransaction.generate_idempotency_key(work_order_id, "labor")

        tx = CostTransaction.objects.create(
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.CORRECTIVE,
            amount=Decimal("750.00"),
            occurred_at=timezone.now(),
            cost_center=self.cost_center,
            idempotency_key=key,
        )
        self.assertEqual(tx.idempotency_key, f"wo:{work_order_id}:labor")

    def test_idempotency_key_unique(self):
        """Chave de idempotência deve ser única."""
        key = "wo:test-uuid:labor"

        CostTransaction.objects.create(
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("100.00"),
            occurred_at=timezone.now(),
            cost_center=self.cost_center,
            idempotency_key=key,
        )

        # Django pode levantar ValidationError (validate_unique)
        # ou IntegrityError (banco de dados) dependendo do caminho de validação
        with self.assertRaises((IntegrityError, ValidationError)):
            CostTransaction.objects.create(
                transaction_type=CostTransaction.TransactionType.LABOR,
                category=CostTransaction.Category.PREVENTIVE,
                amount=Decimal("200.00"),
                occurred_at=timezone.now(),
                cost_center=self.cost_center,
                idempotency_key=key,
            )

    def test_get_or_create_idempotent(self):
        """Deve retornar existente ou criar novo de forma idempotente."""
        key = "wo:test-uuid:parts"
        defaults = {
            "transaction_type": CostTransaction.TransactionType.PARTS,
            "category": CostTransaction.Category.PARTS,
            "amount": Decimal("300.00"),
            "occurred_at": timezone.now(),
            "cost_center": self.cost_center,
        }

        # Primeira chamada: cria
        tx1, created1 = CostTransaction.get_or_create_idempotent(key, defaults)
        self.assertTrue(created1)
        self.assertEqual(tx1.idempotency_key, key)
        self.assertEqual(tx1.amount, Decimal("300.00"))

        # Segunda chamada: retorna existente
        tx2, created2 = CostTransaction.get_or_create_idempotent(key, defaults)
        self.assertFalse(created2)
        self.assertEqual(tx1.id, tx2.id)

    def test_generate_idempotency_key(self):
        """Deve gerar chave de idempotência determinística."""
        wo_id = "abc123"

        key_labor = CostTransaction.generate_idempotency_key(wo_id, "labor")
        key_parts = CostTransaction.generate_idempotency_key(wo_id, "parts")
        key_third = CostTransaction.generate_idempotency_key(wo_id, "third_party")

        self.assertEqual(key_labor, "wo:abc123:labor")
        self.assertEqual(key_parts, "wo:abc123:parts")
        self.assertEqual(key_third, "wo:abc123:third_party")

        # Mesma entrada = mesma saída (determinístico)
        self.assertEqual(
            CostTransaction.generate_idempotency_key(wo_id, "labor"), key_labor
        )

    def test_lock_transaction(self):
        """Deve bloquear transação."""
        tx = CostTransaction.objects.create(
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("100.00"),
            occurred_at=timezone.now(),
            cost_center=self.cost_center,
        )

        self.assertFalse(tx.is_locked)

        tx.lock(self.test_user)
        tx.refresh_from_db()

        self.assertTrue(tx.is_locked)
        self.assertIsNotNone(tx.locked_at)

    def test_locked_transaction_cannot_change_protected_fields(self):
        """Transação bloqueada não deve permitir alteração de campos protegidos."""
        tx = CostTransaction.objects.create(
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("100.00"),
            occurred_at=timezone.now(),
            cost_center=self.cost_center,
            is_locked=True,
            locked_at=timezone.now(),
        )

        # Tentar alterar campo protegido
        tx.amount = Decimal("200.00")

        with self.assertRaises(ValidationError):
            tx.save()

    def test_transaction_types(self):
        """Deve suportar todos os tipos de transação."""
        types = [
            (CostTransaction.TransactionType.LABOR, "labor"),
            (CostTransaction.TransactionType.PARTS, "parts"),
            (CostTransaction.TransactionType.THIRD_PARTY, "third_party"),
            (CostTransaction.TransactionType.ENERGY, "energy"),
            (CostTransaction.TransactionType.ADJUSTMENT, "adjustment"),
            (CostTransaction.TransactionType.OTHER, "other"),
        ]

        for enum_val, str_val in types:
            tx = CostTransaction.objects.create(
                transaction_type=enum_val,
                category=CostTransaction.Category.OTHER,
                amount=Decimal("100.00"),
                occurred_at=timezone.now(),
                cost_center=self.cost_center,
            )
            self.assertEqual(tx.transaction_type, str_val)

    def test_transaction_categories(self):
        """Deve suportar todas as categorias."""
        categories = [
            CostTransaction.Category.PREVENTIVE,
            CostTransaction.Category.CORRECTIVE,
            CostTransaction.Category.PREDICTIVE,
            CostTransaction.Category.IMPROVEMENT,
            CostTransaction.Category.CONTRACTS,
            CostTransaction.Category.PARTS,
            CostTransaction.Category.ENERGY,
            CostTransaction.Category.OTHER,
        ]

        for category in categories:
            tx = CostTransaction.objects.create(
                transaction_type=CostTransaction.TransactionType.OTHER,
                category=category,
                amount=Decimal("100.00"),
                occurred_at=timezone.now(),
                cost_center=self.cost_center,
            )
            self.assertIsNotNone(tx.id)

    def test_meta_field(self):
        """Deve armazenar metadados como JSON."""
        tx = CostTransaction.objects.create(
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("500.00"),
            occurred_at=timezone.now(),
            cost_center=self.cost_center,
            meta={
                "hours_breakdown": [
                    {"role": "TECH-HVAC", "hours": 4, "rate": 85},
                    {"role": "TECH-ELEC", "hours": 2, "rate": 80},
                ],
                "work_order_code": "OS-001",
            },
        )
        tx.refresh_from_db()

        self.assertIn("hours_breakdown", tx.meta)
        self.assertEqual(len(tx.meta["hours_breakdown"]), 2)


class LedgerAdjustmentModelTests(TenantTestCase):
    """Testes para model LedgerAdjustment."""

    def setUp(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()

        LedgerAdjustment.objects.all().delete()
        CostTransaction.objects.all().delete()
        CostCenter.objects.all().delete()
        User.objects.filter(email="test_ledger@example.com").delete()

        self.cost_center = CostCenter.objects.create(code="CC-001", name="Test CC")
        self.test_user = User.objects.create_user(
            username="test_ledger_user",
            email="test_ledger@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )
        self.original_tx = CostTransaction.objects.create(
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("1000.00"),
            occurred_at=timezone.now(),
            cost_center=self.cost_center,
            is_locked=True,
            locked_at=timezone.now(),
        )

    def test_create_adjustment(self):
        """Deve criar ajuste de ledger."""
        # Criar transação de ajuste
        adjustment_tx = CostTransaction.objects.create(
            transaction_type=CostTransaction.TransactionType.ADJUSTMENT,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("-200.00"),  # Redução
            occurred_at=timezone.now(),
            cost_center=self.cost_center,
        )

        # Criar registro de ajuste
        adjustment = LedgerAdjustment.objects.create(
            original_transaction=self.original_tx,
            adjustment_transaction=adjustment_tx,
            adjustment_type=LedgerAdjustment.AdjustmentType.CORRECTION,
            reason="Correção de valor lançado incorretamente devido a erro de digitação.",
            original_amount=self.original_tx.amount,
            adjustment_amount=Decimal("-200.00"),
            created_by=self.test_user,
        )

        self.assertEqual(adjustment.adjustment_type, "correction")
        self.assertEqual(adjustment.original_amount, Decimal("1000.00"))
        self.assertEqual(adjustment.adjustment_amount, Decimal("-200.00"))
        self.assertTrue(adjustment.is_approved)

    def test_adjustment_requires_reason(self):
        """Ajuste deve ter motivo com pelo menos 10 caracteres."""
        adjustment_tx = CostTransaction.objects.create(
            transaction_type=CostTransaction.TransactionType.ADJUSTMENT,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("-100.00"),
            occurred_at=timezone.now(),
            cost_center=self.cost_center,
        )

        with self.assertRaises(ValidationError):
            LedgerAdjustment.objects.create(
                original_transaction=self.original_tx,
                adjustment_transaction=adjustment_tx,
                adjustment_type=LedgerAdjustment.AdjustmentType.CORRECTION,
                reason="Curto",  # Menos de 10 caracteres
                adjustment_amount=Decimal("-100.00"),
                created_by=self.test_user,
            )

    def test_adjustment_types(self):
        """Deve suportar todos os tipos de ajuste."""
        types = [
            LedgerAdjustment.AdjustmentType.CORRECTION,
            LedgerAdjustment.AdjustmentType.RECLASSIFICATION,
            LedgerAdjustment.AdjustmentType.REVERSAL,
            LedgerAdjustment.AdjustmentType.OTHER,
        ]

        for adj_type in types:
            adjustment_tx = CostTransaction.objects.create(
                transaction_type=CostTransaction.TransactionType.ADJUSTMENT,
                category=CostTransaction.Category.PREVENTIVE,
                amount=Decimal("-50.00"),
                occurred_at=timezone.now(),
                cost_center=self.cost_center,
            )

            adjustment = LedgerAdjustment.objects.create(
                original_transaction=self.original_tx,
                adjustment_transaction=adjustment_tx,
                adjustment_type=adj_type,
                reason="Motivo do ajuste com pelo menos 10 caracteres.",
                adjustment_amount=Decimal("-50.00"),
                created_by=self.test_user,
            )
            self.assertIsNotNone(adjustment.id)

    def test_adjustment_without_original(self):
        """Deve permitir ajuste avulso (sem transação original)."""
        adjustment_tx = CostTransaction.objects.create(
            transaction_type=CostTransaction.TransactionType.ADJUSTMENT,
            category=CostTransaction.Category.OTHER,
            amount=Decimal("500.00"),
            occurred_at=timezone.now(),
            cost_center=self.cost_center,
        )

        adjustment = LedgerAdjustment.objects.create(
            original_transaction=None,  # Sem original
            adjustment_transaction=adjustment_tx,
            adjustment_type=LedgerAdjustment.AdjustmentType.OTHER,
            reason="Ajuste avulso para correção de saldo inicial.",
            adjustment_amount=Decimal("500.00"),
            created_by=self.test_user,
        )

        self.assertIsNone(adjustment.original_transaction)
        self.assertIsNotNone(adjustment.adjustment_transaction)


class CostTransactionSerializerTests(TenantTestCase):
    """Testes para CostTransactionSerializer."""

    def setUp(self):
        # Limpar dados entre testes
        CostTransaction.objects.all().delete()
        CostCenter.objects.all().delete()
        self.cost_center = CostCenter.objects.create(code="CC-001", name="Test CC")

    def test_serialize_transaction(self):
        """Deve serializar transação de custo."""
        tx = CostTransaction.objects.create(
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("500.00"),
            occurred_at=timezone.now(),
            cost_center=self.cost_center,
            description="Test transaction",
        )

        serializer = CostTransactionSerializer(tx)
        data = serializer.data

        self.assertEqual(data["transaction_type"], "labor")
        self.assertEqual(data["transaction_type_display"], "Mão de Obra")
        self.assertEqual(data["category"], "preventive")
        self.assertEqual(data["category_display"], "Manutenção Preventiva")
        self.assertEqual(data["amount"], "500.00")
        self.assertEqual(data["cost_center_code"], "CC-001")
        self.assertTrue(data["is_editable"])

    def test_is_editable_false_when_locked(self):
        """is_editable deve ser False para transação bloqueada."""
        tx = CostTransaction.objects.create(
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("500.00"),
            occurred_at=timezone.now(),
            cost_center=self.cost_center,
            is_locked=True,
            locked_at=timezone.now(),
        )

        serializer = CostTransactionSerializer(tx)
        self.assertFalse(serializer.data["is_editable"])

    def test_create_serializer_validation(self):
        """Deve validar dados de criação."""
        data = {
            "transaction_type": "labor",
            "category": "preventive",
            "amount": "750.00",
            "occurred_at": timezone.now().isoformat(),
            "cost_center": str(self.cost_center.id),
        }

        serializer = CostTransactionCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_idempotency_key_validation(self):
        """Deve validar unicidade da idempotency_key."""
        # Criar transação existente
        CostTransaction.objects.create(
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("500.00"),
            occurred_at=timezone.now(),
            cost_center=self.cost_center,
            idempotency_key="existing-key",
        )

        # Tentar criar com mesma key
        data = {
            "transaction_type": "labor",
            "category": "preventive",
            "amount": "750.00",
            "occurred_at": timezone.now().isoformat(),
            "cost_center": str(self.cost_center.id),
            "idempotency_key": "existing-key",
        }

        serializer = CostTransactionCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("idempotency_key", serializer.errors)
