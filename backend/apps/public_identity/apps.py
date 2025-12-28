"""
Django AppConfig for public_identity app.

This app lives ONLY in the public schema and provides:
- TenantUserIndex: maps email hashes to tenants (without storing passwords)
- Centralized login that authenticates against tenant schemas
"""

from django.apps import AppConfig


class PublicIdentityConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.public_identity'
    verbose_name = 'Public Identity (Tenant Discovery)'
    
    def ready(self):
        # Import signals when app is ready
        from . import signals  # noqa: F401
