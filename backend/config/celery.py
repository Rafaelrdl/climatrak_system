"""
Celery configuration for TrakSense backend.

This module sets up Celery for async tasks, workers, and schedulers.
"""

import logging
import os

from celery import Celery

logger = logging.getLogger(__name__)

settings_module = os.getenv("DJANGO_SETTINGS_MODULE")
if not settings_module:
    raise RuntimeError(
        "DJANGO_SETTINGS_MODULE is not set. "
        "Export it before starting Celery (e.g. config.settings.production)."
    )
os.environ["DJANGO_SETTINGS_MODULE"] = settings_module

app = Celery("traksense")

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Load task modules from all registered Django apps.
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery setup."""
    logger.debug("Request: %r", self.request)
