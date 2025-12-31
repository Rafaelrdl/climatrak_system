"""
Tests for tenant header middleware.
"""

from django.test import RequestFactory, TestCase


class TenantHeaderMiddlewareTests(TestCase):
    """
    Tests for TenantHeaderMiddleware.

    Note: Full integration tests require tenant schemas.
    These tests verify the middleware logic in isolation.
    """

    def setUp(self):
        self.factory = RequestFactory()

    def test_middleware_exempt_paths(self):
        """Test that exempt paths skip tenant validation."""
        from apps.tenants.middleware import TenantHeaderMiddleware

        middleware = TenantHeaderMiddleware(lambda r: r)

        exempt_paths = [
            "/api/auth/login/",
            "/api/auth/register/",
            "/api/auth/token/refresh/",
            "/admin/",
            "/ops/",
        ]

        for path in exempt_paths:
            self.assertTrue(
                middleware._is_exempt_path(path), f"Path {path} should be exempt"
            )

    def test_middleware_non_exempt_paths(self):
        """Test that API paths are not exempt."""
        from apps.tenants.middleware import TenantHeaderMiddleware

        middleware = TenantHeaderMiddleware(lambda r: r)

        non_exempt_paths = [
            "/api/assets/",
            "/api/finance/budgets/",
            "/api/cmms/workorders/",
        ]

        for path in non_exempt_paths:
            self.assertFalse(
                middleware._is_exempt_path(path), f"Path {path} should NOT be exempt"
            )
