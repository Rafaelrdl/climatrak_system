"""
Testes de API para o módulo de Inventory

Cobertura:
- POST /inventory/items/ cria item com movimentação
- GET /inventory/movements/ retorna movimentações no período
- Endpoints de análise (consumption_by_category, top_consumed_items)

NOTE: Inventory is a TENANT_APP, so all tests must use TenantTestCase
to ensure tables are created in the test tenant schema.
"""

from decimal import Decimal
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.inventory.models import InventoryCategory, InventoryItem, InventoryMovement
from apps.inventory.services import InventoryItemService
from apps.inventory.views import InventoryItemViewSet, InventoryMovementViewSet


User = get_user_model()


class InventoryItemAPITests(TenantTestCase):
    """Testes para API de itens de estoque."""
    
    def setUp(self):
        """Setup para cada teste."""
        self.factory = APIRequestFactory()
        self.category = InventoryCategory.objects.create(
            name="Peças Mecânicas",
            code="MEC",
            is_active=True,
        )
        self.user = User.objects.create_user(
            username="apiuser",
            email="apiuser@example.com",
            password="testpass123",
            first_name="API",
            last_name="User",
        )

    def test_create_item_with_quantity_creates_movement(self):
        """
        POST /inventory/items/ com quantity > 0 deve criar movimentação IN.
        """
        data = {
            "code": "API-001",
            "name": "Item via API",
            "unit": "UN",
            "quantity": "75",
            "min_quantity": "10",
            "unit_cost": "25.50",
            "category": self.category.id,
        }

        view = InventoryItemViewSet.as_view({"post": "create"})
        request = self.factory.post("/api/inventory/items/", data, format="json")
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["code"], "API-001")
        self.assertEqual(Decimal(response.data["quantity"]), Decimal("75"))

        # Verificar que movimentação foi criada
        item_id = response.data["id"]
        movements = InventoryMovement.objects.filter(item_id=item_id)
        self.assertEqual(movements.count(), 1)
        
        movement = movements.first()
        self.assertEqual(movement.type, InventoryMovement.MovementType.IN)
        self.assertEqual(movement.quantity, Decimal("75"))
        self.assertIn("INITIAL_BALANCE", movement.reference)

    def test_create_item_without_quantity_no_movement(self):
        """
        POST /inventory/items/ com quantity = 0 NÃO deve criar movimentação.
        """
        data = {
            "code": "API-002",
            "name": "Item Sem Estoque",
            "unit": "UN",
            "quantity": "0",
            "min_quantity": "5",
            "category": self.category.id,
        }

        view = InventoryItemViewSet.as_view({"post": "create"})
        request = self.factory.post("/api/inventory/items/", data, format="json")
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        item_id = response.data["id"]
        movements = InventoryMovement.objects.filter(item_id=item_id)
        self.assertEqual(movements.count(), 0)


class InventoryMovementsAPITests(TenantTestCase):
    """Testes para API de movimentações."""
    
    def setUp(self):
        """Setup para cada teste."""
        self.factory = APIRequestFactory()
        self.category = InventoryCategory.objects.create(
            name="Consumíveis",
            code="CONS",
            is_active=True,
        )
        self.user = User.objects.create_user(
            username="movuser",
            email="movuser@example.com",
            password="testpass123",
            first_name="Mov",
            last_name="User",
        )
        
        # Criar item com movimentações
        self.item, _ = InventoryItemService.create_item_with_initial_stock(
            code="MOV-001",
            name="Item Movimentações",
            unit=InventoryItem.Unit.UNIT,
            quantity=Decimal("100"),
            unit_cost=Decimal("10.00"),
            category=self.category,
            performed_by=self.user,
        )

        # Adicionar saída
        InventoryMovement.objects.create(
            item=self.item,
            type=InventoryMovement.MovementType.OUT,
            reason=InventoryMovement.Reason.WORK_ORDER,
            quantity=Decimal("15"),
            performed_by=self.user,
        )

    def test_list_movements_returns_all_types(self):
        """
        GET /inventory/movements/ deve retornar todos os tipos de movimentação.
        """
        view = InventoryMovementViewSet.as_view({"get": "list"})
        request = self.factory.get("/api/inventory/movements/")
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Pode ser paginado ou lista
        results = response.data.get("results", response.data)
        self.assertGreaterEqual(len(results), 2)  # entrada inicial + saída

        types = [m["type"] for m in results]
        self.assertIn("IN", types)
        self.assertIn("OUT", types)

    def test_consumption_by_category_endpoint(self):
        """
        GET /inventory/movements/consumption_by_category/ retorna consumo agrupado.
        """
        view = InventoryMovementViewSet.as_view({"get": "consumption_by_category"})
        request = self.factory.get("/api/inventory/movements/consumption_by_category/", {"days": 90})
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        
        # Deve ter consumo na categoria
        if len(response.data) > 0:
            self.assertIn("category_name", response.data[0])
            self.assertIn("total_consumed", response.data[0])

    def test_top_consumed_items_endpoint(self):
        """
        GET /inventory/movements/top_consumed_items/ retorna itens mais consumidos.
        """
        view = InventoryMovementViewSet.as_view({"get": "top_consumed_items"})
        request = self.factory.get("/api/inventory/movements/top_consumed_items/", {"days": 90, "limit": 5})
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        
        if len(response.data) > 0:
            self.assertIn("item_name", response.data[0])
            self.assertIn("total_consumed", response.data[0])

    def test_movements_filter_by_date_range(self):
        """
        GET /inventory/movements/ com filtro de data funciona corretamente.
        """
        start_date = (timezone.now() - timedelta(days=90)).isoformat()
        
        view = InventoryMovementViewSet.as_view({"get": "list"})
        request = self.factory.get(
            "/api/inventory/movements/",
            {"created_at__gte": start_date}
        )
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        
        # Movimentações recentes devem aparecer
        self.assertGreaterEqual(len(results), 2)
