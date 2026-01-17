"""
Request context middleware for observability.
"""

import logging
import time
import uuid

from django.db import connection

from apps.common.tenancy import get_tenant_by_schema

from .context import clear_context, set_request_context, set_response_context
from .metrics import observe_http_request, observe_ingest_request

logger = logging.getLogger(__name__)


class RequestContextMiddleware:
    """
    Attach request_id and standard context fields to all logs.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        start_time = time.perf_counter()

        tenant_schema, tenant_slug = self._resolve_tenant(request)
        user_id = None
        if hasattr(request, "user") and getattr(request.user, "is_authenticated", False):
            user_id = request.user.id

        set_request_context(
            request_id=request_id,
            tenant_schema=tenant_schema,
            tenant_slug=tenant_slug,
            user_id=user_id,
            path=request.path,
            method=request.method,
        )

        response = None
        try:
            response = self.get_response(request)
            return response
        except Exception as exc:
            raise
        finally:
            status_code = response.status_code if response else 500
            duration = time.perf_counter() - start_time
            latency_ms = int(duration * 1000)
            set_response_context(status_code=status_code, latency_ms=latency_ms)

            if response is not None:
                response["X-Request-ID"] = request_id

            path_template = self._get_path_template(request)
            observe_http_request(
                method=request.method,
                path_template=path_template,
                status=str(status_code),
                duration_seconds=duration,
            )

            if request.path.startswith("/ingest"):
                observe_ingest_request(status=str(status_code))

            logger.info("request completed", extra={"event": "http_request"})
            clear_context()

    def _resolve_tenant(self, request):
        tenant = getattr(request, "tenant", None)
        if tenant:
            schema = getattr(tenant, "schema_name", None)
            slug = getattr(tenant, "slug", None) or schema
            return schema, slug

        schema = getattr(connection, "schema_name", None)
        if schema and schema != "public":
            tenant_obj = get_tenant_by_schema(schema)
            slug = getattr(tenant_obj, "slug", None) if tenant_obj else schema
            return schema, slug

        return schema, "public" if schema else None

    def _get_path_template(self, request):
        match = getattr(request, "resolver_match", None)
        if match and getattr(match, "route", None):
            route = match.route
            if not route.startswith("/"):
                return f"/{route}"
            return route
        return "unmatched"
