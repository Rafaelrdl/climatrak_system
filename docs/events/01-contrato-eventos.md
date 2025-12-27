# Contrato de Eventos + Outbox

## Objetivo
Padronizar eventos de domínio (CMMS/IoT/Finance) para:
- processamento assíncrono via Celery
- idempotência
- rastreabilidade (auditoria)
- reprocessamento seguro

## Outbox (tabela)
Campos recomendados:
- id (uuid)
- tenant_id
- event_name (string)
- aggregate_type (string)
- aggregate_id (uuid)
- occurred_at (timestamptz)
- payload (jsonb)
- status (pending|processed|failed)
- idempotency_key (string)
- attempts (int), last_error (text)

## Envelope do Evento (padrão)
```json
{
  "event_id": "uuid",
  "tenant_id": "uuid",
  "event_name": "work_order.closed",
  "occurred_at": "2026-01-10T12:00:00-03:00",
  "aggregate": { "type": "work_order", "id": "uuid" },
  "data": { }
}
Regras
Eventos devem ser gravados na outbox na mesma transação do agregado, quando possível.

Consumidores devem ser idempotentes.

Falhas devem gerar retry com backoff e marcar failed após N tentativas.

Idempotência
Cada evento deve possuir idempotency_key.

Consumidores devem armazenar/processar garantindo “exatamente uma vez” no efeito final.