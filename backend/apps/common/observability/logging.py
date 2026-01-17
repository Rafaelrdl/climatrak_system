"""
Structured logging helpers with JSON output and redaction.
"""

import json
import logging
import re
from datetime import datetime, timezone

from django.conf import settings

from .context import get_context

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
JWT_RE = re.compile(r"\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b")
BEARER_RE = re.compile(r"(?i)\bBearer\s+[A-Za-z0-9\-._~+/]+=*")
TOKEN_RE = re.compile(
    r"(?i)\b(token|refresh_token|access_token|password|secret|api_key)\s*[:=]\s*[^\s,;]+"
)

SENSITIVE_KEYS = {
    "authorization",
    "cookie",
    "set-cookie",
    "password",
    "refresh",
    "refresh_token",
    "access_token",
    "token",
    "secret",
    "api_key",
}


def redact_text(value: str) -> str:
    if not value:
        return value
    redacted = JWT_RE.sub("[redacted-token]", value)
    redacted = BEARER_RE.sub("Bearer [redacted-token]", redacted)
    redacted = TOKEN_RE.sub(lambda m: f"{m.group(1)}=[redacted]", redacted)
    redacted = EMAIL_RE.sub("[redacted-email]", redacted)
    return redacted


def redact_data(value):
    if isinstance(value, dict):
        sanitized = {}
        for key, item in value.items():
            if key and str(key).lower() in SENSITIVE_KEYS:
                sanitized[key] = "[redacted]"
            else:
                sanitized[key] = redact_data(item)
        return sanitized
    if isinstance(value, (list, tuple)):
        return [redact_data(item) for item in value]
    if isinstance(value, str):
        return redact_text(value)
    return value


def _get_trace_id():
    try:
        from opentelemetry import trace

        span = trace.get_current_span()
        if not span:
            return None
        ctx = span.get_span_context()
        if not ctx or not ctx.trace_id:
            return None
        return format(ctx.trace_id, "032x")
    except Exception:
        return None


class ContextFilter(logging.Filter):
    def filter(self, record):
        ctx = get_context()
        for key, value in ctx.items():
            if getattr(record, key, None) is None:
                setattr(record, key, value)

        if getattr(record, "trace_id", None) is None:
            record.trace_id = _get_trace_id()

        record.service = getattr(settings, "SERVICE_NAME", "climatrak-backend")
        record.env = getattr(settings, "ENVIRONMENT", "unknown")
        return True


class RedactionFilter(logging.Filter):
    def filter(self, record):
        message = record.getMessage()
        record.redacted_message = redact_text(message)
        return True


class JSONFormatter(logging.Formatter):
    def format(self, record):
        message = getattr(record, "redacted_message", record.getMessage())
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc)
            .isoformat()
            .replace("+00:00", "Z"),
            "level": record.levelname,
            "service": getattr(record, "service", None),
            "env": getattr(record, "env", None),
            "logger": record.name,
            "message": message,
            "request_id": getattr(record, "request_id", None),
            "trace_id": getattr(record, "trace_id", None),
            "tenant": getattr(record, "tenant_slug", None)
            or getattr(record, "tenant_schema", None),
            "tenant_schema": getattr(record, "tenant_schema", None),
            "tenant_slug": getattr(record, "tenant_slug", None),
            "user_id": getattr(record, "user_id", None),
            "path": getattr(record, "path", None),
            "method": getattr(record, "method", None),
            "status_code": getattr(record, "status_code", None),
            "latency_ms": getattr(record, "latency_ms", None),
            "task_id": getattr(record, "task_id", None),
            "task_name": getattr(record, "task_name", None),
            "device_id": getattr(record, "device_id", None),
            "event": getattr(record, "event", None),
        }

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=True, separators=(",", ":"))


def build_logging_config(log_level: str) -> dict:
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "context": {"()": "apps.common.observability.logging.ContextFilter"},
            "redaction": {"()": "apps.common.observability.logging.RedactionFilter"},
        },
        "formatters": {
            "json": {"()": "apps.common.observability.logging.JSONFormatter"},
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "json",
                "filters": ["context", "redaction"],
            },
        },
        "root": {
            "handlers": ["console"],
            "level": log_level,
        },
        "loggers": {
            "django": {
                "handlers": ["console"],
                "level": log_level,
                "propagate": False,
            },
            "django.db.backends": {
                "handlers": ["console"],
                "level": "WARNING",
                "propagate": False,
            },
            "django.request": {
                "handlers": ["console"],
                "level": log_level,
                "propagate": False,
            },
            "django.server": {
                "handlers": ["console"],
                "level": log_level,
                "propagate": False,
            },
            "celery": {
                "handlers": ["console"],
                "level": log_level,
                "propagate": False,
            },
        },
    }
