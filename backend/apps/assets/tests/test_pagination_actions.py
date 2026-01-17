"""
Tests for paginated list actions in assets viewsets.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import override_settings
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.assets.models import Asset, Device, Site
from apps.assets.views import AssetViewSet, SiteViewSet
from apps.public_identity.models import TenantMembership, compute_email_hash


@override_settings(
    REST_FRAMEWORK={**settings.REST_FRAMEWORK, "PAGE_SIZE": 2}
)
class AssetPaginationActionTests(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()
        User = get_user_model()
        self.user = User.objects.create_user(
            username="pager",
            email="pager@example.com",
            password="testpass123",
        )
        with schema_context("public"):
            TenantMembership.objects.create(
                tenant=self.tenant,
                email_hash=compute_email_hash(self.user.email),
                role="admin",
                status="active",
            )

    def test_site_assets_action_paginates(self):
        site = Site.objects.create(name="Site P")
        Asset.objects.create(tag="A-001", name="Asset 1", site=site, asset_type="AHU")
        Asset.objects.create(tag="A-002", name="Asset 2", site=site, asset_type="AHU")
        Asset.objects.create(tag="A-003", name="Asset 3", site=site, asset_type="AHU")

        request = self.factory.get(f"/api/sites/{site.id}/assets/")
        force_authenticate(request, user=self.user)
        view = SiteViewSet.as_view({"get": "assets"})
        response = view(request, pk=site.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(len(response.data["results"]), 2)

    def test_asset_devices_action_paginates(self):
        site = Site.objects.create(name="Site D")
        asset = Asset.objects.create(
            tag="DEV-001", name="Asset Dev", site=site, asset_type="CHILLER"
        )
        Device.objects.create(
            name="Device 1",
            serial_number="SN-D1",
            asset=asset,
            mqtt_client_id="device-d1",
        )
        Device.objects.create(
            name="Device 2",
            serial_number="SN-D2",
            asset=asset,
            mqtt_client_id="device-d2",
        )
        Device.objects.create(
            name="Device 3",
            serial_number="SN-D3",
            asset=asset,
            mqtt_client_id="device-d3",
        )

        request = self.factory.get(f"/api/assets/{asset.id}/devices/")
        force_authenticate(request, user=self.user)
        view = AssetViewSet.as_view({"get": "devices"})
        response = view(request, pk=asset.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(len(response.data["results"]), 2)
