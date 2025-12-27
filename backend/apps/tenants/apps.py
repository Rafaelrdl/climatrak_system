"""
Tenants app configuration.
"""

from django.apps import AppConfig


class TenantsConfig(AppConfig):
    """Configuration for the tenants app."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.tenants'
    verbose_name = 'Tenants'
