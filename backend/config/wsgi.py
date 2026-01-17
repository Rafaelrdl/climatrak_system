"""
WSGI config for TrakSense backend.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

from apps.common.observability.tracing import configure_tracing

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

configure_tracing()

application = get_wsgi_application()
