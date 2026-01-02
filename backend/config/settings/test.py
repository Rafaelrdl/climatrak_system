"""
Test settings for ClimaTrak backend.

Used for running tests in CI/CD and locally.
"""

import os
from pathlib import Path

# Override environment variables before importing base to prevent validation errors
os.environ.setdefault("DJANGO_SECRET_KEY", os.getenv("SECRET_KEY", "test-secret-key-for-ci-only-not-for-production"))
os.environ.setdefault("INGESTION_SECRET", "test-ingestion-secret-for-ci-only")
os.environ.setdefault("DEBUG", "True")  # Set DEBUG to True initially to bypass validation

from .base import *  # noqa: E402, F401, F403

# ============================================================================
# Test-specific settings
# ============================================================================

DEBUG = False

# Allow all hosts in test
ALLOWED_HOSTS = ["*", "localhost", "127.0.0.1", "testserver"]

# Use a simpler password hasher for faster tests
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Disable migrations for faster tests (use --keepdb for persistent test db)
# Note: This is commented out because django-tenants needs migrations
# class DisableMigrations:
#     def __contains__(self, item):
#         return True
#     def __getitem__(self, item):
#         return None
# MIGRATION_MODULES = DisableMigrations()

# Database configuration for tests
# Supports DATABASE_URL env var or individual DB_* vars
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Parse DATABASE_URL (e.g., postgres://user:pass@host:port/dbname)
    import re
    match = re.match(
        r"postgres(?:ql)?://(?P<user>[^:]+):(?P<password>[^@]+)@(?P<host>[^:]+):(?P<port>\d+)/(?P<name>.+)",
        DATABASE_URL
    )
    if match:
        DATABASES = {
            "default": {
                "ENGINE": "django_tenants.postgresql_backend",
                "NAME": match.group("name"),
                "USER": match.group("user"),
                "PASSWORD": match.group("password"),
                "HOST": match.group("host"),
                "PORT": match.group("port"),
            }
        }
else:
    # Fallback to individual env vars
    DATABASES = {
        "default": {
            "ENGINE": "django_tenants.postgresql_backend",
            "NAME": os.getenv("DB_NAME", "climatrak_test"),
            "USER": os.getenv("DB_USER", "postgres"),
            "PASSWORD": os.getenv("DB_PASSWORD", "postgres"),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
        }
    }

# Cache configuration for tests (use local memory)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# Celery configuration for tests (run tasks synchronously)
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Disable throttling for tests
REST_FRAMEWORK = {
    **globals().get("REST_FRAMEWORK", {}),
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {},
}

# Email backend for tests (don't send real emails)
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Logging - reduce noise during tests
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}

# Disable SSL redirect in tests
SECURE_SSL_REDIRECT = False

# Faster token expiration for tests
from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    **globals().get("SIMPLE_JWT", {}),
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
}
