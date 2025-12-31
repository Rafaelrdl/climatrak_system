"""
Views for public_identity app.

This module provides the centralized authentication endpoints
that work across all tenants.

Main endpoints:
- POST /api/auth/login/          - Centralized login
- POST /api/auth/select-tenant/  - Select tenant when user has multiple
- POST /api/auth/logout/         - Logout (invalidate cookies)
- GET  /api/auth/me/             - Get current user info
"""

import logging
from datetime import timedelta

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django_tenants.utils import schema_context

from apps.tenants.models import Domain

from .models import TenantMembership, TenantUserIndex, compute_email_hash
from .serializers import LoginSerializer, SelectTenantSerializer
from .services import TenantAuthService

logger = logging.getLogger(__name__)


# Cookie settings
COOKIE_SECURE = not settings.DEBUG
COOKIE_HTTPONLY = True
COOKIE_SAMESITE = "Lax"
COOKIE_PATH = "/"

# Token lifetimes
ACCESS_TOKEN_LIFETIME = timedelta(minutes=15)
REFRESH_TOKEN_LIFETIME = timedelta(days=7)


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """
    Set authentication cookies on the response.

    Uses HttpOnly cookies for security (prevents XSS attacks).
    """
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=int(ACCESS_TOKEN_LIFETIME.total_seconds()),
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path=COOKIE_PATH,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=int(REFRESH_TOKEN_LIFETIME.total_seconds()),
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path=COOKIE_PATH,
    )


def clear_auth_cookies(response: Response):
    """Clear authentication cookies."""
    response.delete_cookie("access_token", path=COOKIE_PATH)
    response.delete_cookie("refresh_token", path=COOKIE_PATH)


class TenantDiscoveryView(APIView):
    """
    Tenant discovery endpoint using public index (email hash only).

    POST /api/v2/auth/discover-tenant/
    {
        "email": "user@example.com"
    }
    """

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()

        if not email:
            return Response(
                {"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        with schema_context("public"):
            email_hash = compute_email_hash(email)
            memberships = list(
                TenantMembership.objects.filter(email_hash=email_hash)
                .select_related("tenant")
                .order_by("-joined_at")
            )
            active_memberships = [m for m in memberships if m.status == "active"]

            if active_memberships:
                entries = active_memberships
            elif memberships:
                return Response(
                    {
                        "found": False,
                        "email": email,
                        "message": "Nenhuma conta encontrada com este email.",
                    }
                )
            else:
                index_entries = list(
                    TenantUserIndex.find_tenants_for_email(email)
                    .select_related("tenant")
                    .order_by("-updated_at", "-created_at")
                )
                if not index_entries:
                    return Response(
                        {
                            "found": False,
                            "email": email,
                            "message": "Nenhuma conta encontrada com este email.",
                        }
                    )
                entries = index_entries

            tenants = [entry.tenant for entry in entries]
            domains = Domain.objects.filter(tenant__in=tenants).order_by(
                "-is_primary", "domain"
            )
            domain_map = {}
            for domain in domains:
                if domain.tenant_id not in domain_map:
                    domain_map[domain.tenant_id] = domain.domain

            tenants_data = []
            for entry in entries:
                tenant = entry.tenant
                tenants_data.append(
                    {
                        "schema_name": tenant.schema_name,
                        "slug": tenant.slug,
                        "name": tenant.name,
                        "domain": domain_map.get(tenant.id),
                    }
                )

            primary_tenant = tenants_data[0]

            return Response(
                {
                    "found": True,
                    "email": email,
                    "tenants": tenants_data,
                    "primary_tenant": primary_tenant,
                    "has_multiple_tenants": len(tenants_data) > 1,
                }
            )


class CentralizedLoginView(APIView):
    """
    Centralized login endpoint.

    POST /api/auth/login/

    Request body:
        {
            "email": "user@example.com",
            "password": "secret123"
        }

    Response (single tenant):
        {
            "success": true,
            "user": {
                "id": 1,
                "email": "user@example.com",
                "full_name": "John Doe",
                "avatar": null
            },
            "tenant": {
                "id": 1,
                "schema_name": "tenant_acme",
                "name": "ACME Corp",
                "slug": "acme",
                "role": "admin"
            }
        }

    Response (multiple tenants):
        {
            "success": true,
            "requires_tenant_selection": true,
            "tenants": [
                {
                    "id": 1,
                    "schema_name": "tenant_acme",
                    "name": "ACME Corp",
                    "slug": "acme",
                    "role": "admin"
                },
                {
                    "id": 2,
                    "schema_name": "tenant_beta",
                    "name": "Beta Inc",
                    "slug": "beta",
                    "role": "viewer"
                }
            ]
        }

    Security:
    - Passwords are validated INSIDE tenant schemas, never in public schema
    - JWT tokens are set as HttpOnly cookies (XSS protection)
    - Tenant list is only revealed after successful authentication
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        # Perform centralized login
        result = TenantAuthService.login(email, password)

        if not result.success:
            return Response(
                {"success": False, "error": result.error},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Check if user has multiple tenants
        if len(result.authenticated_tenants) > 1 and not result.selected_tenant:
            # Multiple tenants - user needs to select one
            tenants_data = [
                {
                    "id": t.tenant_id,
                    "schema_name": t.schema_name,
                    "name": t.name,
                    "slug": t.slug,
                    "role": t.role,
                }
                for t in result.authenticated_tenants
            ]

            response = Response(
                {
                    "success": True,
                    "requires_tenant_selection": True,
                    "tenants": tenants_data,
                }
            )

            # Still set cookies for the first tenant (can be overridden by select-tenant)
            set_auth_cookies(response, result.access_token, result.refresh_token)

            return response

        # Single tenant or already selected
        tenant = result.selected_tenant or result.authenticated_tenants[0]

        response_data = {
            "success": True,
            "user": {
                "id": tenant.user_id,
                "email": tenant.user_email,
                "full_name": tenant.user_full_name,
                "avatar": tenant.user_avatar,
            },
            "tenant": {
                "id": tenant.tenant_id,
                "schema_name": tenant.schema_name,
                "name": tenant.name,
                "slug": tenant.slug,
                "role": tenant.role,
            },
        }

        response = Response(response_data)
        set_auth_cookies(response, result.access_token, result.refresh_token)

        logger.info(f"Login successful: {email} -> {tenant.schema_name}")

        return response


class SelectTenantView(APIView):
    """
    Select a specific tenant after login.

    POST /api/auth/select-tenant/

    Request body:
        {
            "email": "user@example.com",
            "password": "secret123",
            "schema_name": "tenant_acme"
        }

    Response:
        {
            "success": true,
            "user": {...},
            "tenant": {...}
        }

    Note: This re-authenticates the user in the selected tenant.
    We require email/password again for security (can't trust client-side state).
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SelectTenantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        schema_name = serializer.validated_data["schema_name"]

        # Authenticate in the selected tenant
        result = TenantAuthService.select_tenant(email, password, schema_name)

        if not result.success:
            return Response(
                {"success": False, "error": result.error},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        tenant = result.selected_tenant

        response_data = {
            "success": True,
            "user": {
                "id": tenant.user_id,
                "email": tenant.user_email,
                "full_name": tenant.user_full_name,
                "avatar": tenant.user_avatar,
            },
            "tenant": {
                "id": tenant.tenant_id,
                "schema_name": tenant.schema_name,
                "name": tenant.name,
                "slug": tenant.slug,
                "role": tenant.role,
            },
        }

        response = Response(response_data)
        set_auth_cookies(response, result.access_token, result.refresh_token)

        logger.info(f"Tenant selected: {email} -> {schema_name}")

        return response


class LogoutView(APIView):
    """
    Logout endpoint.

    POST /api/auth/logout/

    Clears authentication cookies.
    """

    permission_classes = [AllowAny]  # Allow even if token is invalid

    def post(self, request):
        response = Response(
            {"success": True, "message": "Logout realizado com sucesso."}
        )
        clear_auth_cookies(response)
        return response


class CurrentUserView(APIView):
    """
    Get current authenticated user info.

    GET /api/auth/me/

    Response:
        {
            "user": {
                "id": 1,
                "email": "user@example.com",
                "full_name": "John Doe",
                "avatar": null,
                "is_staff": false
            },
            "tenant": {
                "id": 1,
                "schema_name": "tenant_acme",
                "name": "ACME Corp",
                "slug": "acme",
                "role": "admin"
            }
        }
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Get current tenant from connection
        from django.db import connection

        tenant = getattr(connection, "tenant", None)

        if not tenant or connection.schema_name == "public":
            return Response(
                {"error": "Tenant não identificado"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Get role from TenantMembership
        role = TenantAuthService._get_user_role(user.email, tenant)

        response_data = {
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": getattr(user, "full_name", "") or user.email,
                "avatar": getattr(user, "avatar", None),
                "is_staff": user.is_staff,
            },
            "tenant": {
                "id": tenant.id,
                "schema_name": tenant.schema_name,
                "name": tenant.name,
                "slug": getattr(tenant, "slug", tenant.schema_name.lower()),
                "role": role,
            },
        }

        return Response(response_data)


class RefreshTokenView(APIView):
    """
    Refresh access token using refresh token from cookie.

    POST /api/auth/refresh/

    The refresh token is read from HttpOnly cookie automatically.
    Returns new access token (also set as HttpOnly cookie).
    """

    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response(
                {"success": False, "error": "Token de refresh não encontrado."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            from rest_framework_simplejwt.tokens import RefreshToken

            token = RefreshToken(refresh_token)
            access_token = str(token.access_token)

            response = Response(
                {
                    "success": True,
                }
            )

            response.set_cookie(
                key="access_token",
                value=access_token,
                max_age=int(ACCESS_TOKEN_LIFETIME.total_seconds()),
                httponly=COOKIE_HTTPONLY,
                secure=COOKIE_SECURE,
                samesite=COOKIE_SAMESITE,
                path=COOKIE_PATH,
            )

            return response

        except Exception as e:
            logger.warning(f"Token refresh failed: {e}")
            return Response(
                {"success": False, "error": "Token inválido ou expirado."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
