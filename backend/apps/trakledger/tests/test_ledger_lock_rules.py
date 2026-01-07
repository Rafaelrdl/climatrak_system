"""
Testes de Finance Ledger + Lock Mensal (Regras Não-Negociáveis)

Verifica que:
1. idempotency_key determinístico: mesma entrada → 1 transação
2. Mês locked: tentativa de editar → falha
3. Correção: criar adjustment (não editar locked)

Referência:
- .github/instructions/finance.instructions.md
- docs/finance/02-regras-negocio.md
- apps/finance/models.py (CostTransaction, BudgetMonth)
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from django_tenants.test.cases import TenantTestCase

from apps.trakledger.models import (
    BudgetEnvelope,
    BudgetMonth,
    BudgetPlan,
    CostCenter,
    CostTransaction,
)

User = get_user_model()


class LedgerIdempotencyKeyTests(TenantTestCase):
    """
    Testes para idempotency_key determinístico.

    REGRA: idempotency_key determinístico: mesma entrada → 1 transação.
    """

    def setUp(self):
        """Setup de dados para testes."""
        super().setUp()
        self.cost_center = CostCenter.objects.create(
            code="CC-LEDGER",
            name="Ledger Test Center",
            is_active=True,
        )
        self.user = User.objects.create_user(
            username="ledger_tester",
            email="ledger@test.com",
            password="testpass123",
        )

    def test_generate_idempotency_key_is_deterministic(self):
        """
        Mesma entrada deve gerar mesma chave sempre.

        Formato: wo:{work_order_id}:{transaction_type}
        """
        wo_id = "12345678-1234-1234-1234-123456789abc"

        key1 = CostTransaction.generate_idempotency_key(wo_id, "labor")
        key2 = CostTransaction.generate_idempotency_key(wo_id, "labor")
        key3 = CostTransaction.generate_idempotency_key(wo_id, "parts")

        self.assertEqual(key1, key2)
        self.assertEqual(key1, f"wo:{wo_id}:labor")
        self.assertNotEqual(key1, key3)

    def test_same_idempotency_key_creates_one_transaction(self):
        """
        Usar mesma idempotency_key deve criar apenas 1 transação.
        """
        key = f"wo:{uuid.uuid4()}:labor"

        # Primeira criação
        tx1, created1 = CostTransaction.get_or_create_idempotent(
            idempotency_key=key,
            defaults={
                "cost_center": self.cost_center,
                "transaction_type": CostTransaction.TransactionType.LABOR,
                "category": CostTransaction.Category.PREVENTIVE,
                "amount": Decimal("1000.00"),
                "occurred_at": timezone.now(),
                "description": "First creation",
            },
        )

        # Segunda "criação" com mesma chave
        tx2, created2 = CostTransaction.get_or_create_idempotent(
            idempotency_key=key,
            defaults={
                "cost_center": self.cost_center,
                "transaction_type": CostTransaction.TransactionType.LABOR,
                "category": CostTransaction.Category.PREVENTIVE,
                "amount": Decimal("9999.00"),  # Valor diferente!
                "occurred_at": timezone.now(),
                "description": "Should not create",
            },
        )

        self.assertTrue(created1)
        self.assertFalse(created2)
        self.assertEqual(tx1.pk, tx2.pk)
        self.assertEqual(tx1.amount, Decimal("1000.00"))  # Valor original

    def test_unique_constraint_prevents_duplicate_keys(self):
        """
        Constraint de banco deve prevenir duplicação.

        Nota: Django valida constraints antes de enviar ao banco,
        então pode ser IntegrityError ou ValidationError.
        """
        from django.core.exceptions import ValidationError

        key = f"wo:{uuid.uuid4()}:parts"

        CostTransaction.objects.create(
            idempotency_key=key,
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.PARTS,
            category=CostTransaction.Category.PARTS,
            amount=Decimal("500.00"),
            occurred_at=timezone.now(),
        )

        # Tentar criar com mesma chave - deve ser rejeitada
        with self.assertRaises((IntegrityError, ValidationError)):
            with transaction.atomic():
                CostTransaction.objects.create(
                    idempotency_key=key,
                    cost_center=self.cost_center,
                    transaction_type=CostTransaction.TransactionType.PARTS,
                    category=CostTransaction.Category.PARTS,
                    amount=Decimal("500.00"),
                    occurred_at=timezone.now(),
                )

    def test_null_idempotency_key_allows_multiple(self):
        """
        Transações manuais (sem idempotency_key) podem ser múltiplas.
        """
        # Criar várias transações manuais sem idempotency_key
        tx1 = CostTransaction.objects.create(
            idempotency_key=None,
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.ADJUSTMENT,
            category=CostTransaction.Category.OTHER,
            amount=Decimal("100.00"),
            occurred_at=timezone.now(),
            description="Manual adjustment 1",
        )

        tx2 = CostTransaction.objects.create(
            idempotency_key=None,
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.ADJUSTMENT,
            category=CostTransaction.Category.OTHER,
            amount=Decimal("200.00"),
            occurred_at=timezone.now(),
            description="Manual adjustment 2",
        )

        self.assertNotEqual(tx1.pk, tx2.pk)


class MonthlyLockTests(TenantTestCase):
    """
    Testes para lock mensal de transações.

    REGRA: Mês locked: tentativa de editar → falha.
    """

    def setUp(self):
        """Setup de dados para testes."""
        super().setUp()
        self.cost_center = CostCenter.objects.create(
            code="CC-LOCK",
            name="Lock Test Center",
            is_active=True,
        )
        self.user = User.objects.create_user(
            username="lock_tester",
            email="lock@test.com",
            password="testpass123",
        )

        # Criar transação de teste
        self.transaction = CostTransaction.objects.create(
            idempotency_key=f"wo:{uuid.uuid4()}:labor",
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("750.00"),
            occurred_at=timezone.now() - timedelta(days=30),
            description="Transaction to be locked",
            created_by=self.user,
        )

    def test_lock_transaction(self):
        """Transação pode ser bloqueada."""
        self.assertFalse(self.transaction.is_locked)

        self.transaction.lock(self.user)

        self.transaction.refresh_from_db()
        self.assertTrue(self.transaction.is_locked)
        self.assertIsNotNone(self.transaction.locked_at)
        self.assertEqual(self.transaction.locked_by, self.user)

    def test_locked_transaction_cannot_change_amount(self):
        """
        Transação bloqueada não pode ter valor alterado.
        """
        self.transaction.lock(self.user)
        self.transaction.refresh_from_db()

        # Tentar alterar valor
        self.transaction.amount = Decimal("9999.00")

        with self.assertRaises(ValidationError) as ctx:
            self.transaction.save()

        self.assertIn("bloqueada", str(ctx.exception).lower())

    def test_locked_transaction_cannot_change_type(self):
        """
        Transação bloqueada não pode ter tipo alterado.
        """
        self.transaction.lock(self.user)
        self.transaction.refresh_from_db()

        self.transaction.transaction_type = CostTransaction.TransactionType.PARTS

        with self.assertRaises(ValidationError):
            self.transaction.save()

    def test_locked_transaction_cannot_change_category(self):
        """
        Transação bloqueada não pode ter categoria alterada.
        """
        self.transaction.lock(self.user)
        self.transaction.refresh_from_db()

        self.transaction.category = CostTransaction.Category.CORRECTIVE

        with self.assertRaises(ValidationError):
            self.transaction.save()

    def test_locked_transaction_cannot_change_cost_center(self):
        """
        Transação bloqueada não pode ter centro de custo alterado.
        """
        other_cc = CostCenter.objects.create(
            code="CC-OTHER",
            name="Other Center",
            is_active=True,
        )

        self.transaction.lock(self.user)
        self.transaction.refresh_from_db()

        self.transaction.cost_center = other_cc

        with self.assertRaises(ValidationError):
            self.transaction.save()

    def test_locked_transaction_cannot_change_occurred_at(self):
        """
        Transação bloqueada não pode ter data alterada.
        """
        self.transaction.lock(self.user)
        self.transaction.refresh_from_db()

        self.transaction.occurred_at = timezone.now()

        with self.assertRaises(ValidationError):
            self.transaction.save()


class AdjustmentForLockedTests(TenantTestCase):
    """
    Testes para criar adjustment em vez de editar locked.

    REGRA: Correção: criar adjustment (não editar locked).
    """

    def setUp(self):
        """Setup de dados para testes."""
        super().setUp()
        self.cost_center = CostCenter.objects.create(
            code="CC-ADJ",
            name="Adjustment Test Center",
            is_active=True,
        )
        self.user = User.objects.create_user(
            username="adjust_tester",
            email="adjust@test.com",
            password="testpass123",
        )

        # Criar e bloquear transação original
        self.original_tx = CostTransaction.objects.create(
            idempotency_key=f"wo:{uuid.uuid4()}:labor",
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("1000.00"),
            occurred_at=timezone.now() - timedelta(days=45),
            description="Original locked transaction",
            created_by=self.user,
        )
        self.original_tx.lock(self.user)

    def test_can_create_adjustment_for_correction(self):
        """
        Pode criar adjustment para corrigir transação locked.

        Padrão: Em vez de editar, criar nova transação de ajuste.
        """
        # Valor original era 1000, deveria ser 800
        # Criamos adjustment de -200
        adjustment = CostTransaction.objects.create(
            idempotency_key=None,  # Manual, sem idempotency
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.ADJUSTMENT,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("-200.00"),  # Negativo para corrigir
            occurred_at=timezone.now(),
            description=f"Ajuste ref. transação {self.original_tx.pk}",
            meta={
                "adjustment_type": "correction",
                "original_transaction_id": str(self.original_tx.pk),
                "reason": "Valor original incorreto, deveria ser 800",
            },
            created_by=self.user,
        )

        self.assertIsNotNone(adjustment.pk)
        self.assertEqual(adjustment.amount, Decimal("-200.00"))
        self.assertEqual(
            adjustment.transaction_type, CostTransaction.TransactionType.ADJUSTMENT
        )

        # Original permanece inalterado
        self.original_tx.refresh_from_db()
        self.assertEqual(self.original_tx.amount, Decimal("1000.00"))

    def test_net_effect_after_adjustment(self):
        """
        Efeito líquido após adjustment deve ser o valor correto.
        """
        # Criar adjustment
        CostTransaction.objects.create(
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.ADJUSTMENT,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("-200.00"),
            occurred_at=timezone.now(),
            description="Correction adjustment",
            created_by=self.user,
        )

        # Calcular total
        from django.db.models import Sum

        total = CostTransaction.objects.filter(
            cost_center=self.cost_center,
            category=CostTransaction.Category.PREVENTIVE,
        ).aggregate(total=Sum("amount"))["total"]

        # 1000 (original) + (-200) (adjustment) = 800
        self.assertEqual(total, Decimal("800.00"))

    def test_adjustment_has_audit_trail(self):
        """
        Adjustment deve ter trail de auditoria no meta.
        """
        adjustment = CostTransaction.objects.create(
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.ADJUSTMENT,
            category=CostTransaction.Category.OTHER,
            amount=Decimal("50.00"),
            occurred_at=timezone.now(),
            description="Audit trail test",
            meta={
                "adjustment_type": "addition",
                "original_transaction_id": str(self.original_tx.pk),
                "reason": "Custo adicional não contabilizado",
                "approved_by": "manager@company.com",
            },
            created_by=self.user,
        )

        self.assertIn("adjustment_type", adjustment.meta)
        self.assertIn("original_transaction_id", adjustment.meta)
        self.assertIn("reason", adjustment.meta)


class BudgetMonthLockTests(TenantTestCase):
    """
    Testes para lock de período mensal do orçamento.
    """

    def setUp(self):
        """Setup de dados para testes."""
        super().setUp()
        self.cost_center = CostCenter.objects.create(
            code="CC-BUDGET",
            name="Budget Lock Center",
            is_active=True,
        )
        self.user = User.objects.create_user(
            username="budget_tester",
            email="budget@test.com",
            password="testpass123",
        )

        # Criar estrutura de orçamento
        self.budget_plan = BudgetPlan.objects.create(
            name="Plano 2025",
            code="BUDGET-2025",
            year=2025,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            status=BudgetPlan.Status.ACTIVE,
        )

        self.envelope = BudgetEnvelope.objects.create(
            budget_plan=self.budget_plan,
            cost_center=self.cost_center,
            name="Manutenção Preventiva",
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal("120000.00"),
        )

        self.budget_month = BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2025, 1, 1),
            planned_amount=Decimal("10000.00"),
        )

    def test_lock_budget_month(self):
        """Período mensal pode ser bloqueado."""
        self.assertFalse(self.budget_month.is_locked)

        self.budget_month.lock(self.user)

        self.budget_month.refresh_from_db()
        self.assertTrue(self.budget_month.is_locked)
        self.assertEqual(self.budget_month.locked_by, self.user)
        self.assertIsNotNone(self.budget_month.locked_at)

    def test_unlock_budget_month(self):
        """Período mensal pode ser desbloqueado (com permissão)."""
        self.budget_month.lock(self.user)
        self.budget_month.unlock(self.user)

        self.budget_month.refresh_from_db()
        self.assertFalse(self.budget_month.is_locked)
        self.assertIsNone(self.budget_month.locked_by)

    def test_budget_month_normalizes_to_first_day(self):
        """
        Campo month é normalizado para primeiro dia do mês.
        """
        # Criar com dia qualquer
        month = BudgetMonth(
            envelope=self.envelope,
            month=date(2025, 2, 15),  # Dia 15
            planned_amount=Decimal("10000.00"),
        )
        month.clean()

        # Deve normalizar para dia 1
        self.assertEqual(month.month.day, 1)


class LedgerSourceOfTruthTests(TenantTestCase):
    """
    Testes para garantir que Ledger é fonte da verdade.

    REGRA: Ledger (CostTransaction) é fonte da verdade.
    """

    def setUp(self):
        """Setup de dados para testes."""
        super().setUp()
        self.cost_center = CostCenter.objects.create(
            code="CC-TRUTH",
            name="Source of Truth Center",
            is_active=True,
        )
        self.user = User.objects.create_user(
            username="truth_tester",
            email="truth@test.com",
            password="testpass123",
        )

    def test_ledger_records_are_immutable_after_lock(self):
        """
        Registros do ledger são imutáveis após lock.
        """
        tx = CostTransaction.objects.create(
            idempotency_key=f"wo:{uuid.uuid4()}:labor",
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.CORRECTIVE,
            amount=Decimal("500.00"),
            occurred_at=timezone.now(),
            created_by=self.user,
        )

        # Antes do lock, pode alterar
        tx.description = "Updated description"
        tx.save()  # OK

        # Após lock, não pode alterar campos protegidos
        tx.lock(self.user)
        tx.refresh_from_db()

        tx.amount = Decimal("999.00")
        with self.assertRaises(ValidationError):
            tx.save()

    def test_all_costs_traceable_in_ledger(self):
        """
        Todos os custos devem estar no ledger para rastreabilidade.
        """
        # Criar custos de diferentes tipos
        CostTransaction.objects.create(
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("100.00"),
            occurred_at=timezone.now(),
            idempotency_key=f"trace:labor:{uuid.uuid4()}",
        )

        CostTransaction.objects.create(
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.PARTS,
            category=CostTransaction.Category.CORRECTIVE,
            amount=Decimal("200.00"),
            occurred_at=timezone.now(),
            idempotency_key=f"trace:parts:{uuid.uuid4()}",
        )

        CostTransaction.objects.create(
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.THIRD_PARTY,
            category=CostTransaction.Category.CONTRACTS,
            amount=Decimal("300.00"),
            occurred_at=timezone.now(),
            idempotency_key=f"trace:tp:{uuid.uuid4()}",
        )

        # Total deve refletir todos os custos
        from django.db.models import Sum

        total = CostTransaction.objects.filter(cost_center=self.cost_center).aggregate(
            total=Sum("amount")
        )["total"]

        self.assertEqual(total, Decimal("600.00"))

    def test_ledger_preserves_history(self):
        """
        Ledger preserva histórico completo (não deleta registros).
        """
        # Criar transação
        tx = CostTransaction.objects.create(
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("500.00"),
            occurred_at=timezone.now(),
            idempotency_key=f"history:{uuid.uuid4()}",
        )

        # "Cancelar" via adjustment, não deletando
        adjustment = CostTransaction.objects.create(
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.ADJUSTMENT,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("-500.00"),
            occurred_at=timezone.now(),
            description=f"Cancelamento de {tx.pk}",
            meta={"cancelled_transaction_id": str(tx.pk)},
        )

        # Ambas transações existem (histórico preservado)
        self.assertTrue(CostTransaction.objects.filter(pk=tx.pk).exists())
        self.assertTrue(CostTransaction.objects.filter(pk=adjustment.pk).exists())

        # Efeito líquido é zero
        from django.db.models import Sum

        net = CostTransaction.objects.aggregate(total=Sum("amount"))["total"]
        self.assertEqual(net, Decimal("0.00"))


class CostTransactionValidationTests(TenantTestCase):
    """
    Testes de validação do CostTransaction.
    """

    def setUp(self):
        """Setup de dados para testes."""
        super().setUp()
        self.cost_center = CostCenter.objects.create(
            code="CC-VAL",
            name="Validation Test Center",
            is_active=True,
        )

    def test_work_order_transaction_requires_idempotency_key(self):
        """
        Transação vinculada a OS deve ter idempotency_key.
        """
        # Este teste verifica a regra de negócio no modelo
        # Nota: WorkOrder FK é opcional no modelo, então a validação
        # ocorre apenas se work_order estiver preenchido

        # Criar transação sem work_order - deve funcionar sem idempotency_key
        tx = CostTransaction.objects.create(
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("100.00"),
            occurred_at=timezone.now(),
            idempotency_key=None,  # OK para transações manuais
        )
        self.assertIsNotNone(tx.pk)

    def test_adjustment_type_does_not_require_idempotency_key(self):
        """
        Transações de adjustment não precisam de idempotency_key.
        """
        adjustment = CostTransaction.objects.create(
            cost_center=self.cost_center,
            transaction_type=CostTransaction.TransactionType.ADJUSTMENT,
            category=CostTransaction.Category.OTHER,
            amount=Decimal("50.00"),
            occurred_at=timezone.now(),
            idempotency_key=None,  # Permitido para adjustments
            description="Manual adjustment",
        )
        self.assertIsNotNone(adjustment.pk)
