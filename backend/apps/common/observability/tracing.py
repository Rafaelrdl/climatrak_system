"""
OpenTelemetry tracing setup (optional).
"""

import logging

from django.conf import settings

logger = logging.getLogger(__name__)

_TRACING_CONFIGURED = False


def configure_tracing():
    global _TRACING_CONFIGURED
    if _TRACING_CONFIGURED:
        return
    if not getattr(settings, "OTEL_ENABLED", False):
        return

    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
            OTLPSpanExporter,
        )
        from opentelemetry.instrumentation.celery import CeleryInstrumentor
        from opentelemetry.instrumentation.django import DjangoInstrumentor
        from opentelemetry.instrumentation.requests import RequestsInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.sdk.trace.sampling import ParentBased, TraceIdRatioBased

        service_name = getattr(settings, "OTEL_SERVICE_NAME", None) or getattr(
            settings, "SERVICE_NAME", "climatrak-backend"
        )
        environment = getattr(settings, "ENVIRONMENT", "unknown")
        resource = Resource.create(
            {
                "service.name": service_name,
                "deployment.environment": environment,
            }
        )

        ratio = getattr(settings, "OTEL_SAMPLE_RATIO", 1.0)
        sampler = ParentBased(TraceIdRatioBased(ratio))
        provider = TracerProvider(resource=resource, sampler=sampler)

        endpoint = getattr(
            settings, "OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317"
        )
        exporter = OTLPSpanExporter(
            endpoint=endpoint, insecure=endpoint.startswith("http://")
        )
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        DjangoInstrumentor().instrument()
        CeleryInstrumentor().instrument()
        RequestsInstrumentor().instrument()

        _TRACING_CONFIGURED = True
        logger.info("OpenTelemetry tracing configured")
    except Exception as exc:
        logger.warning("OpenTelemetry setup skipped: %s", exc)
