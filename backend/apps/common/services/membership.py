"""
Membership and tenant resolution helpers (public schema).
"""

from django.db import connection
from django_tenants.utils import get_public_schema_name, schema_context

from apps.common.tenancy import get_tenant_by_schema
from apps.public_identity.models import TenantMembership as PublicTenantMembership
from apps.public_identity.models import compute_email_hash


def get_current_tenant():
    """
    Resolve the actual Tenant object for the current connection schema.

    Returns None when running in public schema or when schema is unknown.
    """
    current_schema = getattr(connection, "schema_name", None)
    if not current_schema or current_schema == get_public_schema_name():
        return None
    return get_tenant_by_schema(current_schema)


def get_public_membership(user, tenant):
    """
    Fetch the active public_identity membership for a user+tenant.
    """
    if not user or not tenant:
        return None

    with schema_context(get_public_schema_name()):
        email_hash = compute_email_hash(user.email)
        return PublicTenantMembership.objects.filter(
            email_hash=email_hash, tenant=tenant, status="active"
        ).first()


def has_active_membership(user, schema_name: str) -> bool:
    """
    Check if a user has an active membership for a tenant schema.
    """
    tenant = get_tenant_by_schema(schema_name)
    if not tenant:
        return False
    membership = get_public_membership(user, tenant)
    return membership is not None
