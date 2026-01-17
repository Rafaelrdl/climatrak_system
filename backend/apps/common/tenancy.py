"""
Common tenant utilities for multi-tenant safety.
"""

from typing import Iterable

from django_tenants.utils import get_public_schema_name, schema_context

from apps.tenants.models import Tenant


def iter_tenants(include_public: bool = False) -> Iterable[Tenant]:
    """
    Yield tenants from public schema in a safe, schema-neutral way.

    Args:
        include_public: Whether to include the public/system schema.
    """
    public_schema = get_public_schema_name()
    with schema_context(public_schema):
        queryset = Tenant.objects.all()
        if not include_public:
            queryset = queryset.exclude(schema_name=public_schema).exclude(slug="public")
        for tenant in queryset.iterator():
            yield tenant


def get_tenant_by_schema(schema_name: str) -> Tenant | None:
    """
    Resolve a Tenant object by schema name using public schema.
    """
    if not schema_name:
        return None
    public_schema = get_public_schema_name()
    with schema_context(public_schema):
        return Tenant.objects.filter(schema_name=schema_name).first()
