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
from apps.common.observability.logging import build_logging_config

LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG" if DEBUG else "INFO")
LOGGING = build_logging_config(LOG_LEVEL)
