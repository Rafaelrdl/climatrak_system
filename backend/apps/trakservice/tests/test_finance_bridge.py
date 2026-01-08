"""
Tests for TrakService Finance Bridge (Issue 08).

Tests cover:
1. CostTransaction creation when Quote is approved
2. Idempotency - same quote approved twice doesn't duplicate transactions
3. Lock handling - locked months prevent new transactions
4. Event publishing - trakservice.quote.approved.v1
5. Service-only and material-only quotes

Reference:
- docs/trakledger/02-regras-negocio.md
- docs/events/
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from django_tenants.test.cases import TenantTestCase

from apps.trakservice.models import Quote, QuoteItem, ServiceCatalogItem
from apps.trakservice.services import QuoteFinanceService, FinanceLockError
from apps.trakservice.views import QuoteViewSet
from apps.tenants.features import FeatureService


User = get_user_model()


class BaseFinanceBridgeTestCase(TenantTestCase):
    """Base class for finance bridge tests."""
    
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
            username="financeuser",
            email="finance@test.com",
            password="testpass123",
            first_name="Finance",
            last_name="User",
        )
        
        # Create cost center for transactions
        self._create_cost_center()
    
    def _create_cost_center(self):
        """Create a cost center for the tests."""
        from apps.trakledger.models import CostCenter
        
        self.cost_center = CostCenter.objects.create(
            code="CC-TEST",
            name="Test Cost Center",
            is_active=True,
        )
        return self.cost_center
    
    def _create_site(self):
        """Helper to create a site."""
        from apps.assets.models import Site
        
        return Site.objects.create(
            name="Test Site",
            address="123 Test St",
            latitude=Decimal("-23.550520"),
            longitude=Decimal("-46.633308"),
        )
    
    def _create_asset(self, site=None):
        """Helper to create an asset."""
        from apps.assets.models import Asset
        
        if not site:
            site = self._create_site()
        
        return Asset.objects.create(
            tag=f"ASSET-{uuid.uuid4().hex[:8]}",
            name="Test Asset",
            site=site,
            asset_type="CHILLER",  # Required field
        )
    
    def _create_work_order(self, asset=None):
        """Helper to create a work order."""
        from apps.cmms.models import WorkOrder
        
        if not asset:
            asset = self._create_asset()
        
        return WorkOrder.objects.create(
            number=f"WO-{uuid.uuid4().hex[:8]}",
            description="Test Work Order",
            asset=asset,
            priority=WorkOrder.Priority.MEDIUM,
            status=WorkOrder.Status.OPEN,
            created_by=self.user,
            cost_center=self.cost_center,
        )
    
    def _create_quote_with_items(self, work_order=None):
        """Create a quote with service and material items."""
        if not work_order:
            work_order = self._create_work_order()
        
        quote = Quote.objects.create(
            work_order=work_order,
            valid_until=date.today() + timedelta(days=30),
        )
        
        # Add service item
        QuoteItem.objects.create(
            quote=quote,
            item_type=QuoteItem.ItemType.SERVICE,
            code="SVC-001",
            description="Test Service",
            quantity=Decimal("2"),
            unit="HH",
            unit_price=Decimal("100.00"),
        )
        
        # Add material item
        QuoteItem.objects.create(
            quote=quote,
            item_type=QuoteItem.ItemType.MATERIAL,
            code="MAT-001",
            description="Test Material",
            quantity=Decimal("5"),
            unit="UN",
            unit_price=Decimal("50.00"),
        )
        
        quote.recalculate_totals()
        return quote


# =============================================================================
# Idempotency Tests
# =============================================================================


class QuoteFinanceIdempotencyTests(BaseFinanceBridgeTestCase):
    """Tests for idempotent transaction creation."""
    
    def test_approve_creates_transactions(self):
        """Test that approving a quote creates CostTransactions."""
        from apps.trakledger.models import CostTransaction
        
        quote = self._create_quote_with_items()
        quote.status = Quote.Status.SENT
        quote.save()
        
        # Approve
        quote.approve(approved_by=self.user)
        
        # Process finance
        result = QuoteFinanceService.process_quote_approved(
            quote=quote,
            approved_by=self.user,
            publish_event=False,  # Skip event for this test
        )
        
        self.assertTrue(result["success"])
        self.assertEqual(result["transactions_created"], 2)  # Service + Material
        self.assertEqual(result["skipped"], 0)
        
        # Verify transactions exist
        service_tx = CostTransaction.objects.filter(
            idempotency_key=f"quote:{quote.id}:service"
        ).first()
        material_tx = CostTransaction.objects.filter(
            idempotency_key=f"quote:{quote.id}:material"
        ).first()
        
        self.assertIsNotNone(service_tx)
        self.assertIsNotNone(material_tx)
        self.assertEqual(service_tx.amount, Decimal("200.00"))  # 2 x 100
        self.assertEqual(material_tx.amount, Decimal("250.00"))  # 5 x 50
    
    def test_idempotency_same_quote_no_duplicate(self):
        """Test that processing same quote twice doesn't create duplicates."""
        from apps.trakledger.models import CostTransaction
        
        quote = self._create_quote_with_items()
        quote.status = Quote.Status.APPROVED
        quote.approved_at = timezone.now()
        quote.save()
        
        # First call
        result1 = QuoteFinanceService.process_quote_approved(
            quote=quote,
            approved_by=self.user,
            publish_event=False,
        )
        
        # Second call (should be idempotent)
        result2 = QuoteFinanceService.process_quote_approved(
            quote=quote,
            approved_by=self.user,
            publish_event=False,
        )
        
        # First call creates
        self.assertEqual(result1["transactions_created"], 2)
        self.assertEqual(result1["skipped"], 0)
        
        # Second call skips
        self.assertEqual(result2["transactions_created"], 0)
        self.assertEqual(result2["skipped"], 2)  # Both service and material skipped
        
        # Verify only 2 transactions total
        count = CostTransaction.objects.filter(
            idempotency_key__startswith=f"quote:{quote.id}:"
        ).count()
        self.assertEqual(count, 2)
    
    def test_idempotency_key_format(self):
        """Test that idempotency keys have correct format."""
        from apps.trakledger.models import CostTransaction
        
        quote = self._create_quote_with_items()
        quote.status = Quote.Status.APPROVED
        quote.approved_at = timezone.now()
        quote.save()
        
        QuoteFinanceService.process_quote_approved(
            quote=quote,
            publish_event=False,
        )
        
        # Check keys exist with correct format
        service_key = f"quote:{quote.id}:service"
        material_key = f"quote:{quote.id}:material"
        
        self.assertTrue(
            CostTransaction.objects.filter(idempotency_key=service_key).exists()
        )
        self.assertTrue(
            CostTransaction.objects.filter(idempotency_key=material_key).exists()
        )


# =============================================================================
# Transaction Content Tests
# =============================================================================


class QuoteFinanceTransactionTests(BaseFinanceBridgeTestCase):
    """Tests for transaction content and metadata."""
    
    def test_service_only_quote(self):
        """Test quote with only services."""
        from apps.trakledger.models import CostTransaction
        
        wo = self._create_work_order()
        quote = Quote.objects.create(
            work_order=wo,
            status=Quote.Status.APPROVED,
            approved_at=timezone.now(),
        )
        
        # Only service item
        QuoteItem.objects.create(
            quote=quote,
            item_type=QuoteItem.ItemType.SERVICE,
            code="SVC-001",
            description="Service Only",
            quantity=Decimal("1"),
            unit="HH",
            unit_price=Decimal("150.00"),
        )
        quote.recalculate_totals()
        
        result = QuoteFinanceService.process_quote_approved(quote, publish_event=False)
        
        self.assertEqual(result["transactions_created"], 1)
        
        # Only service transaction exists
        self.assertTrue(
            CostTransaction.objects.filter(
                idempotency_key=f"quote:{quote.id}:service"
            ).exists()
        )
        self.assertFalse(
            CostTransaction.objects.filter(
                idempotency_key=f"quote:{quote.id}:material"
            ).exists()
        )
    
    def test_material_only_quote(self):
        """Test quote with only materials."""
        from apps.trakledger.models import CostTransaction
        
        wo = self._create_work_order()
        quote = Quote.objects.create(
            work_order=wo,
            status=Quote.Status.APPROVED,
            approved_at=timezone.now(),
        )
        
        # Only material item
        QuoteItem.objects.create(
            quote=quote,
            item_type=QuoteItem.ItemType.MATERIAL,
            code="MAT-001",
            description="Material Only",
            quantity=Decimal("10"),
            unit="UN",
            unit_price=Decimal("25.00"),
        )
        quote.recalculate_totals()
        
        result = QuoteFinanceService.process_quote_approved(quote, publish_event=False)
        
        self.assertEqual(result["transactions_created"], 1)
        
        # Only material transaction exists
        self.assertFalse(
            CostTransaction.objects.filter(
                idempotency_key=f"quote:{quote.id}:service"
            ).exists()
        )
        self.assertTrue(
            CostTransaction.objects.filter(
                idempotency_key=f"quote:{quote.id}:material"
            ).exists()
        )
    
    def test_transaction_metadata(self):
        """Test that transaction metadata contains quote info."""
        from apps.trakledger.models import CostTransaction
        
        quote = self._create_quote_with_items()
        quote.status = Quote.Status.APPROVED
        quote.approved_at = timezone.now()
        quote.save()
        
        QuoteFinanceService.process_quote_approved(quote, publish_event=False)
        
        service_tx = CostTransaction.objects.get(
            idempotency_key=f"quote:{quote.id}:service"
        )
        
        # Check metadata
        self.assertEqual(service_tx.meta["quote_id"], str(quote.id))
        self.assertEqual(service_tx.meta["quote_number"], quote.number)
        self.assertEqual(service_tx.meta["source"], "trakservice.quote")
        self.assertIn("breakdown", service_tx.meta)
        self.assertEqual(len(service_tx.meta["breakdown"]), 1)  # 1 service item
    
    def test_transaction_category_from_work_order(self):
        """Test that transaction category is mapped from work order."""
        from apps.trakledger.models import CostTransaction
        from apps.cmms.models import WorkOrder
        
        asset = self._create_asset()
        wo = WorkOrder.objects.create(
            number=f"WO-{uuid.uuid4().hex[:8]}",
            description="Preventive Work Order",
            asset=asset,
            priority=WorkOrder.Priority.MEDIUM,
            status=WorkOrder.Status.OPEN,
            created_by=self.user,
            cost_center=self.cost_center,
            type=WorkOrder.Type.PREVENTIVE,
        )
        
        quote = Quote.objects.create(
            work_order=wo,
            status=Quote.Status.APPROVED,
            approved_at=timezone.now(),
        )
        
        QuoteItem.objects.create(
            quote=quote,
            item_type=QuoteItem.ItemType.SERVICE,
            code="SVC-001",
            description="Preventive Service",
            quantity=Decimal("1"),
            unit="HH",
            unit_price=Decimal("100.00"),
        )
        quote.recalculate_totals()
        
        QuoteFinanceService.process_quote_approved(quote, publish_event=False)
        
        tx = CostTransaction.objects.get(
            idempotency_key=f"quote:{quote.id}:service"
        )
        
        self.assertEqual(tx.category, CostTransaction.Category.PREVENTIVE)


# =============================================================================
# Lock Tests
# =============================================================================


class QuoteFinanceLockTests(BaseFinanceBridgeTestCase):
    """Tests for month lock handling."""
    
    def test_locked_month_raises_error(self):
        """Test that locked month prevents transaction creation."""
        from apps.trakledger.models import BudgetMonth, BudgetEnvelope, BudgetPlan
        
        # Create budget plan and envelope
        plan = BudgetPlan.objects.create(
            name="Test Plan 2026",
            code="PLAN-2026",
            year=2026,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            status=BudgetPlan.Status.ACTIVE,
        )
        
        envelope = BudgetEnvelope.objects.create(
            budget_plan=plan,
            name="Corrective Envelope",
            category=BudgetEnvelope.Category.CORRECTIVE,
            cost_center=self.cost_center,
            amount=Decimal("100000.00"),
        )
        
        # Create and lock the month
        locked_month = BudgetMonth.objects.create(
            envelope=envelope,
            month=date(2026, 1, 1),
            planned_amount=Decimal("10000.00"),
            is_locked=True,
            locked_at=timezone.now(),
        )
        
        # Create quote with approval date in locked month
        quote = self._create_quote_with_items()
        quote.status = Quote.Status.APPROVED
        quote.approved_at = timezone.make_aware(
            timezone.datetime(2026, 1, 15, 10, 0, 0)
        )
        quote.save()
        
        # Should raise FinanceLockError
        with self.assertRaises(FinanceLockError) as ctx:
            QuoteFinanceService.process_quote_approved(quote, publish_event=False)
        
        self.assertIn("locked", str(ctx.exception).lower())


# =============================================================================
# Event Publishing Tests
# =============================================================================


class QuoteFinanceEventTests(BaseFinanceBridgeTestCase):
    """Tests for event publishing."""
    
    @patch('apps.core_events.services.EventPublisher')
    def test_event_published_on_approval(self, mock_publisher):
        """Test that trakservice.quote.approved.v1 event is published."""
        quote = self._create_quote_with_items()
        quote.status = Quote.Status.APPROVED
        quote.approved_at = timezone.now()
        quote.save()
        
        QuoteFinanceService.process_quote_approved(
            quote=quote,
            approved_by=self.user,
            publish_event=True,
        )
        
        # Verify event was published
        mock_publisher.publish.assert_called_once()
        
        call_kwargs = mock_publisher.publish.call_args[1]
        self.assertEqual(call_kwargs["event_name"], "trakservice.quote.approved.v1")
        self.assertEqual(call_kwargs["aggregate_type"], "quote")
        self.assertEqual(call_kwargs["aggregate_id"], str(quote.id))
        self.assertIn("quote_id", call_kwargs["data"])
        self.assertIn("total", call_kwargs["data"])
    
    @patch('apps.core_events.services.EventPublisher')
    def test_event_not_published_when_disabled(self, mock_publisher):
        """Test that event is not published when publish_event=False."""
        quote = self._create_quote_with_items()
        quote.status = Quote.Status.APPROVED
        quote.approved_at = timezone.now()
        quote.save()
        
        QuoteFinanceService.process_quote_approved(
            quote=quote,
            publish_event=False,
        )
        
        mock_publisher.publish.assert_not_called()


# =============================================================================
# API Integration Tests
# =============================================================================


class QuoteApproveAPITests(BaseFinanceBridgeTestCase):
    """Tests for Quote approve endpoint with finance integration."""
    
    def test_approve_endpoint_creates_finance_entries(self):
        """Test that POST /quotes/{id}/approve/ creates finance entries."""
        from apps.trakledger.models import CostTransaction
        
        quote = self._create_quote_with_items()
        quote.status = Quote.Status.SENT
        quote.save()
        
        view = QuoteViewSet.as_view({"post": "approve"})
        request = self.factory.post(
            f"/api/trakservice/quotes/{quote.id}/approve/",
            {},
            format="json",
        )
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        
        response = view(request, pk=quote.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Quote.Status.APPROVED)
        
        # Check finance_result in response
        self.assertIn("finance_result", response.data)
        self.assertTrue(response.data["finance_result"]["success"])
        self.assertEqual(response.data["finance_result"]["transactions_created"], 2)
        
        # Verify transactions created
        self.assertTrue(
            CostTransaction.objects.filter(
                idempotency_key=f"quote:{quote.id}:service"
            ).exists()
        )
    
    def test_approve_endpoint_idempotent(self):
        """Test that calling approve twice doesn't duplicate finance entries."""
        from apps.trakledger.models import CostTransaction
        
        quote = self._create_quote_with_items()
        quote.status = Quote.Status.SENT
        quote.save()
        
        view = QuoteViewSet.as_view({"post": "approve"})
        
        # First call
        request1 = self.factory.post(
            f"/api/trakservice/quotes/{quote.id}/approve/",
            {},
            format="json",
        )
        force_authenticate(request1, user=self.user)
        request1.tenant = self.tenant
        response1 = view(request1, pk=quote.id)
        
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        
        # Second call (quote is already approved, should fail workflow)
        request2 = self.factory.post(
            f"/api/trakservice/quotes/{quote.id}/approve/",
            {},
            format="json",
        )
        force_authenticate(request2, user=self.user)
        request2.tenant = self.tenant
        
        # Refresh quote to get updated status
        quote.refresh_from_db()
        response2 = view(request2, pk=quote.id)
        
        # Second call should fail because quote is already approved
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Verify still only 2 transactions
        count = CostTransaction.objects.filter(
            idempotency_key__startswith=f"quote:{quote.id}:"
        ).count()
        self.assertEqual(count, 2)


# =============================================================================
# Error Handling Tests
# =============================================================================


class QuoteFinanceErrorTests(BaseFinanceBridgeTestCase):
    """Tests for error handling."""
    
    def test_non_approved_quote_raises_error(self):
        """Test that processing non-approved quote raises error."""
        quote = self._create_quote_with_items()
        # Quote is in DRAFT status
        
        with self.assertRaises(ValueError) as ctx:
            QuoteFinanceService.process_quote_approved(quote)
        
        self.assertIn("APPROVED", str(ctx.exception))
    
    def test_empty_quote_no_transactions(self):
        """Test that quote without items creates no transactions."""
        wo = self._create_work_order()
        quote = Quote.objects.create(
            work_order=wo,
            status=Quote.Status.APPROVED,
            approved_at=timezone.now(),
        )
        # No items added
        
        result = QuoteFinanceService.process_quote_approved(
            quote=quote,
            publish_event=False,
        )
        
        self.assertTrue(result["success"])
        self.assertEqual(result["transactions_created"], 0)
        self.assertEqual(result["skipped"], 0)
    
    def test_no_cost_center_logs_warning(self):
        """Test that missing cost center logs warning but doesn't fail."""
        from apps.trakledger.models import CostCenter
        
        # Remove all cost centers
        CostCenter.objects.all().delete()
        
        wo = self._create_work_order()
        wo.cost_center = None
        wo.save()
        
        quote = Quote.objects.create(
            work_order=wo,
            status=Quote.Status.APPROVED,
            approved_at=timezone.now(),
        )
        
        QuoteItem.objects.create(
            quote=quote,
            item_type=QuoteItem.ItemType.SERVICE,
            code="SVC-001",
            description="Test",
            quantity=Decimal("1"),
            unit="HH",
            unit_price=Decimal("100.00"),
        )
        quote.recalculate_totals()
        
        # Should succeed but create no transactions
        result = QuoteFinanceService.process_quote_approved(
            quote=quote,
            publish_event=False,
        )
        
        self.assertTrue(result["success"])
        self.assertEqual(result["transactions_created"], 0)
