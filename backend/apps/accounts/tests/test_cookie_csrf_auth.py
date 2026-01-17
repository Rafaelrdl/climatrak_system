"""
Tests for CSRF enforcement with JWT cookie authentication.
"""

from django.contrib.auth import get_user_model
from django.middleware.csrf import _get_new_csrf_token
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIRequestFactory
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.authentication import JWTCookieAuthentication
from apps.public_identity.models import TenantMembership, compute_email_hash


class JWTCookieCSRFAuthTests(TenantTestCase):
    def setUp(self):
        super().setUp()
        User = get_user_model()
        self.user = User.objects.create_user(
            username="csrf_user",
            email="csrf_user@example.com",
            password="testpass123",
        )

        with schema_context("public"):
            TenantMembership.objects.create(
                tenant=self.tenant,
                email_hash=compute_email_hash(self.user.email),
                role="admin",
                status="active",
            )

        refresh = RefreshToken.for_user(self.user)
        refresh["tenant_schema"] = self.tenant.schema_name
        self.access_token = str(refresh.access_token)

        self.factory = APIRequestFactory()
        self.auth = JWTCookieAuthentication()

    def _build_request(self, method="post", include_csrf=False):
        request = getattr(self.factory, method)("/api/sites/", data={})
        request.COOKIES["access_token"] = self.access_token

        if include_csrf:
            token = _get_new_csrf_token()
            request.COOKIES["csrftoken"] = token
            request.META["HTTP_X_CSRFTOKEN"] = token

        return request

    def test_cookie_auth_requires_csrf_for_mutating_requests(self):
        request = self._build_request(include_csrf=False)

        with self.assertRaises(AuthenticationFailed) as exc:
            self.auth.authenticate(request)

        self.assertEqual(exc.exception.get_codes(), "csrf_failed")

    def test_cookie_auth_accepts_valid_csrf(self):
        request = self._build_request(include_csrf=True)

        user, _token = self.auth.authenticate(request)

        self.assertEqual(user.id, self.user.id)
