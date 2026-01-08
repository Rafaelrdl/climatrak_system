"""
Tests for TrakService Quotes feature.

Tests cover:
1. ServiceCatalogItem CRUD
2. Quote CRUD
3. QuoteItem management
4. Quote status workflow (draft → sent → approved/rejected)
5. Feature gating (quotes feature required)
6. Totals calculation

NOTA: Estes testes usam TenantTestCase com chamadas diretas às views via
RequestFactory em vez de HTTP client, para funcionar corretamente com
django-tenants multi-tenant.
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from django_tenants.test.cases import TenantTestCase

from apps.trakservice.models import (
    Quote,
    QuoteItem,
    ServiceCatalogItem,
    TechnicianProfile,
)
from apps.trakservice.views import (
    QuoteViewSet,
    ServiceCatalogItemViewSet,
)
from apps.tenants.features import FeatureService


User = get_user_model()


class BaseQuotesTestCase(TenantTestCase):
    """Base class para testes de Quotes.
    
    Herda de TenantTestCase para criar automaticamente um tenant de teste
    e executar os testes dentro desse schema.
    Usa APIRequestFactory + force_authenticate para criar requests
    autenticados e chama views diretamente.
    """
    
    def setUp(self):
        """Setup comum para todos os testes."""
        super().setUp()
        self.factory = APIRequestFactory()
        
        # Enable quotes feature for the test tenant
        FeatureService.set_features(
            self.tenant.id,
            {
                "trakservice.enabled": True,
                "trakservice.quotes": True,
            },
        )
        
        # Create test user
        self.user = User.objects.create_user(
            username="quotemanager",
            email="quotemanager@test.com",
            password="testpass123",
            first_name="Quote",
            last_name="Manager",
        )
    
    def _create_work_order(self):
        """Helper to create a work order for testing."""
        from apps.cmms.models import WorkOrder
        from apps.assets.models import Asset, AssetType, Site
        
        site = Site.objects.create(name="Test Site")
        asset_type, _ = AssetType.objects.get_or_create(
            code="HVAC",
            defaults={"name": "HVAC Unit"},
        )
        asset = Asset.objects.create(
            name="Test Asset",
            tag=f"ASSET-{uuid.uuid4().hex[:8]}",
            site=site,
            asset_type=asset_type,
        )
        wo = WorkOrder.objects.create(
            number=f"WO-{uuid.uuid4().hex[:8]}",
            asset=asset,
            description="Test work order",
            type=WorkOrder.Type.CORRECTIVE,
            status=WorkOrder.Status.OPEN,
            priority=WorkOrder.Priority.MEDIUM,
        )
        return wo
    
    def _create_catalog_item(self, **kwargs):
        """Helper to create a catalog item."""
        defaults = {
            "code": f"SVC-{uuid.uuid4().hex[:8]}",
            "name": "Test Service",
            "description": "A test service",
            "estimated_duration_minutes": 60,
            "hourly_cost": Decimal("50.00"),
            "base_price": Decimal("100.00"),
            "margin_percent": Decimal("20.00"),
            "category": "HVAC",
            "is_active": True,
        }
        defaults.update(kwargs)
        return ServiceCatalogItem.objects.create(**defaults)
    
    def _create_inventory_item(self):
        """Helper to create an inventory item."""
        from apps.inventory.models import InventoryItem
        
        return InventoryItem.objects.create(
            code=f"MAT-{uuid.uuid4().hex[:8]}",
            name="Test Material",
            unit="UN",
            quantity=100,
            unit_cost=Decimal("25.00"),
        )


# =============================================================================
# Service Catalog Model Tests
# =============================================================================


class ServiceCatalogItemModelTests(BaseQuotesTestCase):
    """Tests for ServiceCatalogItem model."""
    
    def test_create_catalog_item(self):
        """Test creating a catalog item."""
        item = ServiceCatalogItem.objects.create(
            code="SVC-001",
            name="Manutenção Preventiva HVAC",
            description="Serviço de manutenção preventiva",
            estimated_duration_minutes=120,
            hourly_cost=Decimal("75.00"),
            base_price=Decimal("200.00"),
            margin_percent=Decimal("25.00"),
            category="HVAC",
        )
        
        self.assertIsNotNone(item.id)
        self.assertEqual(item.code, "SVC-001")
        self.assertTrue(item.is_active)
    
    def test_catalog_item_str(self):
        """Test string representation."""
        item = self._create_catalog_item(code="SVC-001", name="Test Service")
        self.assertEqual(str(item), "SVC-001 - Test Service")
    
    def test_calculated_price_with_margin(self):
        """Test calculated_price property with margin."""
        item = self._create_catalog_item(
            base_price=Decimal("100.00"),
            margin_percent=Decimal("20.00"),
        )
        self.assertEqual(item.calculated_price, Decimal("120.00"))
    
    def test_calculated_price_without_margin(self):
        """Test calculated_price property without margin."""
        item = self._create_catalog_item(
            base_price=Decimal("100.00"),
            margin_percent=Decimal("0.00"),
        )
        self.assertEqual(item.calculated_price, Decimal("100.00"))


# =============================================================================
# Quote Model Tests
# =============================================================================


class QuoteModelTests(BaseQuotesTestCase):
    """Tests for Quote model."""
    
    def test_create_quote(self):
        """Test creating a quote."""
        wo = self._create_work_order()
        
        quote = Quote.objects.create(
            work_order=wo,
            valid_until=date.today() + timedelta(days=30),
        )
        
        self.assertIsNotNone(quote.id)
        self.assertTrue(quote.number.startswith("ORC-"))
        self.assertEqual(quote.status, Quote.Status.DRAFT)
    
    def test_quote_number_auto_generation(self):
        """Test auto-generation of quote number."""
        wo = self._create_work_order()
        
        quote1 = Quote.objects.create(work_order=wo)
        quote2 = Quote.objects.create(work_order=wo)
        
        self.assertNotEqual(quote1.number, quote2.number)
        self.assertTrue(quote1.number.startswith("ORC-"))
        self.assertTrue(quote2.number.startswith("ORC-"))
    
    def test_quote_str(self):
        """Test string representation."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo)
        self.assertIn(wo.number, str(quote))
    
    def test_quote_send_workflow(self):
        """Test sending a quote."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo)
        
        quote.send()
        
        self.assertEqual(quote.status, Quote.Status.SENT)
        self.assertIsNotNone(quote.sent_at)
    
    def test_quote_send_only_draft(self):
        """Test that only draft quotes can be sent."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo, status=Quote.Status.SENT)
        
        with self.assertRaises(ValueError):
            quote.send()
    
    def test_quote_approve_workflow(self):
        """Test approving a quote."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo, status=Quote.Status.SENT)
        
        quote.approve(approved_by=self.user)
        
        self.assertEqual(quote.status, Quote.Status.APPROVED)
        self.assertIsNotNone(quote.approved_at)
        self.assertEqual(quote.approved_by, self.user)
    
    def test_quote_approve_only_sent(self):
        """Test that only sent quotes can be approved."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo, status=Quote.Status.DRAFT)
        
        with self.assertRaises(ValueError):
            quote.approve()
    
    def test_quote_reject_workflow(self):
        """Test rejecting a quote."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo, status=Quote.Status.SENT)
        
        quote.reject(reason="Preço muito alto")
        
        self.assertEqual(quote.status, Quote.Status.REJECTED)
        self.assertIsNotNone(quote.rejected_at)
        self.assertEqual(quote.rejection_reason, "Preço muito alto")
    
    def test_quote_reject_only_sent(self):
        """Test that only sent quotes can be rejected."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo, status=Quote.Status.DRAFT)
        
        with self.assertRaises(ValueError):
            quote.reject()
    
    def test_quote_is_expired(self):
        """Test is_expired property."""
        wo = self._create_work_order()
        
        # Not expired
        quote1 = Quote.objects.create(
            work_order=wo,
            valid_until=date.today() + timedelta(days=30),
        )
        self.assertFalse(quote1.is_expired)
        
        # Expired
        quote2 = Quote.objects.create(
            work_order=wo,
            valid_until=date.today() - timedelta(days=1),
        )
        self.assertTrue(quote2.is_expired)
        
        # No expiration date
        quote3 = Quote.objects.create(work_order=wo, valid_until=None)
        self.assertFalse(quote3.is_expired)


# =============================================================================
# QuoteItem Model Tests
# =============================================================================


class QuoteItemModelTests(BaseQuotesTestCase):
    """Tests for QuoteItem model."""
    
    def test_create_service_item(self):
        """Test creating a service quote item."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo)
        catalog_item = self._create_catalog_item()
        
        item = QuoteItem.objects.create(
            quote=quote,
            item_type=QuoteItem.ItemType.SERVICE,
            catalog_item=catalog_item,
            code=catalog_item.code,
            description=catalog_item.name,
            quantity=Decimal("2"),
            unit="HH",
            unit_price=Decimal("50.00"),
        )
        
        self.assertIsNotNone(item.id)
        self.assertEqual(item.item_type, QuoteItem.ItemType.SERVICE)
        self.assertEqual(item.total_price, Decimal("100.00"))
    
    def test_create_material_item(self):
        """Test creating a material quote item."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo)
        inv_item = self._create_inventory_item()
        
        item = QuoteItem.objects.create(
            quote=quote,
            item_type=QuoteItem.ItemType.MATERIAL,
            inventory_item=inv_item,
            code=inv_item.code,
            description=inv_item.name,
            quantity=Decimal("5"),
            unit="UN",
            unit_price=Decimal("25.00"),
        )
        
        self.assertIsNotNone(item.id)
        self.assertEqual(item.item_type, QuoteItem.ItemType.MATERIAL)
        self.assertEqual(item.total_price, Decimal("125.00"))
    
    def test_total_price_calculation(self):
        """Test total price is calculated on save."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo)
        
        item = QuoteItem.objects.create(
            quote=quote,
            item_type=QuoteItem.ItemType.SERVICE,
            code="SVC-001",
            description="Test",
            quantity=Decimal("3.5"),
            unit="HH",
            unit_price=Decimal("100.00"),
        )
        
        self.assertEqual(item.total_price, Decimal("350.00"))


# =============================================================================
# Quote Totals Calculation Tests
# =============================================================================


class QuoteTotalsTests(BaseQuotesTestCase):
    """Tests for quote totals calculation."""
    
    def test_recalculate_totals_services(self):
        """Test totals recalculation for services."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo)
        
        # Add service items
        QuoteItem.objects.create(
            quote=quote,
            item_type=QuoteItem.ItemType.SERVICE,
            code="SVC-001",
            description="Service 1",
            quantity=Decimal("2"),
            unit="HH",
            unit_price=Decimal("100.00"),
        )
        QuoteItem.objects.create(
            quote=quote,
            item_type=QuoteItem.ItemType.SERVICE,
            code="SVC-002",
            description="Service 2",
            quantity=Decimal("1"),
            unit="HH",
            unit_price=Decimal("150.00"),
        )
        
        quote.recalculate_totals()
        
        self.assertEqual(quote.subtotal_services, Decimal("350.00"))
        self.assertEqual(quote.subtotal_materials, Decimal("0.00"))
        self.assertEqual(quote.total, Decimal("350.00"))
    
    def test_recalculate_totals_materials(self):
        """Test totals recalculation for materials."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo)
        
        # Add material items
        QuoteItem.objects.create(
            quote=quote,
            item_type=QuoteItem.ItemType.MATERIAL,
            code="MAT-001",
            description="Material 1",
            quantity=Decimal("10"),
            unit="UN",
            unit_price=Decimal("25.00"),
        )
        
        quote.recalculate_totals()
        
        self.assertEqual(quote.subtotal_services, Decimal("0.00"))
        self.assertEqual(quote.subtotal_materials, Decimal("250.00"))
        self.assertEqual(quote.total, Decimal("250.00"))
    
    def test_recalculate_totals_with_discount(self):
        """Test totals recalculation with discount."""
        wo = self._create_work_order()
        quote = Quote.objects.create(
            work_order=wo,
            discount_percent=Decimal("10.00"),
        )
        
        QuoteItem.objects.create(
            quote=quote,
            item_type=QuoteItem.ItemType.SERVICE,
            code="SVC-001",
            description="Service",
            quantity=Decimal("1"),
            unit="UN",
            unit_price=Decimal("1000.00"),
        )
        
        quote.recalculate_totals()
        
        self.assertEqual(quote.subtotal_services, Decimal("1000.00"))
        self.assertEqual(quote.discount_amount, Decimal("100.00"))
        self.assertEqual(quote.total, Decimal("900.00"))


# =============================================================================
# Service Catalog API Tests
# =============================================================================


class ServiceCatalogItemViewSetTests(BaseQuotesTestCase):
    """Tests for ServiceCatalogItemViewSet."""
    
    def test_list_catalog_items(self):
        """Test listing catalog items."""
        item1 = self._create_catalog_item(code="SVC-LIST-001")
        item2 = self._create_catalog_item(code="SVC-LIST-002")
        
        view = ServiceCatalogItemViewSet.as_view({"get": "list"})
        request = self.factory.get("/api/trakservice/catalog/")
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle pagination (results key) or direct list
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        item_ids = [str(item["id"]) for item in results]
        self.assertIn(str(item1.id), item_ids)
        self.assertIn(str(item2.id), item_ids)
    
    def test_create_catalog_item(self):
        """Test creating a catalog item via API."""
        view = ServiceCatalogItemViewSet.as_view({"post": "create"})
        request = self.factory.post(
            "/api/trakservice/catalog/",
            {
                "code": "SVC-NEW",
                "name": "New Service",
                "base_price": "100.00",
                "category": "HVAC",
            },
            format="json",
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["code"], "SVC-NEW")
    
    def test_get_catalog_item_detail(self):
        """Test retrieving catalog item detail."""
        item = self._create_catalog_item()
        
        view = ServiceCatalogItemViewSet.as_view({"get": "retrieve"})
        request = self.factory.get(f"/api/trakservice/catalog/{item.id}/")
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=item.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(item.id))
    
    def test_update_catalog_item(self):
        """Test updating a catalog item."""
        item = self._create_catalog_item(name="Old Name")
        
        view = ServiceCatalogItemViewSet.as_view({"patch": "partial_update"})
        request = self.factory.patch(
            f"/api/trakservice/catalog/{item.id}/",
            {"name": "New Name"},
            format="json",
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=item.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.name, "New Name")
    
    def test_delete_catalog_item(self):
        """Test deleting a catalog item."""
        item = self._create_catalog_item()
        
        view = ServiceCatalogItemViewSet.as_view({"delete": "destroy"})
        request = self.factory.delete(f"/api/trakservice/catalog/{item.id}/")
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=item.id)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ServiceCatalogItem.objects.filter(id=item.id).exists())
    
    def test_list_active_catalog_items(self):
        """Test listing only active catalog items."""
        self._create_catalog_item(code="SVC-001", is_active=True)
        self._create_catalog_item(code="SVC-002", is_active=False)
        
        view = ServiceCatalogItemViewSet.as_view({"get": "active"})
        request = self.factory.get("/api/trakservice/catalog/active/")
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["code"], "SVC-001")
    
    def test_list_categories(self):
        """Test listing unique categories."""
        self._create_catalog_item(code="SVC-001", category="HVAC")
        self._create_catalog_item(code="SVC-002", category="HVAC")
        self._create_catalog_item(code="SVC-003", category="Elétrica")
        
        view = ServiceCatalogItemViewSet.as_view({"get": "categories"})
        request = self.factory.get("/api/trakservice/catalog/categories/")
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertIn("HVAC", response.data)
        self.assertIn("Elétrica", response.data)


# =============================================================================
# Quote API Tests
# =============================================================================


class QuoteViewSetTests(BaseQuotesTestCase):
    """Tests for QuoteViewSet."""
    
    def test_list_quotes(self):
        """Test listing quotes."""
        wo = self._create_work_order()
        quote1 = Quote.objects.create(work_order=wo)
        quote2 = Quote.objects.create(work_order=wo)
        
        view = QuoteViewSet.as_view({"get": "list"})
        request = self.factory.get("/api/trakservice/quotes/")
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle pagination (results key) or direct list
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        quote_ids = [str(q["id"]) for q in results]
        self.assertIn(str(quote1.id), quote_ids)
        self.assertIn(str(quote2.id), quote_ids)
    
    def test_create_quote(self):
        """Test creating a quote via API."""
        wo = self._create_work_order()
        
        view = QuoteViewSet.as_view({"post": "create"})
        request = self.factory.post(
            "/api/trakservice/quotes/",
            {
                "work_order": wo.id,
                "valid_until": (date.today() + timedelta(days=30)).isoformat(),
                "discount_percent": "5.00",
            },
            format="json",
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["number"].startswith("ORC-"))
        self.assertEqual(response.data["status"], Quote.Status.DRAFT)
    
    def test_create_quote_with_items(self):
        """Test creating a quote with items via API."""
        wo = self._create_work_order()
        catalog_item = self._create_catalog_item()
        
        view = QuoteViewSet.as_view({"post": "create"})
        request = self.factory.post(
            "/api/trakservice/quotes/",
            {
                "work_order": wo.id,
                "items": [
                    {
                        "item_type": QuoteItem.ItemType.SERVICE,
                        "catalog_item": str(catalog_item.id),
                        "code": catalog_item.code,
                        "description": catalog_item.name,
                        "quantity": "2",
                        "unit": "HH",
                        "unit_price": "50.00",
                    }
                ],
            },
            format="json",
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["subtotal_services"], "100.00")
        self.assertEqual(response.data["total"], "100.00")
    
    def test_get_quote_detail(self):
        """Test retrieving quote detail."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo)
        
        view = QuoteViewSet.as_view({"get": "retrieve"})
        request = self.factory.get(f"/api/trakservice/quotes/{quote.id}/")
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(quote.id))
    
    def test_update_draft_quote(self):
        """Test updating a draft quote."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo)
        
        view = QuoteViewSet.as_view({"patch": "partial_update"})
        request = self.factory.patch(
            f"/api/trakservice/quotes/{quote.id}/",
            {"notes": "Updated notes"},
            format="json",
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        quote.refresh_from_db()
        self.assertEqual(quote.notes, "Updated notes")
    
    def test_cannot_update_sent_quote(self):
        """Test that sent quotes cannot be updated."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo, status=Quote.Status.SENT)
        
        view = QuoteViewSet.as_view({"patch": "partial_update"})
        request = self.factory.patch(
            f"/api/trakservice/quotes/{quote.id}/",
            {"notes": "Should fail"},
            format="json",
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_delete_draft_quote(self):
        """Test deleting a draft quote."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo)
        
        view = QuoteViewSet.as_view({"delete": "destroy"})
        request = self.factory.delete(f"/api/trakservice/quotes/{quote.id}/")
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Quote.objects.filter(id=quote.id).exists())
    
    def test_cannot_delete_sent_quote(self):
        """Test that sent quotes cannot be deleted."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo, status=Quote.Status.SENT)
        
        view = QuoteViewSet.as_view({"delete": "destroy"})
        request = self.factory.delete(f"/api/trakservice/quotes/{quote.id}/")
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Quote Workflow API Tests
# =============================================================================


class QuoteWorkflowTests(BaseQuotesTestCase):
    """Tests for quote workflow actions."""
    
    def test_send_quote(self):
        """Test sending a quote via API."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo)
        
        view = QuoteViewSet.as_view({"post": "send"})
        request = self.factory.post(
            f"/api/trakservice/quotes/{quote.id}/send/",
            {"notify_customer": False},
            format="json",
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Quote.Status.SENT)
        self.assertIsNotNone(response.data["sent_at"])
    
    def test_send_non_draft_fails(self):
        """Test that sending a non-draft quote fails."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo, status=Quote.Status.SENT)
        
        view = QuoteViewSet.as_view({"post": "send"})
        request = self.factory.post(
            f"/api/trakservice/quotes/{quote.id}/send/",
            {},
            format="json",
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_approve_quote(self):
        """Test approving a quote via API."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo, status=Quote.Status.SENT)
        
        view = QuoteViewSet.as_view({"post": "approve"})
        request = self.factory.post(
            f"/api/trakservice/quotes/{quote.id}/approve/",
            {"notes": "Approved with conditions"},
            format="json",
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Quote.Status.APPROVED)
        self.assertIsNotNone(response.data["approved_at"])
    
    def test_approve_non_sent_fails(self):
        """Test that approving a non-sent quote fails."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo, status=Quote.Status.DRAFT)
        
        view = QuoteViewSet.as_view({"post": "approve"})
        request = self.factory.post(
            f"/api/trakservice/quotes/{quote.id}/approve/",
            {},
            format="json",
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_reject_quote(self):
        """Test rejecting a quote via API."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo, status=Quote.Status.SENT)
        
        view = QuoteViewSet.as_view({"post": "reject"})
        request = self.factory.post(
            f"/api/trakservice/quotes/{quote.id}/reject/",
            {"reason": "Preço muito alto"},
            format="json",
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Quote.Status.REJECTED)
        self.assertEqual(response.data["rejection_reason"], "Preço muito alto")
    
    def test_reject_non_sent_fails(self):
        """Test that rejecting a non-sent quote fails."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo, status=Quote.Status.DRAFT)
        
        view = QuoteViewSet.as_view({"post": "reject"})
        request = self.factory.post(
            f"/api/trakservice/quotes/{quote.id}/reject/",
            {},
            format="json",
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Quote Items API Tests
# =============================================================================


class QuoteItemsTests(BaseQuotesTestCase):
    """Tests for quote item management."""
    
    def test_add_item_to_quote(self):
        """Test adding an item to a quote."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo)
        
        view = QuoteViewSet.as_view({"post": "add_item"})
        request = self.factory.post(
            f"/api/trakservice/quotes/{quote.id}/items/",
            {
                "item_type": QuoteItem.ItemType.SERVICE,
                "code": "SVC-001",
                "description": "Test Service",
                "quantity": "2",
                "unit": "HH",
                "unit_price": "100.00",
            },
            format="json",
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify totals updated
        quote.refresh_from_db()
        self.assertEqual(quote.total, Decimal("200.00"))
    
    def test_cannot_add_item_to_sent_quote(self):
        """Test that items cannot be added to sent quotes."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo, status=Quote.Status.SENT)
        
        view = QuoteViewSet.as_view({"post": "add_item"})
        request = self.factory.post(
            f"/api/trakservice/quotes/{quote.id}/items/",
            {
                "item_type": QuoteItem.ItemType.SERVICE,
                "code": "SVC-001",
                "description": "Test Service",
                "quantity": "1",
                "unit": "UN",
                "unit_price": "100.00",
            },
            format="json",
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_remove_item_from_quote(self):
        """Test removing an item from a quote."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo)
        item = QuoteItem.objects.create(
            quote=quote,
            item_type=QuoteItem.ItemType.SERVICE,
            code="SVC-001",
            description="Test",
            quantity=Decimal("1"),
            unit="UN",
            unit_price=Decimal("100.00"),
        )
        quote.recalculate_totals()
        
        view = QuoteViewSet.as_view({"delete": "remove_item"})
        request = self.factory.delete(
            f"/api/trakservice/quotes/{quote.id}/items/{item.id}/"
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id, item_id=item.id)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(QuoteItem.objects.filter(id=item.id).exists())
        
        # Verify totals updated
        quote.refresh_from_db()
        self.assertEqual(quote.total, Decimal("0.00"))
    
    def test_cannot_remove_item_from_sent_quote(self):
        """Test that items cannot be removed from sent quotes."""
        wo = self._create_work_order()
        quote = Quote.objects.create(work_order=wo, status=Quote.Status.SENT)
        item = QuoteItem.objects.create(
            quote=quote,
            item_type=QuoteItem.ItemType.SERVICE,
            code="SVC-001",
            description="Test",
            quantity=Decimal("1"),
            unit="UN",
            unit_price=Decimal("100.00"),
        )
        
        view = QuoteViewSet.as_view({"delete": "remove_item"})
        request = self.factory.delete(
            f"/api/trakservice/quotes/{quote.id}/items/{item.id}/"
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id, item_id=item.id)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Feature Gating Tests
# =============================================================================


class QuotesFeatureGatingTests(BaseQuotesTestCase):
    """Tests for quotes feature gating."""
    
    def test_catalog_blocked_when_quotes_disabled(self):
        """Test that catalog access is blocked when quotes feature is disabled."""
        # Disable quotes feature
        FeatureService.set_features(
            self.tenant.id,
            {
                "trakservice.enabled": True,
                "trakservice.quotes": False,
            },
        )
        
        view = ServiceCatalogItemViewSet.as_view({"get": "list"})
        request = self.factory.get("/api/trakservice/catalog/")
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request)
        
        # Should be 403 Forbidden
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_quotes_blocked_when_quotes_disabled(self):
        """Test that quotes access is blocked when quotes feature is disabled."""
        # Disable quotes feature
        FeatureService.set_features(
            self.tenant.id,
            {
                "trakservice.enabled": True,
                "trakservice.quotes": False,
            },
        )
        
        view = QuoteViewSet.as_view({"get": "list"})
        request = self.factory.get("/api/trakservice/quotes/")
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request)
        
        # Should be 403 Forbidden
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_quotes_blocked_when_trakservice_disabled(self):
        """Test that quotes are blocked when main trakservice is disabled."""
        # Disable main trakservice feature
        FeatureService.set_features(
            self.tenant.id,
            {
                "trakservice.enabled": False,
            },
        )
        
        view = QuoteViewSet.as_view({"get": "list"})
        request = self.factory.get("/api/trakservice/quotes/")
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request)
        
        # Should be 403 Forbidden
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# =============================================================================
# Additional Filter Tests
# =============================================================================


class QuoteFilterTests(BaseQuotesTestCase):
    """Tests for quote filtering."""
    
    def test_filter_by_status(self):
        """Test filtering quotes by status."""
        wo = self._create_work_order()
        q_draft = Quote.objects.create(work_order=wo, status=Quote.Status.DRAFT)
        q_sent = Quote.objects.create(work_order=wo, status=Quote.Status.SENT)
        q_approved = Quote.objects.create(work_order=wo, status=Quote.Status.APPROVED)
        
        view = QuoteViewSet.as_view({"get": "list"})
        request = self.factory.get("/api/trakservice/quotes/?status=sent")
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle pagination (results key) or direct list
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        quote_ids = [str(q["id"]) for q in results]
        self.assertIn(str(q_sent.id), quote_ids)
        self.assertNotIn(str(q_draft.id), quote_ids)
        self.assertNotIn(str(q_approved.id), quote_ids)
        # Todos devem ter status SENT
        for q in results:
            self.assertEqual(q["status"], Quote.Status.SENT)
    
    def test_filter_by_work_order(self):
        """Test filtering quotes by work order."""
        wo1 = self._create_work_order()
        wo2 = self._create_work_order()
        q1 = Quote.objects.create(work_order=wo1)
        q2 = Quote.objects.create(work_order=wo1)
        q3 = Quote.objects.create(work_order=wo2)
        
        view = QuoteViewSet.as_view({"get": "list"})
        request = self.factory.get(f"/api/trakservice/quotes/?work_order_id={wo1.id}")
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle pagination (results key) or direct list
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        quote_ids = [str(q["id"]) for q in results]
        self.assertIn(str(q1.id), quote_ids)
        self.assertIn(str(q2.id), quote_ids)
        self.assertNotIn(str(q3.id), quote_ids)
    
    def test_pending_action(self):
        """Test getting pending quotes (sent status)."""
        wo = self._create_work_order()
        Quote.objects.create(work_order=wo, status=Quote.Status.DRAFT)
        Quote.objects.create(work_order=wo, status=Quote.Status.SENT)
        Quote.objects.create(work_order=wo, status=Quote.Status.SENT)
        Quote.objects.create(work_order=wo, status=Quote.Status.APPROVED)
        
        view = QuoteViewSet.as_view({"get": "pending"})
        request = self.factory.get("/api/trakservice/quotes/pending/")
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
    
    def test_by_work_order_action(self):
        """Test getting quotes by work order via action."""
        wo1 = self._create_work_order()
        wo2 = self._create_work_order()
        Quote.objects.create(work_order=wo1)
        Quote.objects.create(work_order=wo2)
        
        view = QuoteViewSet.as_view({"get": "by_work_order"})
        request = self.factory.get(
            f"/api/trakservice/quotes/by-work-order/{wo1.id}/"
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, work_order_id=wo1.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
