"""
Tests for assets Celery tasks.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase

from apps.assets.models import Asset, Device, Site
from apps.assets.tasks import calculate_device_availability


class DeviceAvailabilityTaskTests(TenantTestCase):
    def setUp(self):
        super().setUp()
        User = get_user_model()
        self.user = User.objects.create_user(
            username="avail",
            email="avail@example.com",
            password="testpass123",
        )
        self.site = Site.objects.create(name="Availability Site")
        self.asset = Asset.objects.create(
            tag="AVAIL-001",
            name="Availability Asset",
            site=self.site,
            asset_type="CHILLER",
        )

    def test_calculate_device_availability_updates_values(self):
        now = timezone.now()
        device_online = Device.objects.create(
            name="Device Online",
            serial_number="SN-ON",
            asset=self.asset,
            mqtt_client_id="device-online",
            status="ONLINE",
            last_seen=now - timedelta(minutes=30),
            availability=0.0,
        )
        device_offline = Device.objects.create(
            name="Device Offline",
            serial_number="SN-OFF",
            asset=self.asset,
            mqtt_client_id="device-offline",
            status="OFFLINE",
            last_seen=now - timedelta(hours=2),
            availability=100.0,
        )

        calculate_device_availability()

        device_online.refresh_from_db()
        device_offline.refresh_from_db()
        self.assertEqual(device_online.availability, 100.0)
        self.assertEqual(device_offline.availability, 80.0)
