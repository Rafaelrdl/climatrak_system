"""
Signals para app de Assets.

Responsável por:
- Atualizar cache de última leitura do Sensor quando TelemetryReading é criado
- Atualizar status de Device quando conecta/desconecta no EMQX
- Invalidar cache de timezone quando Site é atualizado
"""

import logging

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.assets.models import Site

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Site)
def invalidate_site_timezone_cache_on_save(sender, instance, **kwargs):
    """
    Invalida o cache do timezone quando um Site é salvo.
    Isso garante que mudanças no timezone sejam refletidas imediatamente.
    """
    # Obter o tenant atual do schema
    schema_name = connection.schema_name

    # Invalidar cache para este site
    cache_key = f"site_timezone:{schema_name}:{instance.name}"
    deleted = cache.delete(cache_key)

    if deleted and settings.DEBUG:
        logger.info(
            "Cache do timezone invalidado para Site '%s' (tenant: %s)",
            instance.name,
            schema_name,
        )


@receiver(post_delete, sender=Site)
def invalidate_site_timezone_cache_on_delete(sender, instance, **kwargs):
    """
    Invalida o cache do timezone quando um Site é deletado.
    """
    schema_name = connection.schema_name
    cache_key = f"site_timezone:{schema_name}:{instance.name}"
    cache.delete(cache_key)

    if settings.DEBUG:
        logger.info(
            "Cache do timezone invalidado para Site deletado '%s' (tenant: %s)",
            instance.name,
            schema_name,
        )


# Signal será conectado quando integrarmos com apps.ingest
# @receiver(post_save, sender='ingest.TelemetryReading')
# def update_sensor_last_reading(sender, instance, created, **kwargs):
#     """
#     Atualiza cache da última leitura do Sensor.
#     Chamado automaticamente quando TelemetryReading é salvo.
#     """
#     if created and hasattr(instance, 'sensor'):
#         instance.sensor.update_last_reading(
#             value=instance.value,
#             timestamp=instance.timestamp
#         )
