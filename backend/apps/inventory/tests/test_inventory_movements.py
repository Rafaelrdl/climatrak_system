"""
Testes para o módulo de Inventory

Cobertura:
- Criação de item com movimentação inicial
- Idempotência do backfill
- Consistência entre Análise e Histórico

NOTE: Inventory is a TENANT_APP, so all tests must use TenantTestCase
to ensure tables are created in the test tenant schema.
"""

from decimal import Decimal
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase

from apps.inventory.models import InventoryCategory, InventoryItem, InventoryMovement
from apps.inventory.services import InventoryItemService


User = get_user_model()


class InventoryItemCreationTests(TenantTestCase):
    """Testes para criação de item com movimentação inicial."""
    
    def setUp(self):
        """Setup para cada teste."""
        self.category = InventoryCategory.objects.create(
            name="Peças Elétricas",
            code="ELET",
            is_active=True,
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

    def test_create_item_with_initial_quantity_creates_movement(self):
        """
        Criar item com quantidade inicial > 0 deve gerar movimentação de ENTRADA.
        """
        item, movement = InventoryItemService.create_item_with_initial_stock(
            code="TEST-001",
            name="Item de Teste",
            unit=InventoryItem.Unit.UNIT,
            quantity=Decimal("50"),
            unit_cost=Decimal("10.00"),
            category=self.category,
            performed_by=self.user,
        )

        self.assertIsNotNone(item)
        self.assertEqual(item.code, "TEST-001")
        self.assertEqual(item.quantity, Decimal("50"))

        # Deve ter criado movimentação
        self.assertIsNotNone(movement)
        self.assertEqual(movement.type, InventoryMovement.MovementType.IN)
        self.assertEqual(movement.quantity, Decimal("50"))
        self.assertEqual(movement.quantity_before, Decimal("0"))
        self.assertEqual(movement.quantity_after, Decimal("50"))
        self.assertEqual(movement.performed_by, self.user)
        self.assertIn("INITIAL_BALANCE", movement.reference)

    def test_create_item_with_zero_quantity_no_movement(self):
        """
        Criar item com quantidade = 0 NÃO deve gerar movimentação.
        """
        item, movement = InventoryItemService.create_item_with_initial_stock(
            code="TEST-002",
            name="Item Sem Estoque",
            unit=InventoryItem.Unit.UNIT,
            quantity=Decimal("0"),
            category=self.category,
            performed_by=self.user,
        )

        self.assertIsNotNone(item)
        self.assertEqual(item.quantity, Decimal("0"))
        self.assertIsNone(movement)

        # Verificar que não existe movimentação no banco
        movements = InventoryMovement.objects.filter(item=item)
        self.assertEqual(movements.count(), 0)

    def test_item_movements_relationship(self):
        """
        Movimentação criada deve estar linkada ao item corretamente.
        """
        item, movement = InventoryItemService.create_item_with_initial_stock(
            code="TEST-003",
            name="Item Relacionamento",
            unit=InventoryItem.Unit.UNIT,
            quantity=Decimal("25"),
            category=self.category,
            performed_by=self.user,
        )

        # Acessar via relacionamento
        item_movements = item.movements.all()
        self.assertEqual(item_movements.count(), 1)
        self.assertEqual(item_movements.first().id, movement.id)


class BackfillIdempotencyTests(TenantTestCase):
    """Testes para idempotência do backfill."""
    
    def setUp(self):
        """Setup para cada teste."""
        self.category = InventoryCategory.objects.create(
            name="Peças Mecânicas",
            code="MEC",
            is_active=True,
        )
        self.user = User.objects.create_user(
            username="backfilluser",
            email="backfill@example.com",
            password="testpass123",
            first_name="Backfill",
            last_name="User",
        )

    def test_backfill_creates_movement_for_legacy_item(self):
        """
        Backfill deve criar movimentação para item legado sem histórico.
        """
        # Criar item "legado" diretamente (sem usar o service)
        item = InventoryItem.objects.create(
            code="LEGACY-001",
            name="Item Legado",
            unit=InventoryItem.Unit.UNIT,
            quantity=Decimal("100"),
            unit_cost=Decimal("5.00"),
            category=self.category,
        )

        # Verificar que não tem movimentação
        self.assertEqual(item.movements.count(), 0)

        # Executar backfill
        movement = InventoryItemService.backfill_initial_movement(item, performed_by=self.user)

        self.assertIsNotNone(movement)
        self.assertEqual(movement.type, InventoryMovement.MovementType.IN)
        self.assertEqual(movement.quantity, Decimal("100"))
        self.assertIn("INITIAL_BALANCE", movement.reference)

    def test_backfill_is_idempotent(self):
        """
        Executar backfill múltiplas vezes NÃO deve duplicar movimentação.
        """
        # Criar item legado
        item = InventoryItem.objects.create(
            code="LEGACY-002",
            name="Item Idempotência",
            unit=InventoryItem.Unit.UNIT,
            quantity=Decimal("50"),
            category=self.category,
        )

        # Primeiro backfill
        movement1 = InventoryItemService.backfill_initial_movement(item, performed_by=self.user)
        self.assertIsNotNone(movement1)

        # Segundo backfill - deve retornar None (já existe)
        movement2 = InventoryItemService.backfill_initial_movement(item, performed_by=self.user)
        self.assertIsNone(movement2)

        # Verificar que só existe uma movimentação
        self.assertEqual(item.movements.count(), 1)

    def test_backfill_skips_item_with_existing_movements(self):
        """
        Backfill não deve criar movimentação inicial se item já tem histórico.
        """
        # Criar item via service (já terá movimentação)
        item, _ = InventoryItemService.create_item_with_initial_stock(
            code="NORMAL-001",
            name="Item Normal",
            unit=InventoryItem.Unit.UNIT,
            quantity=Decimal("30"),
            category=self.category,
            performed_by=self.user,
        )

        # Tentar backfill
        movement = InventoryItemService.backfill_initial_movement(item, performed_by=self.user)
        
        # Deve retornar None pois já existe movimentação
        self.assertIsNone(movement)
        
        # Continua com apenas 1 movimentação
        self.assertEqual(item.movements.count(), 1)

    def test_backfill_skips_zero_quantity_item(self):
        """
        Backfill não deve criar movimentação para item com quantidade = 0.
        """
        item = InventoryItem.objects.create(
            code="ZERO-001",
            name="Item Zerado",
            unit=InventoryItem.Unit.UNIT,
            quantity=Decimal("0"),
            category=self.category,
        )

        movement = InventoryItemService.backfill_initial_movement(item)
        self.assertIsNone(movement)
        self.assertEqual(item.movements.count(), 0)


class AnalysisHistoryConsistencyTests(TenantTestCase):
    """Testes para consistência entre Análise e Histórico."""
    
    def setUp(self):
        """Setup para cada teste."""
        self.category = InventoryCategory.objects.create(
            name="Consumíveis",
            code="CONS",
            is_active=True,
        )
        self.user = User.objects.create_user(
            username="consistencyuser",
            email="consistency@example.com",
            password="testpass123",
            first_name="Consistency",
            last_name="User",
        )

    def test_consumption_appears_in_both_analysis_and_history(self):
        """
        Consumo (saída) deve aparecer tanto na Análise quanto no Histórico.
        """
        # Criar item com estoque
        item, _ = InventoryItemService.create_item_with_initial_stock(
            code="CONS-001",
            name="Item para Consumo",
            unit=InventoryItem.Unit.UNIT,
            quantity=Decimal("100"),
            category=self.category,
            performed_by=self.user,
        )

        # Criar movimentação de saída (consumo)
        out_movement = InventoryMovement.objects.create(
            item=item,
            type=InventoryMovement.MovementType.OUT,
            reason=InventoryMovement.Reason.WORK_ORDER,
            quantity=Decimal("10"),
            unit_cost=item.unit_cost,
            performed_by=self.user,
        )

        # Verificar que movimentação existe no histórico
        movements = InventoryMovement.objects.filter(
            type=InventoryMovement.MovementType.OUT,
            created_at__gte=timezone.now() - timedelta(days=90),
        )
        self.assertIn(out_movement, movements)

        # Simular query da análise (consumption_by_category)
        from django.db.models import Sum
        consumption = InventoryMovement.objects.filter(
            type=InventoryMovement.MovementType.OUT,
            created_at__gte=timezone.now() - timedelta(days=90),
        ).values("item__category__name").annotate(
            total=Sum("quantity")
        )

        consumption_list = list(consumption)
        self.assertTrue(len(consumption_list) > 0)
        self.assertEqual(consumption_list[0]["total"], Decimal("10"))

    def test_same_period_filter_returns_consistent_results(self):
        """
        Mesmo período de filtro deve retornar resultados consistentes.
        """
        # Criar item e movimento dentro do período
        item, initial_movement = InventoryItemService.create_item_with_initial_stock(
            code="PERIOD-001",
            name="Item Período",
            unit=InventoryItem.Unit.UNIT,
            quantity=Decimal("50"),
            category=self.category,
            performed_by=self.user,
        )

        # Saída
        InventoryMovement.objects.create(
            item=item,
            type=InventoryMovement.MovementType.OUT,
            reason=InventoryMovement.Reason.WORK_ORDER,
            quantity=Decimal("5"),
            performed_by=self.user,
        )

        # Filtrar últimos 90 dias (como Análise e Histórico agora usam)
        period_start = timezone.now() - timedelta(days=90)
        
        # Movimentações no período
        movements_in_period = InventoryMovement.objects.filter(
            created_at__gte=period_start,
        )

        # Saídas no período (para análise)
        exits_in_period = InventoryMovement.objects.filter(
            type=InventoryMovement.MovementType.OUT,
            created_at__gte=period_start,
        )

        # Deve ter movimentações
        self.assertGreaterEqual(movements_in_period.count(), 2)  # entrada inicial + saída
        self.assertGreaterEqual(exits_in_period.count(), 1)  # pelo menos a saída
