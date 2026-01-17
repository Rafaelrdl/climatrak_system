# Rastreamento (OpenTelemetry)

O rastreamento é opcional e protegido por `OTEL_ENABLED`.

## Ativar localmente
Defina as variáveis de ambiente para API e workers:

```
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_SERVICE_NAME=climatrak-backend
OTEL_SAMPLE_RATIO=1.0
```

## O que é instrumentado
- Spans de requisição Django
- Spans de tarefa Celery
- Spans de requisições (HTTP de saída)

## Visualizar rastreamentos
1. Inicie a stack (veja run-local.md).
2. Abra a UI Jaeger: `http://localhost:16686`.
3. Selecione o serviço `climatrak-backend` e pesquise.

## Notas
- O rastreamento é seguro para desabilitar em produção definindo `OTEL_ENABLED=false`.
- Os logs incluem `trace_id` quando um rastreamento está ativo.
