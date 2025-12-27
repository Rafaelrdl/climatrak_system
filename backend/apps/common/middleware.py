"""
Common middleware for TrakSense backend.

References:
- Django middleware: https://docs.djangoproject.com/en/5.2/topics/http/middleware/
- django-tenants schema isolation: https://django-tenants.readthedocs.io/en/latest/use.html
"""

from django.http import HttpResponseNotFound
from django.db import connection


class BlockTenantAdminMiddleware:
    """
    Defensive middleware to block admin access in tenant schemas.
    
    This ensures admin is ONLY accessible via public schema (localhost:8000/admin).
    Tenant schemas (e.g., umc.localhost:8000/admin) will return 404.
    
    While URLConf separation should prevent this, this middleware provides
    defense-in-depth security against accidental admin exposure in tenants.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Block any admin URLs when NOT in public schema
        if request.path.startswith("/admin/"):
            schema_name = getattr(connection, "schema_name", None)
            if schema_name and schema_name != "public":
                # Return 404 for tenant admin access attempts
                return HttpResponseNotFound(
                    "Admin is only accessible via public schema. "
                    "Please use: http://localhost:8000/admin"
                )
        
        return self.get_response(request)


class BlockTenantOpsMiddleware:
    """
    Defensive middleware to block Ops panel access in tenant schemas.
    
    The Ops panel is staff-only and MUST run on the public schema only.
    This ensures /ops/ routes are not accessible via tenant domains.
    
    Security rationale:
    - Ops panel uses schema_context to query across tenants
    - Running on tenant schema would break schema isolation
    - Staff members must use public domain (localhost:8000/ops)
    
    References:
    - django-tenants schema isolation: https://django-tenants.readthedocs.io/en/latest/use.html
    - PUBLIC_SCHEMA_URLCONF: https://django-tenants.readthedocs.io/en/latest/install.html
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Block any /ops/ URLs when NOT in public schema
        if request.path.startswith("/ops/"):
            schema_name = getattr(connection, "schema_name", None)
            if schema_name and schema_name != "public":
                # Return 404 for tenant ops panel access attempts
                return HttpResponseNotFound(
                    "Ops panel is only accessible via public schema. "
                    "Please use: http://localhost:8000/ops/"
                )
        
        return self.get_response(request)
