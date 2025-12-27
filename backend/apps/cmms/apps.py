from django.apps import AppConfig


class CmmsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.cmms'
    verbose_name = 'CMMS - Gestão de Manutenção'

    def ready(self):
        # Import signals when app is ready
        try:
            from . import signals  # noqa: F401
        except ImportError:
            pass
