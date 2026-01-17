"""
Context helpers for observability data across requests and tasks.
"""

from contextvars import ContextVar

_request_id = ContextVar("request_id", default=None)
_trace_id = ContextVar("trace_id", default=None)
_tenant_schema = ContextVar("tenant_schema", default=None)
_tenant_slug = ContextVar("tenant_slug", default=None)
_user_id = ContextVar("user_id", default=None)
_path = ContextVar("path", default=None)
_method = ContextVar("method", default=None)
_status_code = ContextVar("status_code", default=None)
_latency_ms = ContextVar("latency_ms", default=None)
_task_id = ContextVar("task_id", default=None)
_task_name = ContextVar("task_name", default=None)
_device_id = ContextVar("device_id", default=None)


def set_request_context(
    *,
    request_id=None,
    tenant_schema=None,
    tenant_slug=None,
    user_id=None,
    path=None,
    method=None,
):
    if request_id is not None:
        _request_id.set(request_id)
    if tenant_schema is not None:
        _tenant_schema.set(tenant_schema)
    if tenant_slug is not None:
        _tenant_slug.set(tenant_slug)
    if user_id is not None:
        _user_id.set(user_id)
    if path is not None:
        _path.set(path)
    if method is not None:
        _method.set(method)


def set_response_context(*, status_code=None, latency_ms=None):
    if status_code is not None:
        _status_code.set(status_code)
    if latency_ms is not None:
        _latency_ms.set(latency_ms)


def set_task_context(*, task_id=None, task_name=None, tenant_schema=None, tenant_slug=None):
    if task_id is not None:
        _task_id.set(task_id)
    if task_name is not None:
        _task_name.set(task_name)
    if tenant_schema is not None:
        _tenant_schema.set(tenant_schema)
    if tenant_slug is not None:
        _tenant_slug.set(tenant_slug)


def set_device_context(*, device_id=None):
    if device_id is not None:
        _device_id.set(device_id)


def set_trace_context(*, trace_id=None):
    if trace_id is not None:
        _trace_id.set(trace_id)


def clear_context():
    _request_id.set(None)
    _trace_id.set(None)
    _tenant_schema.set(None)
    _tenant_slug.set(None)
    _user_id.set(None)
    _path.set(None)
    _method.set(None)
    _status_code.set(None)
    _latency_ms.set(None)
    _task_id.set(None)
    _task_name.set(None)
    _device_id.set(None)


def get_context():
    return {
        "request_id": _request_id.get(),
        "trace_id": _trace_id.get(),
        "tenant_schema": _tenant_schema.get(),
        "tenant_slug": _tenant_slug.get(),
        "user_id": _user_id.get(),
        "path": _path.get(),
        "method": _method.get(),
        "status_code": _status_code.get(),
        "latency_ms": _latency_ms.get(),
        "task_id": _task_id.get(),
        "task_name": _task_name.get(),
        "device_id": _device_id.get(),
    }
