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
        "primary_tenant": {
            "schema_name": "UMC",
            "slug": "umc",
            "name": "Uberlandia Medical Center"
        },
        "has_multiple_tenants": false
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
