"""
Tenant discovery view - identifica tenant pelo email sem exigir senha.
"""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from django_tenants.utils import schema_context

from apps.public_identity.models import (
    TenantMembership,
    TenantUserIndex,
    compute_email_hash,
)
from apps.tenants.models import Domain


class TenantDiscoveryView(APIView):
    """
    Descobre qual tenant um email pertence (sem exigir senha).

    POST /api/auth/discover-tenant/
    {
        "email": "user@example.com"
    }

    Response:
    {
        "found": true,
        "email": "user@example.com",
        "tenants": [
            {
                "schema_name": "UMC",
                "slug": "umc",
                "name": "Uberlandia Medical Center"
            }
        ],
        "primary_tenant": {
            "schema_name": "UMC",
            "slug": "umc",
            "name": "Uberlandia Medical Center"
        }
    }

    Ou se não encontrado:
    {
        "found": false,
        "email": "user@example.com"
    }
    """

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()

        if not email:
            return Response(
                {"error": "Email é obrigatório."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Lookup tenant index entries in public schema (email hash only)
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
