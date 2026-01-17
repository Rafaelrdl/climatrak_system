"""
Prometheus metrics definitions and helpers.
"""

from prometheus_client import Counter, Histogram, REGISTRY

HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path_template", "status"],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "path_template", "status"],
)

CELERY_TASK_TOTAL = Counter(
    "celery_task_total",
    "Total Celery task executions",
    ["task_name", "status"],
)

CELERY_TASK_DURATION_SECONDS = Histogram(
    "celery_task_duration_seconds",
    "Celery task execution latency in seconds",
    ["task_name"],
)

OUTBOX_EVENTS_PROCESSED_TOTAL = Counter(
    "outbox_events_processed_total",
    "Outbox events processed",
    ["status"],
)

INGEST_REQUESTS_TOTAL = Counter(
    "ingest_requests_total",
    "Ingest requests received",
    ["status"],
)


def observe_http_request(method: str, path_template: str, status: str, duration_seconds: float):
    HTTP_REQUESTS_TOTAL.labels(
        method=method,
        path_template=path_template,
        status=status,
    ).inc()
    HTTP_REQUEST_DURATION_SECONDS.labels(
        method=method,
        path_template=path_template,
        status=status,
    ).observe(duration_seconds)


def observe_celery_task(task_name: str, status: str, duration_seconds: float | None):
    CELERY_TASK_TOTAL.labels(task_name=task_name, status=status).inc()
    if duration_seconds is not None:
        CELERY_TASK_DURATION_SECONDS.labels(task_name=task_name).observe(
            duration_seconds
        )


def observe_outbox_event(status: str):
    OUTBOX_EVENTS_PROCESSED_TOTAL.labels(status=status).inc()


def observe_ingest_request(status: str):
    INGEST_REQUESTS_TOTAL.labels(status=status).inc()


def get_metrics_registry():
    return REGISTRY
