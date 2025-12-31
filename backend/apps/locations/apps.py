"""
App Locations - Hierarquia de localizacoes
"""

from django.apps import AppConfig


class LocationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.locations"
    verbose_name = "Localizacoes"

    def ready(self):
        from . import signals  # noqa: F401
