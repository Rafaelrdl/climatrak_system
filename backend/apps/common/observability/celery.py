"""
Celery observability hooks for logging context and Prometheus metrics.
"""

import logging
import time

from celery.signals import before_task_publish, task_postrun, task_prerun, worker_ready
from django.conf import settings
from django.db import connection

# Lazy import to avoid AppRegistryNotReady during celery config import
# from apps.common.tenancy import get_tenant_by_schema

from .context import clear_context, get_context, set_request_context, set_task_context
from .metrics import observe_celery_task

logger = logging.getLogger(__name__)

_SETUP_COMPLETE = False
_METRICS_SERVER_STARTED = False


def _resolve_tenant_slug(schema_name: str | None) -> str | None:
    if not schema_name:
        return None
    # Lazy import to avoid circular import / AppRegistryNotReady
    from apps.common.tenancy import get_tenant_by_schema

    tenant = get_tenant_by_schema(schema_name)
    if tenant:
        return getattr(tenant, "slug", None) or schema_name
    return schema_name


def setup_celery_observability():
    global _SETUP_COMPLETE
    if _SETUP_COMPLETE:
        return
    _SETUP_COMPLETE = True

    @before_task_publish.connect
    def _inject_context(headers=None, **_kwargs):
        if headers is None:
            return
        ctx = get_context()
        if ctx.get("request_id"):
            headers.setdefault("request_id", ctx["request_id"])
        if ctx.get("tenant_schema"):
            headers.setdefault("tenant_schema", ctx["tenant_schema"])
        if ctx.get("tenant_slug"):
            headers.setdefault("tenant_slug", ctx["tenant_slug"])

    @task_prerun.connect
    def _task_start(sender=None, task_id=None, task=None, args=None, kwargs=None, **_rest):
        request = getattr(task, "request", None)
        headers = getattr(request, "headers", None) or {}

        request_id = headers.get("request_id")
        tenant_schema = (
            headers.get("tenant_schema")
            or (kwargs or {}).get("tenant_schema")
            or getattr(connection, "schema_name", None)
        )
        tenant_slug = headers.get("tenant_slug") or _resolve_tenant_slug(tenant_schema)

        set_request_context(
            request_id=request_id,
            tenant_schema=tenant_schema,
            tenant_slug=tenant_slug,
            path=None,
            method=None,
        )
        task_name = sender.name if sender else getattr(task, "name", None)
        set_task_context(task_id=task_id, task_name=task_name)

        if request is not None:
            request._observability_start_time = time.perf_counter()

    @task_postrun.connect
    def _task_finish(
        sender=None,
        task_id=None,
        task=None,
        args=None,
        kwargs=None,
        retval=None,
        state=None,
        **_rest,
    ):
        task_name = sender.name if sender else getattr(task, "name", None)
        status = (state or "unknown").lower()
        request = getattr(task, "request", None)
        duration = None
        if request is not None and hasattr(request, "_observability_start_time"):
            duration = time.perf_counter() - request._observability_start_time

        observe_celery_task(task_name=task_name or "unknown", status=status, duration_seconds=duration)
        clear_context()

    @worker_ready.connect
    def _start_metrics_server(**_kwargs):
        global _METRICS_SERVER_STARTED
        if _METRICS_SERVER_STARTED:
            return
        if not getattr(settings, "CELERY_METRICS_ENABLED", False):
            return
        try:
            from prometheus_client import start_http_server

            port = getattr(settings, "CELERY_METRICS_PORT", 9187)
            start_http_server(port)
            _METRICS_SERVER_STARTED = True
            logger.info("Celery metrics server started on port %s", port)
        except Exception as exc:
            logger.error("Failed to start Celery metrics server: %s", exc)
