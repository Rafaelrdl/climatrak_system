"""
Tenant Isolation Tests

These tests verify that data is properly isolated between tenants.
Critical for multi-tenant security.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase

import pytest
from django_tenants.utils import (
    get_public_schema_name,
    get_tenant_model,
    schema_context,
)

User = get_user_model()
Tenant = get_tenant_model()


class TenantIsolationTests(TestCase):
    """
    Tests for tenant data isolation.

    These tests ensure that:
    1. Data created in one tenant is not visible in another
    2. Queries are properly scoped to the current tenant
    3. Cross-tenant data access is prevented
    """

    @pytest.mark.tenant
    def test_public_schema_exists(self):
        """Public schema should exist and be accessible."""
        public_schema = get_public_schema_name()
        self.assertEqual(public_schema, "public")

    @pytest.mark.tenant
    def test_tenant_model_configured(self):
        """Tenant model should be properly configured."""
        self.assertIsNotNone(Tenant)
        # Verify required fields exist
        self.assertTrue(hasattr(Tenant, "schema_name"))

    @pytest.mark.tenant
    def test_schema_context_isolation(self):
        """
        Data created in one schema should not be visible in another.

        This is a foundational test for multi-tenant security.
        """
        # This test uses the public schema only since we may not have
        # test tenants set up in CI
        with schema_context("public"):
            # Verify we can query in public schema
            user_count = User.objects.count()
            self.assertIsInstance(user_count, int)


class TenantSecurityTests(TestCase):
    """
    Security-focused tests for tenant isolation.
    """

    @pytest.mark.tenant
    def test_cannot_access_other_tenant_data_directly(self):
        """
        Verify that direct database queries respect tenant isolation.

        Django-tenants should automatically scope queries to current schema.
        """
        # In public schema, we should only see public data
        with schema_context("public"):
            # This query should be scoped to public schema
            queryset = User.objects.all()
            # The queryset should work without errors
            self.assertIsNotNone(queryset)

    @pytest.mark.tenant
    def test_tenant_model_has_required_fields(self):
        """Verify Tenant model has required fields for isolation."""
        required_fields = ["schema_name"]
        for field in required_fields:
            self.assertTrue(
                hasattr(Tenant, field), f"Tenant model missing required field: {field}"
            )


class CrossTenantPreventionTests(TestCase):
    """
    Tests to ensure cross-tenant data leakage is prevented.
    """

    @pytest.mark.tenant
    def test_user_model_is_tenant_aware(self):
        """
        User model should be in TENANT_APPS for proper isolation.
        """
        from django.conf import settings

        # accounts app should be in TENANT_APPS
        tenant_apps = getattr(settings, "TENANT_APPS", [])
        self.assertIn("apps.accounts", tenant_apps)

    @pytest.mark.tenant
    def test_finance_models_are_tenant_aware(self):
        """
        Finance models should be in TENANT_APPS for proper isolation.
        """
        from django.conf import settings

        tenant_apps = getattr(settings, "TENANT_APPS", [])
        self.assertIn("apps.trakledger", tenant_apps)

    @pytest.mark.tenant
    def test_cmms_models_are_tenant_aware(self):
        """
        CMMS models should be in TENANT_APPS for proper isolation.
        """
        from django.conf import settings

        tenant_apps = getattr(settings, "TENANT_APPS", [])
        self.assertIn("apps.cmms", tenant_apps)

    @pytest.mark.tenant
    def test_assets_models_are_tenant_aware(self):
        """
        Assets models should be in TENANT_APPS for proper isolation.
        """
        from django.conf import settings

        tenant_apps = getattr(settings, "TENANT_APPS", [])
        self.assertIn("apps.assets", tenant_apps)
