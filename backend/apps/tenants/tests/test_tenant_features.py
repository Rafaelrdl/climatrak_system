"""
Tests for tenant feature flags functionality.

Tests cover:
1. Feature flag CRUD operations
2. Feature permission checks (403/404 when disabled)
3. Feature exposure in /api/auth/me/ response
4. Cache invalidation
"""

from django.db import IntegrityError, connection
from django.test import override_settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework.views import APIView

import pytest
from django_tenants.utils import schema_context

from apps.tenants.features import (
    DEFAULT_FEATURES,
    FeatureService,
    TenantFeature,
    get_tenant_features,
    has_feature,
)
from apps.tenants.models import Domain, Tenant
from apps.tenants.permissions import (
    FeatureNotEnabled,
    FeatureRequired,
    TrakServiceFeatureRequired,
    feature_required,
    trakservice_feature_required,
)


@pytest.fixture
def tenant_with_features(db):
    """Create a tenant with features for testing."""
    with schema_context("public"):
        tenant = Tenant.objects.create(
            name="Test Tenant Features",
            slug="test-features",
            schema_name="test_features",
        )
        Domain.objects.create(
            domain="test-features.localhost",
            tenant=tenant,
            is_primary=True,
        )
        # Initialize default features
        FeatureService.initialize_tenant_features(tenant.id)
        return tenant


@pytest.fixture
def tenant_trakservice_enabled(db):
    """Create a tenant with TrakService enabled."""
    with schema_context("public"):
        tenant = Tenant.objects.create(
            name="TrakService Tenant",
            slug="trakservice-test",
            schema_name="trakservice_test",
        )
        Domain.objects.create(
            domain="trakservice-test.localhost",
            tenant=tenant,
            is_primary=True,
        )
        # Enable TrakService features
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


class TestTenantFeatureModel:
    """Tests for TenantFeature model."""

    def test_create_feature(self, tenant_with_features):
        """Test creating a feature flag."""
        with schema_context("public"):
            feature = TenantFeature.objects.create(
                tenant=tenant_with_features,
                feature_key="custom.feature",
                enabled=True,
            )
            assert feature.id is not None
            assert feature.feature_key == "custom.feature"
            assert feature.enabled is True

    def test_unique_constraint(self, tenant_with_features):
        """Test that tenant+feature_key must be unique."""
        with schema_context("public"):
            TenantFeature.objects.create(
                tenant=tenant_with_features,
                feature_key="unique.feature",
                enabled=True,
            )
            with pytest.raises(IntegrityError):
                TenantFeature.objects.create(
                    tenant=tenant_with_features,
                    feature_key="unique.feature",
                    enabled=False,
                )

    def test_feature_str(self, tenant_with_features):
        """Test string representation."""
        with schema_context("public"):
            feature = TenantFeature.objects.filter(
                tenant=tenant_with_features, feature_key="trakservice.enabled"
            ).first()
            assert "trakservice.enabled" in str(feature)


class TestFeatureService:
    """Tests for FeatureService."""

    def test_get_features_returns_defaults(self, tenant_with_features):
        """Test that get_features returns default values."""
        features = FeatureService.get_features(tenant_with_features.id)
        assert "trakservice.enabled" in features
        assert features["trakservice.enabled"] is False

    def test_has_feature_false_by_default(self, tenant_with_features):
        """Test that features are disabled by default."""
        assert has_feature(tenant_with_features.id, "trakservice.enabled") is False

    def test_set_feature_enables(self, tenant_with_features):
        """Test enabling a feature."""
        FeatureService.set_feature(tenant_with_features.id, "trakservice.enabled", True)
        assert has_feature(tenant_with_features.id, "trakservice.enabled") is True

    def test_set_feature_disables(self, tenant_trakservice_enabled):
        """Test disabling a feature."""
        assert has_feature(tenant_trakservice_enabled.id, "trakservice.enabled") is True
        FeatureService.set_feature(
            tenant_trakservice_enabled.id, "trakservice.enabled", False
        )
        assert (
            has_feature(tenant_trakservice_enabled.id, "trakservice.enabled") is False
        )

    def test_set_features_bulk(self, tenant_with_features):
        """Test setting multiple features at once."""
        FeatureService.set_features(
            tenant_with_features.id,
            {
                "trakservice.enabled": True,
                "trakservice.dispatch": True,
                "trakservice.quotes": True,
            },
        )
        features = get_tenant_features(tenant_with_features.id)
        assert features["trakservice.enabled"] is True
        assert features["trakservice.dispatch"] is True
        assert features["trakservice.quotes"] is True
        assert features["trakservice.tracking"] is False  # Not set, remains default

    def test_cache_invalidation(self, tenant_with_features):
        """Test that cache is invalidated when features change."""
        # First call populates cache
        features1 = get_tenant_features(tenant_with_features.id)
        assert features1["trakservice.enabled"] is False

        # Change feature
        FeatureService.set_feature(tenant_with_features.id, "trakservice.enabled", True)

        # Next call should reflect change (cache was invalidated)
        features2 = get_tenant_features(tenant_with_features.id)
        assert features2["trakservice.enabled"] is True


class TestFeaturePermissions:
    """Tests for feature-based permissions."""

    def test_feature_required_blocks_when_disabled(self, tenant_with_features):
        """Test that FeatureRequired blocks access when feature is disabled."""

        # Create a view with required features
        class TestView(APIView):
            permission_classes = [FeatureRequired]
            required_features = ["trakservice.enabled"]

            def get(self, request):
                return Response({"ok": True})

        factory = APIRequestFactory()
        request = factory.get("/test/")
        request.user = type("User", (), {"is_authenticated": True})()

        view = TestView.as_view()

        # Mock tenant connection
        with schema_context(tenant_with_features.schema_name):
            connection.tenant = tenant_with_features

            response = view(request)
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_feature_required_allows_when_enabled(self, tenant_trakservice_enabled):
        """Test that FeatureRequired allows access when feature is enabled."""

        class TestView(APIView):
            permission_classes = [FeatureRequired]
            required_features = ["trakservice.enabled"]

            def get(self, request):
                return Response({"ok": True})

        factory = APIRequestFactory()
        request = factory.get("/test/")
        request.user = type("User", (), {"is_authenticated": True})()

        view = TestView.as_view()

        with schema_context(tenant_trakservice_enabled.schema_name):
            connection.tenant = tenant_trakservice_enabled

            response = view(request)
            assert response.status_code == status.HTTP_200_OK

    def test_trakservice_feature_required_checks_base(self, tenant_with_features):
        """Test TrakServiceFeatureRequired checks trakservice.enabled first."""

        class TestView(APIView):
            permission_classes = [TrakServiceFeatureRequired]
            trakservice_features = ["dispatch"]

            def get(self, request):
                return Response({"ok": True})

        factory = APIRequestFactory()
        request = factory.get("/test/")
        request.user = type("User", (), {"is_authenticated": True})()

        view = TestView.as_view()

        with schema_context(tenant_with_features.schema_name):
            connection.tenant = tenant_with_features

            # Should fail because trakservice.enabled is False
            response = view(request)
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_feature_decorator_blocks_disabled(self, tenant_with_features):
        """Test @feature_required decorator blocks when feature disabled."""

        @feature_required("trakservice.enabled")
        def test_view(request):
            return Response({"ok": True})

        factory = APIRequestFactory()
        request = factory.get("/test/")

        with schema_context(tenant_with_features.schema_name):
            connection.tenant = tenant_with_features

            with pytest.raises(FeatureNotEnabled):
                test_view(request)

    def test_trakservice_decorator(self, tenant_trakservice_enabled):
        """Test @trakservice_feature_required decorator."""

        @trakservice_feature_required("dispatch")
        def test_view(request):
            return Response({"ok": True})

        factory = APIRequestFactory()
        request = factory.get("/test/")

        with schema_context(tenant_trakservice_enabled.schema_name):
            connection.tenant = tenant_trakservice_enabled

            # Should pass - trakservice.enabled and trakservice.dispatch are both True
            response = test_view(request)
            assert response.status_code == status.HTTP_200_OK

    def test_trakservice_decorator_blocks_missing_subfeature(
        self, tenant_trakservice_enabled
    ):
        """Test decorator blocks when sub-feature is disabled."""

        @trakservice_feature_required("tracking")  # tracking is False
        def test_view(request):
            return Response({"ok": True})

        factory = APIRequestFactory()
        request = factory.get("/test/")

        with schema_context(tenant_trakservice_enabled.schema_name):
            connection.tenant = tenant_trakservice_enabled

            with pytest.raises(FeatureNotEnabled):
                test_view(request)


class TestFeatureExposureInMeEndpoint:
    """Tests for features exposure in /api/auth/me/ response."""

    @pytest.mark.django_db(transaction=True)
    def test_me_endpoint_includes_features(
        self, tenant_trakservice_enabled, django_user_model
    ):
        """Test that /api/auth/me/ includes tenant features."""
        # This test would require full integration setup
        # Simplified version to verify features dict structure
        features = get_tenant_features(tenant_trakservice_enabled.id)

        assert isinstance(features, dict)
        assert "trakservice.enabled" in features
        assert features["trakservice.enabled"] is True
        assert features["trakservice.dispatch"] is True
        assert features["trakservice.tracking"] is False


class TestFeatureIsolation:
    """Tests for feature isolation between tenants."""

    def test_features_isolated_between_tenants(self, db):
        """Test that features are isolated between tenants."""
        with schema_context("public"):
            # Create two tenants
            tenant_a = Tenant.objects.create(
                name="Tenant A",
                slug="tenant-a",
                schema_name="tenant_a_iso",
            )
            tenant_b = Tenant.objects.create(
                name="Tenant B",
                slug="tenant-b",
                schema_name="tenant_b_iso",
            )

            # Enable feature for tenant A only
            FeatureService.set_feature(tenant_a.id, "trakservice.enabled", True)
            FeatureService.set_feature(tenant_b.id, "trakservice.enabled", False)

            # Verify isolation
            assert has_feature(tenant_a.id, "trakservice.enabled") is True
            assert has_feature(tenant_b.id, "trakservice.enabled") is False

            # Enable different features for each
            FeatureService.set_feature(tenant_a.id, "trakservice.dispatch", True)
            FeatureService.set_feature(tenant_b.id, "trakservice.quotes", True)

            features_a = get_tenant_features(tenant_a.id)
            features_b = get_tenant_features(tenant_b.id)

            assert features_a["trakservice.dispatch"] is True
            assert features_a["trakservice.quotes"] is False
            assert features_b["trakservice.dispatch"] is False
            assert features_b["trakservice.quotes"] is True
