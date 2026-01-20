"""
Development settings for TrakSense backend.
"""

import os

from .base import *

DEBUG = True

# Allow X-Tenant header override for SPA single-domain workflows in dev.
ALLOW_X_TENANT_HEADER = True

# Allow all hosts in development
ALLOWED_HOSTS = ["*"]

# Development-specific apps
INSTALLED_APPS += []

# Enable Django Debug Toolbar if needed in future
# INSTALLED_APPS += ['debug_toolbar']
# MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']

# Disable HTTPS redirect in development
SECURE_SSL_REDIRECT = False

# Logging
# Para desenvolvimento: logs simples e menos verbosos
# Para produção/debug: mudar LOG_LEVEL para "DEBUG" ou "INFO"

LOG_LEVEL = os.getenv("LOG_LEVEL", "WARNING")  # WARNING para menos ruído em dev
LOG_FORMAT = os.getenv("LOG_FORMAT", "simple")  # "simple" ou "json"

if LOG_FORMAT == "json":
    from apps.common.observability.logging import build_logging_config
    LOGGING = build_logging_config(LOG_LEVEL)
else:
    # Formato simples para desenvolvimento (menos verboso)
    LOGGING = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "simple": {
                "format": "[%(levelname)s] %(name)s: %(message)s",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "simple",
            },
        },
        "root": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
        },
        "loggers": {
            "django": {"level": "WARNING", "propagate": False},
            "django.db.backends": {"level": "WARNING", "propagate": False},
            "django.request": {"level": "WARNING", "propagate": False},
            "django.server": {"level": "WARNING", "propagate": False},
            "celery": {"level": "WARNING", "propagate": False},
            "httpx": {"level": "WARNING", "propagate": False},
            "httpcore": {"level": "WARNING", "propagate": False},
            # Apps do projeto - mantém INFO para ver o que está acontecendo
            "apps": {"handlers": ["console"], "level": "INFO", "propagate": False},
        },
    }
