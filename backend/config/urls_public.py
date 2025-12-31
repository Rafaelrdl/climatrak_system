"""
URL configuration for public/non-tenant routes (schema: public).

These URLs are used when accessing the public schema.
Includes centralized Django Admin with Jazzmin.

Also includes public authentication endpoints (tenant discovery, password reset, invites).
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.accounts.views_password_reset import (
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PasswordResetValidateView,
)
from apps.accounts.views_team import PublicInviteAcceptView, PublicInviteValidateView
from apps.common.health import health_check

urlpatterns = [
    # Centralized Django Admin (only in public schema)
    path("admin/", admin.site.urls),
    # Ops Panel (staff-only, public schema)
    path("ops/", include("apps.ops.urls")),
    # Health check
    path("health", health_check, name="health"),
    # MQTT Ingest (called by EMQX without tenant domain)
    path("ingest", include("apps.ingest.urls")),
    # ==========================================================================
    # 🔐 NEW Centralized Authentication (public_identity app)
    # ==========================================================================
    # New architecture: User lives ONLY in tenant schemas
    # Authentication happens INSIDE tenant schemas
    # TenantUserIndex provides discovery, TenantMembership provides roles
    path("api/v2/auth/", include("apps.public_identity.urls")),
    # Password Reset (accessible without tenant - user may not know their tenant)
    path(
        "api/auth/password-reset/request/",
        PasswordResetRequestView.as_view(),
        name="password_reset_request",
    ),
    path(
        "api/auth/password-reset/validate/",
        PasswordResetValidateView.as_view(),
        name="password_reset_validate",
    ),
    path(
        "api/auth/password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    # ==========================================================================
    # 📧 Public Invite Endpoints (for accepting team invitations)
    # ==========================================================================
    # These endpoints are public (no auth required) to allow new users to
    # validate and accept invitations to join a tenant.
    path(
        "api/invites/validate/",
        PublicInviteValidateView.as_view(),
        name="invite_validate",
    ),
    path("api/invites/accept/", PublicInviteAcceptView.as_view(), name="invite_accept"),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
