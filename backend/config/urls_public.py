"""
URL configuration for public/non-tenant routes (schema: public).

These URLs are used when accessing the public schema.
Includes centralized Django Admin with Jazzmin.

Also includes centralized authentication endpoints for X-Tenant header architecture.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.common.health import health_check
from apps.accounts.views_password_reset import (
    PasswordResetRequestView,
    PasswordResetValidateView,
    PasswordResetConfirmView,
)
from apps.accounts.views import (
    CentralizedLoginView,
    UserTenantsView,
    TenantSelectView,
    WhoAmIView,
    CookieTokenRefreshView,
    LogoutView,
)
from apps.accounts.views_tenant_discovery import TenantDiscoveryView
from apps.accounts.views_team import (
    PublicInviteValidateView,
    PublicInviteAcceptView,
)

urlpatterns = [
    # Centralized Django Admin (only in public schema)
    path('admin/', admin.site.urls),
    
    # Ops Panel (staff-only, public schema)
    path('ops/', include('apps.ops.urls')),
    
    # Health check
    path('health', health_check, name='health'),
    
    # MQTT Ingest (called by EMQX without tenant domain)
    path('ingest', include('apps.ingest.urls')),
    
    # ==========================================================================
    # 🔐 NEW Centralized Authentication (public_identity app)
    # ==========================================================================
    # New architecture: User lives ONLY in tenant schemas
    # Authentication happens INSIDE tenant schemas
    # TenantUserIndex provides discovery, TenantMembership provides roles
    path('api/v2/auth/', include('apps.public_identity.urls')),
    
    # ==========================================================================
    # 🔐 LEGACY Centralized Authentication (X-Tenant Header Architecture)
    # ==========================================================================
    # These endpoints allow a single-domain SPA (e.g., localhost:5173) to:
    # 1. Login and get list of available tenants
    # 2. Select a tenant and get X-Tenant header value
    # 3. Use X-Tenant header in subsequent API requests
    
    # Main login endpoint - returns user info + list of accessible tenants
    path('api/auth/centralized-login/', CentralizedLoginView.as_view(), name='centralized_login'),
    
    # Tenant discovery - identifica tenant pelo email (sem senha)
    path('api/auth/discover-tenant/', TenantDiscoveryView.as_view(), name='discover_tenant'),
    
    # List user's tenants (requires auth)
    path('api/auth/tenants/', UserTenantsView.as_view(), name='user_tenants'),
    
    # Select/validate tenant (requires auth)
    path('api/auth/tenants/select/', TenantSelectView.as_view(), name='tenant_select'),
    
    # Debug endpoint - check current auth and tenant context
    path('api/auth/whoami/', WhoAmIView.as_view(), name='whoami'),
    
    # Token refresh (works from public schema)
    path('api/auth/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    
    # Logout
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    
    # Password Reset (accessible without tenant - user may not know their tenant)
    path('api/auth/password-reset/request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('api/auth/password-reset/validate/', PasswordResetValidateView.as_view(), name='password_reset_validate'),
    path('api/auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    
    # ==========================================================================
    # 📧 Public Invite Endpoints (for accepting team invitations)
    # ==========================================================================
    # These endpoints are public (no auth required) to allow new users to
    # validate and accept invitations to join a tenant.
    path('api/invites/validate/', PublicInviteValidateView.as_view(), name='invite_validate'),
    path('api/invites/accept/', PublicInviteAcceptView.as_view(), name='invite_accept'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
