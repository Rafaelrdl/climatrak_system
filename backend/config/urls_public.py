"""
URL configuration for public/non-tenant routes (schema: public).

These URLs are used when accessing the public schema.
Includes centralized Django Admin with Jazzmin.
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

urlpatterns = [
    # Centralized Django Admin (only in public schema)
    path('admin/', admin.site.urls),
    
    # Ops Panel (staff-only, public schema)
    path('ops/', include('apps.ops.urls')),
    
    # Health check
    path('health', health_check, name='health'),
    
    # MQTT Ingest (called by EMQX without tenant domain)
    path('ingest', include('apps.ingest.urls')),
    
    # Password Reset (accessible without tenant - user may not know their tenant)
    path('api/auth/password-reset/request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('api/auth/password-reset/validate/', PasswordResetValidateView.as_view(), name='password_reset_validate'),
    path('api/auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
