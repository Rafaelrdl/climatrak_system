# Executar localmente

## Iniciar a stack
A partir da raiz do repositório:

```
docker compose -f infra/docker-compose.yml up -d
```

## Verificar métricas

### Métricas da API
```
curl http://localhost:8000/metrics
```

### Métricas do Celery
```
curl http://localhost:9187/metrics
```

## Grafana + Prometheus
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` (admin/admin)
- Dashboard: "ClimaTrak Observability"

## Rastreamento (opcional)
1. Defina variáveis de ambiente para API/worker: `OTEL_ENABLED=true`
2. Reinicie os containers
3. Jaeger UI: `http://localhost:16686`

## Solução de problemas
- Se `/metrics` retorna 404, defina `METRICS_ENABLED=true`.
- Se Prometheus não conseguir fazer scrape da API, defina `METRICS_ALLOW_ALL=true` no compose.
- Se as métricas do worker estão faltando, garanta que `CELERY_METRICS_ENABLED=true` e a porta 9187 está aberta.
