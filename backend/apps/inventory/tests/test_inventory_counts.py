"""
Tests for inventory count serializers.
"""

from django.contrib.auth import get_user_model
from django_tenants.test.cases import TenantTestCase

from apps.inventory.models import InventoryCategory, InventoryCount, InventoryCountItem, InventoryItem
from apps.inventory.serializers import InventoryCountSerializer


class InventoryCountDiscrepancyTests(TenantTestCase):
    def setUp(self):
        super().setUp()
        User = get_user_model()
        self.user = User.objects.create_user(
            username="invcount",
            email="invcount@example.com",
            password="testpass123",
        )
        self.category = InventoryCategory.objects.create(
            name="Category",
            code="CAT",
        )
        self.item_ok = InventoryItem.objects.create(
            code="ITEM-OK",
            name="Item OK",
            category=self.category,
            unit="UN",
        )
        self.item_bad = InventoryItem.objects.create(
            code="ITEM-BAD",
            name="Item Bad",
            category=self.category,
            unit="UN",
        )
        self.item_pending = InventoryItem.objects.create(
            code="ITEM-PENDING",
            name="Item Pending",
            category=self.category,
            unit="UN",
        )

    def test_discrepancy_count_counts_only_mismatched_items(self):
        count = InventoryCount.objects.create(name="Count 1", created_by=self.user)
        InventoryCountItem.objects.create(
            count=count,
            item=self.item_ok,
            expected_quantity=10,
            counted_quantity=10,
            is_counted=True,
        )
        InventoryCountItem.objects.create(
            count=count,
            item=self.item_bad,
            expected_quantity=5,
            counted_quantity=3,
            is_counted=True,
        )
        InventoryCountItem.objects.create(
            count=count,
            item=self.item_pending,
            expected_quantity=2,
            counted_quantity=None,
            is_counted=False,
        )

        data = InventoryCountSerializer(count).data
        self.assertEqual(data["discrepancy_count"], 1)
