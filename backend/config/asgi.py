"""
ASGI config for TrakSense backend.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

from apps.common.observability.tracing import configure_tracing

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

configure_tracing()

application = get_asgi_application()
