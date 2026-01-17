"""
Tests for /api/assets/complete/ optimizations.
"""

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.alerts.models import Alert
from apps.assets.models import Asset, Device, Sensor, Site
from apps.assets.views import AssetViewSet
from apps.ingest.models import Reading
from apps.public_identity.models import TenantMembership, compute_email_hash


class AssetCompleteTests(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()
        User = get_user_model()
        self.user = User.objects.create_user(
            username="assetuser",
            email="assetuser@example.com",
            password="testpass123",
        )
        with schema_context("public"):
            TenantMembership.objects.create(
                tenant=self.tenant,
                email_hash=compute_email_hash(self.user.email),
                role="admin",
                status="active",
            )

    def test_complete_returns_latest_readings_and_alert_count(self):
        site = Site.objects.create(name="Site A")
        asset = Asset.objects.create(
            tag="ASSET-001",
            name="Asset 1",
            site=site,
            asset_type="CHILLER",
        )
        device = Device.objects.create(
            name="Device 1",
            serial_number="SN-001",
            asset=asset,
            mqtt_client_id="device-001",
            status="ONLINE",
        )
        sensor = Sensor.objects.create(
            tag="SENSOR-TEMP-001",
            device=device,
            metric_type="temp_supply",
            unit="C",
            is_active=True,
        )
        Reading.objects.create(
            device_id=device.mqtt_client_id,
            sensor_id=sensor.tag,
            asset_tag=asset.tag,
            value=22.5,
            ts=timezone.now(),
        )
        Alert.objects.create(
            message="Temp high",
            severity="HIGH",
            asset_tag=asset.tag,
            parameter_key=sensor.tag,
            parameter_value=30.0,
            threshold=25.0,
            resolved=False,
            acknowledged=False,
        )

        request = self.factory.get("/api/assets/complete/")
        force_authenticate(request, user=self.user)
        view = AssetViewSet.as_view({"get": "complete"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["count"], 1)
        asset_data = response.data["results"][0]
        self.assertEqual(asset_data["alert_count"], 1)
        self.assertIn("temp_supply", asset_data["latest_readings"])
        self.assertEqual(
            asset_data["latest_readings"]["temp_supply"]["value"], 22.5
        )
