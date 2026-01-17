"""
Tests for TrakService API endpoints.

Tests cover:
1. Feature gating (403 when trakservice.enabled is False)
2. Meta endpoint returns correct data
3. Health endpoint returns correct data
"""

from django.db import connection
from rest_framework import status
from django.test import TestCase
from rest_framework.test import APIClient, APIRequestFactory
from django_tenants.utils import schema_context

from apps.tenants.features import FeatureService, TenantFeature
from apps.tenants.models import Domain, Tenant
from apps.trakservice.services import TrakServiceMetaService
from apps.trakservice.views import TrakServiceHealthView, TrakServiceMetaView


def create_tenant_without_trakservice() -> Tenant:
    """Create a tenant without TrakService enabled."""
    with schema_context("public"):
        tenant = Tenant.objects.create(
            name="No TrakService Tenant",
            slug="no-trakservice",
            schema_name="no_trakservice_test",
        )
        Domain.objects.create(
            domain="no-trakservice.localhost",
            tenant=tenant,
            is_primary=True,
        )
        FeatureService.initialize_tenant_features(tenant.id)
        return tenant


def create_tenant_with_trakservice() -> Tenant:
    """Create a tenant with TrakService enabled."""
    with schema_context("public"):
        tenant = Tenant.objects.create(
            name="TrakService Tenant",
            slug="with-trakservice",
            schema_name="with_trakservice_test",
        )
        Domain.objects.create(
            domain="with-trakservice.localhost",
            tenant=tenant,
            is_primary=True,
        )
        FeatureService.set_features(
            tenant.id,
            {
                "trakservice.enabled": True,
                "trakservice.dispatch": True,
                "trakservice.tracking": False,
                "trakservice.routing": False,
                "trakservice.km": False,
                "trakservice.quotes": False,
            },
        )
        return tenant


class TestTrakServiceFeatureGating(TestCase):
    """Tests for TrakService feature gating."""

    def test_meta_endpoint_blocked_when_disabled(self):
        """Test that _meta endpoint returns 403 when TrakService is disabled."""
        tenant_without_trakservice = create_tenant_without_trakservice()
        factory = APIRequestFactory()
        request = factory.get("/api/trakservice/_meta/")
        request.user = type("User", (), {"is_authenticated": True})()

        view = TrakServiceMetaView.as_view()

        with schema_context(tenant_without_trakservice.schema_name):
            connection.tenant = tenant_without_trakservice
            response = view(request)
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_meta_endpoint_allowed_when_enabled(self):
        """Test that _meta endpoint returns 200 when TrakService is enabled."""
        tenant_with_trakservice = create_tenant_with_trakservice()
        factory = APIRequestFactory()
        request = factory.get("/api/trakservice/_meta/")
        request.user = type("User", (), {"is_authenticated": True})()

        view = TrakServiceMetaView.as_view()

        with schema_context(tenant_with_trakservice.schema_name):
            connection.tenant = tenant_with_trakservice
            response = view(request)
            assert response.status_code == status.HTTP_200_OK

    def test_health_endpoint_blocked_when_disabled(self):
        """Test that _health endpoint returns 403 when TrakService is disabled."""
        tenant_without_trakservice = create_tenant_without_trakservice()
        factory = APIRequestFactory()
        request = factory.get("/api/trakservice/_health/")
        request.user = type("User", (), {"is_authenticated": True})()

        view = TrakServiceHealthView.as_view()

        with schema_context(tenant_without_trakservice.schema_name):
            connection.tenant = tenant_without_trakservice
            response = view(request)
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_health_endpoint_allowed_when_enabled(self):
        """Test that _health endpoint returns 200 when TrakService is enabled."""
        tenant_with_trakservice = create_tenant_with_trakservice()
        factory = APIRequestFactory()
        request = factory.get("/api/trakservice/_health/")
        request.user = type("User", (), {"is_authenticated": True})()

        view = TrakServiceHealthView.as_view()

        with schema_context(tenant_with_trakservice.schema_name):
            connection.tenant = tenant_with_trakservice
            response = view(request)
            assert response.status_code == status.HTTP_200_OK


class TestTrakServiceMetaEndpoint(TestCase):
    """Tests for TrakService _meta endpoint."""

    def test_meta_returns_module_info(self):
        """Test that _meta returns correct module information."""
        tenant_with_trakservice = create_tenant_with_trakservice()
        factory = APIRequestFactory()
        request = factory.get("/api/trakservice/_meta/")
        request.user = type("User", (), {"is_authenticated": True})()

        view = TrakServiceMetaView.as_view()

        with schema_context(tenant_with_trakservice.schema_name):
            connection.tenant = tenant_with_trakservice
            response = view(request)

            assert response.status_code == status.HTTP_200_OK
            data = response.data

            assert data["module"] == "trakservice"
            assert data["version"] == "1.0.0"
            assert data["status"] == "operational"
            assert "features" in data
            assert data["features"]["trakservice.enabled"] is True
            assert data["features"]["trakservice.dispatch"] is True
            assert data["features"]["trakservice.tracking"] is False


class TestTrakServiceHealthEndpoint(TestCase):
    """Tests for TrakService _health endpoint."""

    def test_health_returns_status(self):
        """Test that _health returns correct health status."""
        tenant_with_trakservice = create_tenant_with_trakservice()
        factory = APIRequestFactory()
        request = factory.get("/api/trakservice/_health/")
        request.user = type("User", (), {"is_authenticated": True})()

        view = TrakServiceHealthView.as_view()

        with schema_context(tenant_with_trakservice.schema_name):
            connection.tenant = tenant_with_trakservice
            response = view(request)

            assert response.status_code == status.HTTP_200_OK
            data = response.data

            assert data["status"] == "healthy"
            assert "timestamp" in data
            assert data["tenant_id"] == tenant_with_trakservice.id
            assert "features_enabled" in data
            assert "trakservice.enabled" in data["features_enabled"]
            assert "trakservice.dispatch" in data["features_enabled"]


class TestTrakServiceMetaService(TestCase):
    """Tests for TrakServiceMetaService."""

    def test_get_enabled_features(self):
        """Test that get_enabled_features returns correct list."""
        tenant_with_trakservice = create_tenant_with_trakservice()
        with schema_context(tenant_with_trakservice.schema_name):
            connection.tenant = tenant_with_trakservice

            from apps.trakservice.services import TrakServiceBaseService

            enabled = TrakServiceBaseService.get_enabled_features()

            assert "trakservice.enabled" in enabled
            assert "trakservice.dispatch" in enabled
            assert "trakservice.tracking" not in enabled
            assert "trakservice.routing" not in enabled

    def test_get_meta_data(self):
        """Test that get_meta returns correct structure."""
        tenant_with_trakservice = create_tenant_with_trakservice()
        with schema_context(tenant_with_trakservice.schema_name):
            connection.tenant = tenant_with_trakservice

            meta = TrakServiceMetaService.get_meta()

            assert meta["module"] == "trakservice"
            assert meta["version"] == "1.0.0"
            assert meta["status"] == "operational"
            assert isinstance(meta["features"], dict)

    def test_get_health_data(self):
        """Test that get_health returns correct structure."""
        tenant_with_trakservice = create_tenant_with_trakservice()
        with schema_context(tenant_with_trakservice.schema_name):
            connection.tenant = tenant_with_trakservice

            health = TrakServiceMetaService.get_health()

            assert health["status"] == "healthy"
            assert health["tenant_id"] == tenant_with_trakservice.id
            assert isinstance(health["features_enabled"], list)
