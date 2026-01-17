# Métricas

## Endpoints
- API: `/metrics`
- Worker Celery: `http://worker:9187/` (alvo de scrape Prometheus)

O acesso a `/metrics` é restrito por `METRICS_ENABLED` e lista de permissão de IP.
No docker-compose local, `METRICS_ALLOW_ALL=true` é definido para conveniência.

## Lista de métricas

### HTTP (API)
- `http_requests_total{method,path_template,status}`
- `http_request_duration_seconds_bucket{method,path_template,status}`
- `http_request_duration_seconds_sum{method,path_template,status}`
- `http_request_duration_seconds_count{method,path_template,status}`

### Celery
- `celery_task_total{task_name,status}`
- `celery_task_duration_seconds_bucket{task_name}`
- `celery_task_duration_seconds_sum{task_name}`
- `celery_task_duration_seconds_count{task_name}`

### Domínio / ingest
- `outbox_events_processed_total{status}`
- `ingest_requests_total{status}`

## Regras de cardinalidade
- Não adicione labels de tenant às métricas.
- Use `path_template` (rota) em vez de caminho completo.

## Exemplos PromQL

### Taxa de processamento (requisições/seg)
```
sum(rate(http_requests_total[5m]))
```

### Taxa de erro (5xx)
```
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
```

### Latência p95 (global)
```
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

### Taxa de tarefa Celery por nome
```
sum(rate(celery_task_total[5m])) by (task_name,status)
```

### Duração da tarefa Celery p95
```
histogram_quantile(0.95, sum(rate(celery_task_duration_seconds_bucket[5m])) by (le, task_name))
```

### Taxa de processamento Outbox
```
sum(rate(outbox_events_processed_total[5m])) by (status)
```

### Taxa de requisição Ingest
```
sum(rate(ingest_requests_total[5m])) by (status)
```
