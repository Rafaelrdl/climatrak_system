from django.apps import AppConfig


class TrakServiceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.trakservice"
    verbose_name = "TrakService - Field Service Management"

    def ready(self):
        # Import signals when app is ready
        try:
            from . import signals  # noqa: F401
        except ImportError:
            pass
