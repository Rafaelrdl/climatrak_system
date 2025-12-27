# Eventos do MVP

## work_order.closed
Disparado ao fechar uma OS.

**event_name:** `work_order.closed`  
**aggregate:** `work_order`

Payload `data`:
```json
{
  "work_order_id": "uuid",
  "asset_id": "uuid",
  "cost_center_id": "uuid",
  "category": "corrective",
  "labor": [
    { "role": "TecRefrigeracao", "hours": 2.5 }
  ],
  "parts": [
    { "part_id": "uuid", "qty": 1, "unit_cost": 320.00 }
  ],
  "third_party": [
    { "description": "Limpeza química", "amount": 600.00 }
  ]
}
Consumidores:

finance.cost_engine.handle_work_order_closed → cria CostTransaction(labor/parts/third_party)

depois emite cost.entry_posted

cost.entry_posted
Emitido após inserir uma transação de custo no ledger.

Payload data:

json
Copiar código
{
  "cost_transaction_id": "uuid",
  "transaction_type": "labor",
  "amount": 275.00,
  "work_order_id": "uuid",
  "asset_id": "uuid",
  "category": "corrective",
  "cost_center_id": "uuid"
}
Consumidores:

reporting.refresh_monthly_summary (mês atual)

finance.cache.update_budget_actuals (se existir cache)

commitment.approved
Emitido ao aprovar um compromisso.

Payload data:

json
Copiar código
{
  "commitment_id": "uuid",
  "amount": 4300,
  "budget_month": "2026-01-01",
  "cost_center_id": "uuid",
  "category": "parts"
}
Consumidores:

reporting.refresh_monthly_summary (mês do commitment)

savings.event_posted (manual no MVP)
Emitido ao criar um SavingsEvent.

Payload data:

json
Copiar código
{
  "savings_event_id": "uuid",
  "amount": 1500,
  "occurred_at": "2026-01-15T00:00:00-03:00",
  "cost_center_id": "uuid",
  "asset_id": "uuid",
  "event_type": "avoided_failure"
}
Consumidores:

reporting.refresh_monthly_summary