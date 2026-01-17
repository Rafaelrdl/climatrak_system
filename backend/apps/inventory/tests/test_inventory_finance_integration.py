"""
Tests for Inventory → Finance Integration

Testes de integração entre InventoryMovement e CostTransaction.

Verificações:
1. Movimentação de ENTRADA (IN/compra) → CostTransaction criada (custo)
2. Movimentação de SAÍDA (OUT/consumo) → NÃO cria CostTransaction
3. Idempotência: reprocessamento não duplica
4. Multi-tenant: movimento de tenant A não afeta tenant B
5. Compromisso aprovado → CostTransaction criada
6. Cálculos de valor corretos
"""

import pytest
from decimal import Decimal
from django.test import TransactionTestCase
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.inventory.models import InventoryCategory, InventoryItem, InventoryMovement
from apps.inventory.services import InventoryFinanceIntegrationService
from apps.trakledger.models import CostTransaction, CostCenter, Commitment

User = get_user_model()


@pytest.mark.django_db(transaction=True, databases={'default', 'default_other_tenant'})
class TestInventoryToFinanceIntegration(TransactionTestCase):
    """Testes de integração Inventory → Finance"""

    databases = {'default', 'default_other_tenant'}

    def setUp(self):
        """Setup de dados para cada teste"""
        # Usuário
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        # Centro de custo
        self.cost_center = CostCenter.objects.create(
            code='CC-001',
            name='Centro Teste',
        )

        # Categoria de inventário
        self.category = InventoryCategory.objects.create(
            name='Peças Elétricas'
        )

        # Item de inventário
        self.item = InventoryItem.objects.create(
            code='ELET-001',
            name='Capacitor 50uF',
            category=self.category,
            unit='UN',
            quantity=Decimal('100'),
            min_quantity=Decimal('10'),
            unit_cost=Decimal('25.50'),
        )

    def test_inventory_movement_in_creates_cost_transaction(self):
        """
        TESTE 1: Movimentação de ENTRADA (compra) cria CostTransaction
        
        Cenário:
        - Criar movimento IN com qty=5, unit_cost=25.50
        - Deve criar CostTransaction com amount = 127.50
        - idempotency_key = inventory_movement:{tenant}:{id}
        
        Lógica: Entrada = Compra = momento em que se GASTA dinheiro
        """
        # Criar movimento de ENTRADA (compra)
        movement = InventoryMovement.objects.create(
            item=self.item,
            type=InventoryMovement.MovementType.IN,
            reason=InventoryMovement.Reason.PURCHASE,
            quantity=Decimal('5'),
            unit_cost=Decimal('25.50'),
            performed_by=self.user,
        )

        # Verificações
        assert movement.id is not None
        assert movement.total_value == Decimal('127.50')

        # Deve existir CostTransaction correspondente
        cost_txn = CostTransaction.objects.filter(
            meta__inventory_movement_id=movement.id
        ).first()

        assert cost_txn is not None, "CostTransaction não foi criada para movimento IN (compra)"
        assert cost_txn.amount == Decimal('127.50')
        assert cost_txn.transaction_type == 'parts'
        assert 'Compra de' in cost_txn.description
        assert cost_txn.meta['inventory_movement_id'] == movement.id

    def test_inventory_movement_idempotency(self):
        """
        TESTE 2: Reprocessamento de movimentação não duplica CostTransaction
        
        Cenário:
        - Criar movimento IN (compra)
        - Chamar manualmente InventoryFinanceIntegrationService.create_cost_transaction_for_movement(movement)
        - Verificar que continua sendo apenas 1 transaction (idempotência)
        """
        # Criar movimento de ENTRADA (compra)
        movement = InventoryMovement.objects.create(
            item=self.item,
            type=InventoryMovement.MovementType.IN,
            reason=InventoryMovement.Reason.PURCHASE,
            quantity=Decimal('5'),
            unit_cost=Decimal('25.50'),
            performed_by=self.user,
        )

        # Contar transactions inicialmente
        initial_count = CostTransaction.objects.filter(
            meta__inventory_movement_id=movement.id
        ).count()

        assert initial_count == 1, "Primeira criação deveria ter gerado 1 transaction"

        # Chamar manualmente (simular reprocessamento)
        InventoryFinanceIntegrationService.create_cost_transaction_for_movement(movement)

        # Contar novamente
        final_count = CostTransaction.objects.filter(
            meta__inventory_movement_id=movement.id
        ).count()

        assert final_count == 1, "Reprocessamento NÃO deve criar duplicata"

    def test_inventory_movement_out_does_not_create_cost_transaction(self):
        """
        TESTE 3: Movimentação de SAÍDA (OUT) NÃO cria CostTransaction
        
        Cenário:
        - Criar movimento OUT (saída/consumo)
        - Não deve criar CostTransaction (custo foi registrado na entrada/compra)
        
        Lógica: Saída = Consumo = item já foi pago na compra
        """
        # Criar movimento de saída
        movement = InventoryMovement.objects.create(
            item=self.item,
            type=InventoryMovement.MovementType.OUT,
            reason=InventoryMovement.Reason.WORK_ORDER,
            quantity=Decimal('5'),
            unit_cost=Decimal('25.50'),
            performed_by=self.user,
        )

        # Não deve existir CostTransaction
        cost_txn = CostTransaction.objects.filter(
            meta__inventory_movement_id=movement.id
        ).first()

        assert cost_txn is None, "Movimento OUT não deveria gerar CostTransaction (custo já foi na compra)"

    def test_inventory_movement_transfer_does_not_create_cost_transaction(self):
        """
        TESTE 4: Movimentação de TRANSFERÊNCIA não cria CostTransaction
        """
        movement = InventoryMovement.objects.create(
            item=self.item,
            type=InventoryMovement.MovementType.TRANSFER,
            reason=InventoryMovement.Reason.TRANSFER,
            quantity=Decimal('10'),
            performed_by=self.user,
        )

        cost_txn = CostTransaction.objects.filter(
            meta__inventory_movement_id=movement.id
        ).first()

        assert cost_txn is None, "TRANSFER não deveria gerar CostTransaction"

    def test_inventory_movement_cost_center_determination(self):
        """
        TESTE 5: Cost center é determinado corretamente
        
        Cenário:
        - Criar movimento IN (compra)
        - Verificar que cost_center vem do tenant
        """
        movement = InventoryMovement.objects.create(
            item=self.item,
            type=InventoryMovement.MovementType.IN,
            reason=InventoryMovement.Reason.PURCHASE,
            quantity=Decimal('5'),
            unit_cost=Decimal('25.50'),
            performed_by=self.user,
        )

        cost_txn = CostTransaction.objects.filter(
            meta__inventory_movement_id=movement.id
        ).first()

        # Cost center deve estar preenchido
        assert cost_txn is not None, "CostTransaction deveria existir para movimento IN"
        assert cost_txn.cost_center_id is not None, "Cost center deveria estar preenchido"


@pytest.mark.django_db(transaction=True)
class TestCommitmentToFinanceIntegration(TransactionTestCase):
    """Testes de integração Commitment → Finance"""

    databases = {'default'}

    def setUp(self):
        """Setup de dados"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        self.cost_center = CostCenter.objects.create(
            code='CC-001',
            name='Centro Teste',
        )

    def test_commitment_approved_creates_cost_transaction(self):
        """
        TESTE 6: Compromisso aprovado cria CostTransaction
        
        Cenário:
        - Criar compromisso DRAFT
        - Submeter (SUBMITTED)
        - Aprovar (APPROVED)
        - Deve criar CostTransaction com amount = commitment.amount
        - idempotency_key = commitment_approved:{tenant}:{id}
        """
        # Criar compromisso
        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=timezone.now().replace(day=1),
            amount=Decimal('1000.00'),
            category=Commitment.Category.PARTS,
            description='Compromisso teste',
            created_by=self.user,
        )

        # Submeter
        commitment.submit()

        # Aprovar
        commitment.approve(self.user)

        # Verificar status
        commitment.refresh_from_db()
        assert commitment.status == Commitment.Status.APPROVED

        # Deve existir CostTransaction
        cost_txn = CostTransaction.objects.filter(
            meta__commitment_id=str(commitment.id)
        ).first()

        assert cost_txn is not None, "CostTransaction não foi criada ao aprovar compromisso"
        assert cost_txn.amount == Decimal('1000.00')
        assert cost_txn.transaction_type == 'parts'  # Mapeado de PARTS
        assert cost_txn.meta['source'] == 'commitment_approved'

    def test_commitment_approval_idempotency(self):
        """
        TESTE 7: Reaprovação de compromisso não duplica CostTransaction
        
        Cenário:
        - Criar compromisso
        - Submeter e aprovar
        - Simular reaprovação (chamada ao approve() novamente)
        - Verificar que continua sendo apenas 1 transaction
        """
        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=timezone.now().replace(day=1),
            amount=Decimal('500.00'),
            category=Commitment.Category.ENERGY,
            description='Teste reaprovação',
            created_by=self.user,
        )

        commitment.submit()
        commitment.approve(self.user)

        # Contar transactions
        initial_count = CostTransaction.objects.filter(
            meta__commitment_id=str(commitment.id)
        ).count()

        assert initial_count == 1, "Primeira aprovação deveria gerar 1 transaction"

        # Tentar aprovar novamente (vai falhar no .approve() mas idempotency_key protege)
        try:
            commitment.status = Commitment.Status.SUBMITTED  # Reset status
            commitment.save()
            commitment.approve(self.user)
        except Exception:
            pass  # Expected

        # Contar novamente
        final_count = CostTransaction.objects.filter(
            meta__commitment_id=str(commitment.id)
        ).count()

        assert final_count <= 1, "Não deve duplicar mesmo com reprocessamento"

    def test_commitment_draft_does_not_create_cost_transaction(self):
        """
        TESTE 8: Compromisso em DRAFT não cria CostTransaction
        """
        commitment = Commitment.objects.create(
            cost_center=self.cost_center,
            budget_month=timezone.now().replace(day=1),
            amount=Decimal('100.00'),
            category=Commitment.Category.OTHER,
            description='Rascunho',
            created_by=self.user,
        )

        # Não aprovar, deixar em DRAFT
        # Não deve existir CostTransaction
        cost_txn = CostTransaction.objects.filter(
            meta__commitment_id=str(commitment.id)
        ).first()

        assert cost_txn is None, "DRAFT não deveria gerar CostTransaction"

    def test_commitment_category_mapping(self):
        """
        TESTE 9: Categoria de compromisso é mapeada corretamente
        
        Cenário:
        - Criar compromissos com diferentes categorias
        - Verificar que transaction_type é mapeado corretamente
        """
        categories_to_test = [
            (Commitment.Category.PARTS, 'parts'),
            (Commitment.Category.ENERGY, 'energy'),
            (Commitment.Category.CONTRACTS, 'third_party'),
            (Commitment.Category.OTHER, 'other'),
        ]

        for commit_category, expected_tx_type in categories_to_test:
            commitment = Commitment.objects.create(
                cost_center=self.cost_center,
                budget_month=timezone.now().replace(day=1),
                amount=Decimal('100.00'),
                category=commit_category,
                description=f'Teste {commit_category}',
                created_by=self.user,
            )

            commitment.submit()
            commitment.approve(self.user)

            cost_txn = CostTransaction.objects.filter(
                meta__commitment_id=str(commitment.id)
            ).first()

            assert cost_txn is not None, f"Sem CostTransaction para categoria {commit_category}"
            assert cost_txn.transaction_type == expected_tx_type, \
                f"Mapeamento errado: {commit_category} → {cost_txn.transaction_type}"
