"""
Tests for ingest authentication (HMAC + anti-replay).
"""

import hashlib
import hmac
import json
import time

from django.core.cache import cache
from django.test import override_settings
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from rest_framework.test import APIRequestFactory

from apps.assets.models import Asset, Device, Site
from apps.ingest.views import IngestView
from apps.tenants.models import Tenant


class IngestAuthTests(TenantTestCase):
    def setUp(self):
        super().setUp()
        cache.clear()

        with schema_context("public"):
            self.tenant = Tenant.objects.create(
                name="Ingest Tenant", slug="ingest-tenant"
            )

        with schema_context(self.tenant.schema_name):
            site = Site.objects.create(name="Site A")
            asset = Asset.objects.create(tag="ASSET-001", site=site, asset_type="CHILLER")
            self.device = Device.objects.create(
                name="Gateway A",
                serial_number="SN-INGEST-001",
                asset=asset,
                mqtt_client_id="device-001",
                device_type="GATEWAY",
            )

        self.view = IngestView()
        self.factory = APIRequestFactory()

    def _build_body(self):
        payload = {
            "client_id": self.device.mqtt_client_id,
            "topic": f"tenants/{self.tenant.slug}/sites/SITE/assets/ASSET-001/telemetry",
            "payload": {"value": 10.0, "unit": "celsius"},
            "ts": int(time.time() * 1000),
        }
        return json.dumps(payload)

    def _sign(self, body, timestamp):
        message = f"{timestamp}.".encode("utf-8") + body.encode("utf-8")
        return hmac.new(
            self.device.ingest_secret.encode("utf-8"),
            message,
            hashlib.sha256,
        ).hexdigest()

    @override_settings(INGEST_ALLOW_GLOBAL_SECRET=False)
    def test_valid_signature(self):
        body = self._build_body()
        timestamp = int(time.time())
        signature = self._sign(body, timestamp)

        request = self.factory.post(
            "/ingest/",
            data=body,
            content_type="application/json",
            HTTP_X_INGEST_TIMESTAMP=str(timestamp),
            HTTP_X_INGEST_SIGNATURE=signature,
        )

        response = self.view._authenticate_ingest_request(
            request=request,
            tenant=self.tenant,
            device_id=self.device.mqtt_client_id,
            raw_body=body.encode("utf-8"),
        )

        self.assertIsNone(response)

    def test_invalid_signature(self):
        body = self._build_body()
        timestamp = int(time.time())

        request = self.factory.post(
            "/ingest/",
            data=body,
            content_type="application/json",
            HTTP_X_INGEST_TIMESTAMP=str(timestamp),
            HTTP_X_INGEST_SIGNATURE="invalid",
        )

        response = self.view._authenticate_ingest_request(
            request=request,
            tenant=self.tenant,
            device_id=self.device.mqtt_client_id,
            raw_body=body.encode("utf-8"),
        )

        self.assertEqual(response.status_code, 401)

    def test_expired_timestamp(self):
        body = self._build_body()
        timestamp = int(time.time()) - 9999
        signature = self._sign(body, timestamp)

        request = self.factory.post(
            "/ingest/",
            data=body,
            content_type="application/json",
            HTTP_X_INGEST_TIMESTAMP=str(timestamp),
            HTTP_X_INGEST_SIGNATURE=signature,
        )

        response = self.view._authenticate_ingest_request(
            request=request,
            tenant=self.tenant,
            device_id=self.device.mqtt_client_id,
            raw_body=body.encode("utf-8"),
        )

        self.assertEqual(response.status_code, 401)

    def test_replay_detected(self):
        body = self._build_body()
        timestamp = int(time.time())
        signature = self._sign(body, timestamp)

        request = self.factory.post(
            "/ingest/",
            data=body,
            content_type="application/json",
            HTTP_X_INGEST_TIMESTAMP=str(timestamp),
            HTTP_X_INGEST_SIGNATURE=signature,
        )

        response1 = self.view._authenticate_ingest_request(
            request=request,
            tenant=self.tenant,
            device_id=self.device.mqtt_client_id,
            raw_body=body.encode("utf-8"),
        )
        self.assertIsNone(response1)

        response2 = self.view._authenticate_ingest_request(
            request=request,
            tenant=self.tenant,
            device_id=self.device.mqtt_client_id,
            raw_body=body.encode("utf-8"),
        )
        self.assertEqual(response2.status_code, 409)
