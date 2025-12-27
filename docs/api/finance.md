# API — Finance (MVP)

## Convenções
- Base: `/api/v1`
- Autenticação: JWT/Session (o que já existir)
- Multi-tenant: por schema (django-tenants) ou header, conforme padrão do projeto
- Respostas: `{ "data": ..., "meta": ... }` (se já houver padrão)
- Erros:
  - 400 validação
  - 401/403 permissão
  - 409 conflito (idempotência, lock)

---

## Cost Centers
### Listar / Criar
- `GET /finance/cost-centers`
- `POST /finance/cost-centers`
```json
{ "name": "Central Água Gelada", "parent_id": null, "code": "CAG-01" }

Rate Cards

GET /finance/rate-cards

POST /finance/rate-cards
{ "role": "TecRefrigeracao", "cost_per_hour": 110.0, "effective_from": "2026-01-01" }

Budget
Criar Plano

POST /finance/budget-plans
{ "year": 2026, "currency": "BRL", "status": "draft" }


Criar Envelope

POST /finance/envelopes
{
  "budget_plan_id": "uuid",
  "cost_center_id": "uuid",
  "category": "corrective",
  "name": "Chillers - Corretiva",
  "rules": { "asset_ids": ["uuid1","uuid2"] }
}


Atualizar Meses

PUT /finance/envelopes/{id}/months
{
  "months": [
    { "month": 1, "planned_amount": 12000, "contingency_amount": 2000 }
  ]
}

Ledger (Cost Transactions)
Listar

GET /finance/transactions?from=2026-01-01&to=2026-01-31&cost_center_id=...&asset_id=...&work_order_id=...&category=...&type=...

Ajuste manual

POST /finance/transactions/manual
{
  "occurred_at": "2026-01-12T10:00:00-03:00",
  "amount": 850.00,
  "currency": "BRL",
  "transaction_type": "adjustment",
  "category": "other",
  "cost_center_id": "uuid",
  "asset_id": "uuid",
  "work_order_id": "uuid",
  "meta": { "reason": "Ajuste NF", "invoice": "12345" }
}
Erros comuns:

409 se mês locked

403 se sem permissão

Commitments
Criar

POST /finance/commitments
{
  "cost_center_id": "uuid",
  "category": "parts",
  "amount": 4300,
  "currency": "BRL",
  "vendor_id": "uuid",
  "work_order_id": "uuid",
  "status": "submitted",
  "budget_month": "2026-01-01",
  "due_date": "2026-01-20",
  "notes": "Cotação compressor",
  "attachments": ["minio://bucket/key1.pdf"]
}
Aprovar / Cancelar

POST /finance/commitments/{id}/approve

POST /finance/commitments/{id}/cancel


Savings Events (manual no MVP)

POST /finance/savings-events

GET /finance/savings-events?from&to&asset_id&cost_center_id

Payload:
{
  "event_type": "avoided_failure",
  "occurred_at": "2026-01-15T08:00:00-03:00",
  "savings_amount": 9000,
  "currency": "BRL",
  "confidence": "med",
  "cost_center_id": "uuid",
  "asset_id": "uuid",
  "work_order_id": "uuid",
  "alert_id": "uuid",
  "baseline_ref": { "model": "severity_table_v1" },
  "explanation": "Intervenção preditiva antes de falha do compressor",
  "evidence_links": { "before_after_chart": "https://..." }
}


Summary (dashboard mensal)

GET /finance/summary/budget?month=2026-01&cost_center_id=uuid

Response:
{
  "month": "2026-01",
  "planned": 50000,
  "committed": 12000,
  "actual": 18000,
  "savings": 1500,
  "variance": 32000,
  "by_category": [
    { "category": "corrective", "planned": 12000, "committed": 5000, "actual": 7000, "savings": 0 }
  ]
}