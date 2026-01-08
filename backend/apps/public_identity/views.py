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

            primary_entry = entries[0]
            primary_tenant = primary_entry.tenant
            primary_domain = (
                Domain.objects.filter(tenant=primary_tenant)
                .order_by("-is_primary", "domain")
                .values_list("domain", flat=True)
                .first()
            )

            primary_tenant_data = {
                "schema_name": primary_tenant.schema_name,
                "slug": primary_tenant.slug,
                "name": primary_tenant.name,
                "domain": primary_domain,
            }

            return Response(
                {
                    "found": True,
                    "email": email,
                    "primary_tenant": primary_tenant_data,
                    "has_multiple_tenants": len(entries) > 1,
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
                "role": "admin",
                "features": {
                    "trakservice.enabled": false,
                    "trakservice.dispatch": false,
                    ...
                }
            }
        }
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Get current tenant from connection
        from django.db import connection

        from apps.tenants.features import get_tenant_features

        tenant = getattr(connection, "tenant", None)

        if not tenant or connection.schema_name == "public":
            return Response(
                {"error": "Tenant não identificado"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Get role from TenantMembership
        role = TenantAuthService._get_user_role(user.email, tenant)

        # Get tenant features
        features = get_tenant_features(tenant.id)

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
                "features": features,
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


# =============================================================================
# Mobile-specific endpoints (tokens returned in body, not just cookies)
# =============================================================================


class MobileLoginView(APIView):
    """
    Mobile login endpoint - returns JWT tokens in response body.

    POST /api/v2/auth/mobile/login/

    Request body:
        {
            "email": "user@example.com",
            "password": "secret123",
            "schema_name": "COMG"  (optional - required if user has multiple tenants)
        }

    Response:
        {
            "success": true,
            "access": "eyJ...",
            "refresh": "eyJ...",
            "user": {
                "id": 1,
                "email": "user@example.com",
                "full_name": "John Doe"
            },
            "tenant": {
                "id": 1,
                "schema_name": "tenant_acme",
                "name": "ACME Corp",
                "slug": "acme",
                "role": "admin"
            }
        }

    Note: This endpoint is designed for mobile apps that cannot use HttpOnly cookies.
    Tokens are returned in the response body and should be stored securely
    (e.g., iOS Keychain, Android EncryptedSharedPreferences).
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        schema_name = request.data.get("schema_name")

        # If schema_name is provided, authenticate directly in that tenant
        if schema_name:
            result = TenantAuthService.select_tenant(email, password, schema_name)
        else:
            result = TenantAuthService.login(email, password)

        if not result.success:
            return Response(
                {"success": False, "error": result.error},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Check if user has multiple tenants and no schema specified
        if len(result.authenticated_tenants) > 1 and not result.selected_tenant and not schema_name:
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

            return Response(
                {
                    "success": True,
                    "requires_tenant_selection": True,
                    "tenants": tenants_data,
                    # Still provide tokens for convenience
                    "access": result.access_token,
                    "refresh": result.refresh_token,
                }
            )

        # Single tenant or already selected
        tenant = result.selected_tenant or result.authenticated_tenants[0]

        response_data = {
            "success": True,
            "access": result.access_token,
            "refresh": result.refresh_token,
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

        logger.info(f"Mobile login successful: {email} -> {tenant.schema_name}")

        # Also set cookies for hybrid scenarios (optional)
        response = Response(response_data)
        set_auth_cookies(response, result.access_token, result.refresh_token)

        return response


class MobileRefreshTokenView(APIView):
    """
    Mobile refresh token endpoint - accepts refresh token in body, returns new tokens.

    POST /api/v2/auth/mobile/refresh/

    Request body:
        {
            "refresh": "eyJ..."
        }

    Response:
        {
            "success": true,
            "access": "eyJ...",
            "refresh": "eyJ..."  (same token, unless rotation is enabled)
        }
    """

    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {"success": False, "error": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from rest_framework_simplejwt.tokens import RefreshToken

            token = RefreshToken(refresh_token)
            access_token = str(token.access_token)

            # Check if rotation is enabled
            rotate_tokens = getattr(settings, "SIMPLE_JWT", {}).get(
                "ROTATE_REFRESH_TOKENS", False
            )

            response_data = {
                "success": True,
                "access": access_token,
                "refresh": str(token) if rotate_tokens else refresh_token,
            }

            response = Response(response_data)

            # Also set cookies for hybrid scenarios
            set_auth_cookies(
                response,
                access_token,
                str(token) if rotate_tokens else refresh_token,
            )

            return response

        except Exception as e:
            logger.warning(f"Mobile token refresh failed: {e}")
            return Response(
                {"success": False, "error": "Token inválido ou expirado."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class MobileSelectTenantView(APIView):
    """
    Mobile select tenant endpoint - for users with multiple tenants.

    POST /api/v2/auth/mobile/select-tenant/

    Request body:
        {
            "email": "user@example.com",
            "password": "secret123",
            "schema_name": "tenant_acme"
        }

    Response:
        {
            "success": true,
            "access": "eyJ...",
            "refresh": "eyJ...",
            "user": {...},
            "tenant": {...}
        }
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SelectTenantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        schema_name = serializer.validated_data["schema_name"]

        result = TenantAuthService.select_tenant(email, password, schema_name)

        if not result.success:
            return Response(
                {"success": False, "error": result.error},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        tenant = result.selected_tenant

        response_data = {
            "success": True,
            "access": result.access_token,
            "refresh": result.refresh_token,
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

        logger.info(f"Mobile tenant selection: {email} -> {tenant.schema_name}")

        response = Response(response_data)
        set_auth_cookies(response, result.access_token, result.refresh_token)

        return response
