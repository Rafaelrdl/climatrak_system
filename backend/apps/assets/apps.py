from django.apps import AppConfig


class AssetsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.assets'
    verbose_name = 'Catálogo de Ativos'
    
    def ready(self):
        """Import signals when app is ready"""
        try:
            import apps.assets.signals  # noqa
        except ImportError:
            pass
