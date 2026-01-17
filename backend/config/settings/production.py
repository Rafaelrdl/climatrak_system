"""
Production settings for TrakSense backend.
"""

import os

from .base import *

DEBUG = False

# Never allow X-Tenant header override in production.
ALLOW_X_TENANT_HEADER = False

# Security settings for production
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Only JSON renderer in production
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [
    "rest_framework.renderers.JSONRenderer",
]

# Logging
from apps.common.observability.logging import build_logging_config

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOGGING = build_logging_config(LOG_LEVEL)
