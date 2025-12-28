"""
Core Events App Configuration
"""

from django.apps import AppConfig


class CoreEventsConfig(AppConfig):
    """Configuration for the core_events app."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core_events'
    verbose_name = 'Domain Events (Outbox)'
    
    def ready(self):
        """Import signal handlers when app is ready."""
        pass  # Signals podem ser importados aqui se necessário
