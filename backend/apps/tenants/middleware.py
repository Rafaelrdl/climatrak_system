"""
Tenant middleware for header-based tenant resolution.

This middleware enables single-domain SPA architecture where the frontend
sends the tenant identifier via X-Tenant header instead of using subdomains.

Flow:
1. TenantMainMiddleware (django-tenants) runs first and resolves by domain
2. TenantHeaderMiddleware runs after and overrides if X-Tenant header is present
3. API requests can now work with any tenant from a single frontend URL

Security:
- Header override is allowed only in DEBUG (or ALLOW_X_TENANT_HEADER)
- Header mismatches are rejected when a tenant host is already resolved
- Membership and tenant lock are enforced by JWT authentication

References:
- django-tenants middleware: https://django-tenants.readthedocs.io/en/latest/use.html
- X-Tenant pattern: Used in apps/ingest for MQTT webhook ingestion
"""

import logging

from django.conf import settings
from django.db import connection
from django.http import JsonResponse

from django_tenants.utils import get_public_schema_name, get_tenant_model, schema_context

logger = logging.getLogger(__name__)


class TenantHeaderMiddleware:
    """
    Middleware that resolves tenant from X-Tenant header for SPA architecture.

    This allows a frontend running on a single domain (e.g., localhost:5173)
    to access any tenant's API by sending the X-Tenant header.

    Header format:
        X-Tenant: schema_name (e.g., "COMG", "UMC")

    Behavior:
    - If X-Tenant header is present and valid, switches to that tenant's schema
    - If header is missing, uses the domain-based resolution (default behavior)
    - Enforces header/host consistency when a tenant is already resolved

    Usage:
        # Frontend axios interceptor
        axios.defaults.headers.common['X-Tenant'] = 'COMG';
    """

    # Paths that don't require tenant validation
    EXEMPT_PATHS = [
        "/api/auth/login/",
        "/api/auth/register/",
        "/api/auth/token/refresh/",
        "/api/auth/password-reset/",
        "/api/v2/auth/",
        "/api/health/",
        "/api/accounts/health/",
        "/admin/",
        "/ops/",
        "/api/schema/",
        "/api/docs/",
    ]

    def __init__(self, get_response):
        self.get_response = get_response
        self.Tenant = get_tenant_model()

    def __call__(self, request):
        # Get X-Tenant header
        tenant_header = request.headers.get("X-Tenant")

        if tenant_header:
            # Skip tenant switching for exempt paths
            if self._is_exempt_path(request.path):
                return self.get_response(request)

            try:
                public_schema = get_public_schema_name()
                current_schema = getattr(connection, "schema_name", public_schema)
                normalized_header = self._normalize_schema(tenant_header)

                if not normalized_header:
                    return self.get_response(request)

                allow_header = settings.DEBUG or getattr(
                    settings, "ALLOW_X_TENANT_HEADER", False
                )

                # In production, header is never the source of truth.
                if not allow_header:
                    if (
                        current_schema != public_schema
                        and self._normalize_schema(current_schema) != normalized_header
                    ):
                        return JsonResponse(
                            {
                                "error": "Tenant mismatch",
                                "detail": (
                                    "X-Tenant header does not match the current host tenant"
                                ),
                                "code": "tenant_mismatch",
                            },
                            status=403,
                        )
                    return self.get_response(request)

                # In dev, allow header only when host is public or matches current tenant.
                if (
                    current_schema != public_schema
                    and self._normalize_schema(current_schema) != normalized_header
                ):
                    return JsonResponse(
                        {
                            "error": "Tenant mismatch",
                            "detail": (
                                "X-Tenant header does not match the current host tenant"
                            ),
                            "code": "tenant_mismatch",
                        },
                        status=403,
                    )

                if current_schema == public_schema:
                    tenant = self._get_tenant_by_schema(normalized_header)

                    if not tenant:
                        return JsonResponse(
                            {
                                "error": "Tenant not found",
                                "detail": f"No tenant found with schema '{tenant_header}'",
                                "code": "tenant_not_found",
                            },
                            status=404,
                        )

                    # Switch to tenant schema for dev single-domain workflows
                    connection.set_tenant(tenant)
                    request.tenant = tenant

                    logger.debug(
                        f"Switched to tenant '{tenant.schema_name}' via X-Tenant header"
                    )

            except Exception as e:
                logger.error(f"Error processing X-Tenant header: {e}")
                return JsonResponse(
                    {
                        "error": "Invalid tenant",
                        "detail": str(e),
                        "code": "tenant_error",
                    },
                    status=400,
                )

        response = self.get_response(request)
        return response

    def _is_exempt_path(self, path):
        """Check if path is exempt from tenant validation."""
        return any(path.startswith(exempt) for exempt in self.EXEMPT_PATHS)

    def _normalize_schema(self, value):
        if not value:
            return ""
        return value.strip().lower().replace("-", "_")

    def _get_tenant_by_schema(self, schema_name):
        """
        Get tenant by schema name (case-insensitive).

        Uses public schema context to query tenants table.
        """
        with schema_context(get_public_schema_name()):
            return self.Tenant.objects.filter(schema_name__iexact=schema_name).first()
