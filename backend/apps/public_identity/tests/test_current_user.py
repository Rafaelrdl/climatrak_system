"""
Tests for /api/v2/auth/me/ resolving tenant from JWT token.
"""

from django.contrib.auth import get_user_model
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIRequestFactory
from rest_framework_simplejwt.tokens import RefreshToken

from apps.public_identity.models import TenantMembership, compute_email_hash
from apps.public_identity.views import CurrentUserView


class CurrentUserViewTests(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()

        User = get_user_model()
        with schema_context(self.tenant.schema_name):
            self.user = User.objects.create_user(
                username="current_user",
                email="current_user@example.com",
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

    def test_me_uses_token_schema(self):
        request = self.factory.get("/api/v2/auth/me/")
        request.COOKIES["access_token"] = self.access_token

        response = CurrentUserView.as_view()(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["tenant"]["schema_name"], self.tenant.schema_name)
