"""
Observability views (metrics).
"""

from django.conf import settings
from django.http import HttpResponse, HttpResponseNotFound

from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from .metrics import get_metrics_registry


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _metrics_allowed(request):
    if getattr(settings, "METRICS_ALLOW_ALL", False):
        return True
    allowed = getattr(settings, "METRICS_ALLOWED_IPS", [])
    if not allowed:
        return False
    return _client_ip(request) in allowed


def metrics_view(request):
    if not getattr(settings, "METRICS_ENABLED", False):
        return HttpResponseNotFound()
    if not _metrics_allowed(request):
        return HttpResponseNotFound()

    registry = get_metrics_registry()
    output = generate_latest(registry)
    return HttpResponse(output, content_type=CONTENT_TYPE_LATEST)
