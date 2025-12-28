"""
Tenant middleware for header-based tenant resolution.

This middleware enables single-domain SPA architecture where the frontend
sends the tenant identifier via X-Tenant header instead of using subdomains.

Flow:
1. TenantMainMiddleware (django-tenants) runs first and resolves by domain
2. TenantHeaderMiddleware runs after and overrides if X-Tenant header is present
3. API requests can now work with any tenant from a single frontend URL

Security:
- Only authenticated users can use X-Tenant header
- User must have active TenantMembership for the requested tenant
- Invalid tenant headers result in 403 Forbidden

References:
- django-tenants middleware: https://django-tenants.readthedocs.io/en/latest/use.html
- X-Tenant pattern: Used in apps/ingest for MQTT webhook ingestion
"""

import logging

from django.db import connection
from django.http import JsonResponse
from django_tenants.utils import get_tenant_model, schema_context

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
    - Validates user membership for authenticated requests
    
    Usage:
        # Frontend axios interceptor
        axios.defaults.headers.common['X-Tenant'] = 'COMG';
    """
    
    # Paths that don't require tenant validation
    EXEMPT_PATHS = [
        '/api/auth/login/',
        '/api/auth/register/',
        '/api/auth/token/refresh/',
        '/api/auth/password-reset/',
        '/api/auth/discover-tenant/',
        '/api/v2/auth/',
        '/api/health/',
        '/api/accounts/health/',
        '/admin/',
        '/ops/',
        '/api/schema/',
        '/api/docs/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.Tenant = get_tenant_model()
    
    def __call__(self, request):
        # Get X-Tenant header
        tenant_header = request.headers.get('X-Tenant')
        
        if tenant_header:
            # Skip tenant switching for exempt paths
            if self._is_exempt_path(request.path):
                return self.get_response(request)
            
            try:
                # Resolve tenant from header
                tenant = self._get_tenant_by_schema(tenant_header)
                
                if not tenant:
                    return JsonResponse(
                        {
                            'error': 'Tenant not found',
                            'detail': f"No tenant found with schema '{tenant_header}'",
                            'code': 'tenant_not_found'
                        },
                        status=404
                    )
                
                # For authenticated requests, validate membership
                # Note: Authentication happens after middleware, so we check in process_view
                request._tenant_from_header = tenant
                request._tenant_header_value = tenant_header
                
                # Switch to tenant schema
                connection.set_tenant(tenant)
                request.tenant = tenant
                
                logger.debug(f"Switched to tenant '{tenant.schema_name}' via X-Tenant header")
                
            except Exception as e:
                logger.error(f"Error processing X-Tenant header: {e}")
                return JsonResponse(
                    {
                        'error': 'Invalid tenant',
                        'detail': str(e),
                        'code': 'tenant_error'
                    },
                    status=400
                )
        
        response = self.get_response(request)
        return response
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        """
        Validate tenant membership for authenticated users using X-Tenant header.
        
        This runs after authentication middleware, so request.user is available.
        """
        tenant_from_header = getattr(request, '_tenant_from_header', None)
        
        if not tenant_from_header:
            return None  # No header-based tenant, continue normally
        
        # Skip validation for exempt paths
        if self._is_exempt_path(request.path):
            return None
        
        # Skip validation for unauthenticated users (let the view handle 401)
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return None
        
        # Validate membership
        if not self._user_has_membership(request.user, tenant_from_header):
            logger.warning(
                f"User {request.user.email} attempted to access tenant "
                f"'{tenant_from_header.schema_name}' without membership"
            )
            return JsonResponse(
                {
                    'error': 'Access denied',
                    'detail': f"You don't have access to tenant '{tenant_from_header.name}'",
                    'code': 'no_tenant_membership'
                },
                status=403
            )
        
        return None
    
    def _is_exempt_path(self, path):
        """Check if path is exempt from tenant validation."""
        return any(path.startswith(exempt) for exempt in self.EXEMPT_PATHS)
    
    def _get_tenant_by_schema(self, schema_name):
        """
        Get tenant by schema name (case-insensitive).
        
        Uses public schema context to query tenants table.
        """
        with schema_context('public'):
            return self.Tenant.objects.filter(
                schema_name__iexact=schema_name
            ).first()
    
    def _user_has_membership(self, user, tenant):
        """
        Check if user has active membership in tenant.
        
        Uses public schema to check memberships (email hash only).
        """
        from apps.public_identity.models import TenantMembership as PublicTenantMembership, compute_email_hash
        
        with schema_context('public'):
            email_hash = compute_email_hash(user.email)
            return PublicTenantMembership.objects.filter(
                email_hash=email_hash,
                tenant=tenant,
                status='active'
            ).exists()
