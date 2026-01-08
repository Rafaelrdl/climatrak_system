# Eventos TrakService

Eventos publicados pelo módulo TrakService (Field Service).

---

## trakservice.quote.approved.v1

Disparado quando um orçamento (Quote) é aprovado.

**event_name:** `trakservice.quote.approved.v1`  
**aggregate_type:** `quote`  
**aggregate_id:** UUID do Quote

### Payload `data`

```json
{
  "quote_id": "uuid",
  "quote_number": "QT-20260108-0001",
  "work_order_id": "uuid",
  "status": "approved",
  "total": 1450.00,
  "subtotal_services": 1000.00,
  "subtotal_materials": 500.00,
  "discount_percent": 5.00,
  "discount_amount": 50.00,
  "approved_at": "2026-01-08T10:30:00-03:00",
  "approved_by_id": "uuid",
  "valid_until": "2026-02-08",
  "item_count": 3
}
```

### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `quote_id` | UUID | ID único do orçamento |
| `quote_number` | string | Número legível do orçamento |
| `work_order_id` | UUID | ID da OS relacionada (pode ser null) |
| `status` | string | Status atual (sempre "approved" neste evento) |
| `total` | decimal | Valor total com descontos aplicados |
| `subtotal_services` | decimal | Total de serviços antes do desconto |
| `subtotal_materials` | decimal | Total de materiais antes do desconto |
| `discount_percent` | decimal | Percentual de desconto aplicado (0-100) |
| `discount_amount` | decimal | Valor do desconto em reais |
| `approved_at` | datetime | Data/hora da aprovação (ISO 8601) |
| `approved_by_id` | UUID | ID do usuário que aprovou (pode ser null) |
| `valid_until` | date | Data de validade do orçamento (ISO 8601) |
| `item_count` | int | Quantidade de itens no orçamento |

### Efeitos

Quando o evento é processado:

1. **Transações no TrakLedger**: O `QuoteFinanceService` cria automaticamente:
   - `CostTransaction` para serviços (tipo `THIRD_PARTY`)
   - `CostTransaction` para materiais (tipo `PARTS`)
   - Idempotência via `idempotency_key`:
     - Serviços: `quote:{quote_id}:service`
     - Materiais: `quote:{quote_id}:material`

2. **Lock mensal**: Se o mês está bloqueado, lança `FinanceLockError` e as transações não são criadas. O orçamento continua aprovado.

### Consumidores

| Consumidor | Ação |
|------------|------|
| `reporting.refresh_quote_summary` | Atualiza métricas de orçamentos |
| `notification.quote_approved` | Envia notificação ao solicitante |

### Idempotência

O evento usa `idempotency_key`: `quote:{quote_id}:approved:v1`

Reprocessar o evento **não** duplica transações no TrakLedger, pois cada transação tem sua própria idempotency_key.

---

## Eventos Futuros (Planejados)

### trakservice.dispatch.created.v1
Disparado quando um despacho é criado.

### trakservice.dispatch.started.v1
Disparado quando um técnico inicia um despacho.

### trakservice.dispatch.completed.v1
Disparado quando um técnico conclui um despacho.

### trakservice.route.optimized.v1
Disparado quando uma rota é otimizada.

### trakservice.ping.received.v1
Disparado quando um ping de localização é recebido (alta frequência - considerar batch).
