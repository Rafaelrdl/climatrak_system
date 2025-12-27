from django.apps import AppConfig


class OpsConfig(AppConfig):
    """
    Ops panel application configuration.
    
    This app provides a staff-only internal panel for monitoring telemetry
    across all tenants. It runs exclusively on the public schema.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ops'
    verbose_name = 'Operations Panel'
    
    def ready(self):
        """
        Import and connect cache invalidation signals when app is ready.
        """
        from .utils import connect_signals
        connect_signals()
