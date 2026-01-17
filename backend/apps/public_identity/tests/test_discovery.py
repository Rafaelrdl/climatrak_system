"""
Tests for tenant discovery endpoint neutrality and throttling.
"""

from django.conf import settings
from django.core.cache import cache
from django.test import override_settings
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIRequestFactory

from apps.public_identity.models import TenantMembership, TenantUserIndex, compute_email_hash
from apps.public_identity.views import TenantDiscoveryView


class TenantDiscoveryTests(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()
        self.view = TenantDiscoveryView.as_view()

    def _post(self, email, ip="127.0.0.1"):
        request = self.factory.post(
            "/api/v2/auth/discover-tenant/", {"email": email}, format="json"
        )
        request.META["REMOTE_ADDR"] = ip
        return self.view(request)

    def test_discovery_response_is_neutral(self):
        email = "member@example.com"

        with schema_context("public"):
            TenantMembership.objects.create(
                tenant=self.tenant,
                email_hash=compute_email_hash(email),
                role="admin",
                status="active",
            )
            TenantUserIndex.objects.create(
                tenant=self.tenant,
                identifier_hash=TenantUserIndex.compute_hash(email),
                is_active=True,
            )

        existing = self._post(email)
        missing = self._post("missing@example.com")

        self.assertEqual(existing.status_code, status.HTTP_200_OK)
        self.assertEqual(missing.status_code, status.HTTP_200_OK)
        for key in ["found", "primary_tenant", "has_multiple_tenants", "message"]:
            self.assertEqual(existing.data[key], missing.data[key])

    @override_settings(
        REST_FRAMEWORK={
            **settings.REST_FRAMEWORK,
            "DEFAULT_THROTTLE_RATES": {"tenant_discovery": "2/min"},
        }
    )
    def test_discovery_throttles_requests(self):
        cache.clear()
        email = "throttle@example.com"

        response_1 = self._post(email, ip="10.0.0.1")
        response_2 = self._post(email, ip="10.0.0.1")
        response_3 = self._post(email, ip="10.0.0.1")

        self.assertEqual(response_1.status_code, status.HTTP_200_OK)
        self.assertEqual(response_2.status_code, status.HTTP_200_OK)
        self.assertEqual(response_3.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
