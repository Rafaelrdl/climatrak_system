import uuid

from django.http import HttpResponse
from django.test import RequestFactory
from django.test.utils import override_settings

from prometheus_client import CONTENT_TYPE_LATEST

from apps.common.observability.logging import redact_data, redact_text
from apps.common.observability.metrics import observe_http_request
from apps.common.observability.middleware import RequestContextMiddleware
from apps.common.observability.views import metrics_view


def test_request_id_header_added():
    request = RequestFactory().get("/health")
    response = RequestContextMiddleware(lambda req: HttpResponse("ok"))(request)
    assert "X-Request-ID" in response
    uuid.UUID(response["X-Request-ID"])


def test_request_id_respects_incoming_header():
    request = RequestFactory().get("/health", HTTP_X_REQUEST_ID="req-123")
    response = RequestContextMiddleware(lambda req: HttpResponse("ok"))(request)
    assert response["X-Request-ID"] == "req-123"


def test_redaction_masks_sensitive_values():
    assert "redacted" in redact_text("Bearer abc.def.ghi")
    redacted = redact_data(
        {"Authorization": "Bearer secret", "Cookie": "a=b", "safe": "ok"}
    )
    assert redacted["Authorization"] == "[redacted]"
    assert redacted["Cookie"] == "[redacted]"
    assert redacted["safe"] == "ok"


@override_settings(METRICS_ENABLED=True, METRICS_ALLOW_ALL=True)
def test_metrics_endpoint_returns_200():
    observe_http_request("GET", "/health", "200", 0.01)
    response = metrics_view(RequestFactory().get("/metrics"))
    assert response.status_code == 200
    assert response["Content-Type"].startswith(CONTENT_TYPE_LATEST.split(";")[0])
