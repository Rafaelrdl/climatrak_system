# Observabilidade

Esta pasta documenta logging, métricas e rastreamento para ClimaTrak.

## Visão Geral
- Logs: JSON para stdout com request_id e contexto de tenant.
- Métricas: Prometheus para API (/metrics) e Celery (porta do worker 9187).
- Rastreamento: OpenTelemetry opcional, OTLP para collector e Jaeger.

## Documentação
- logging.md
- metrics.md
- tracing.md
- run-local.md
