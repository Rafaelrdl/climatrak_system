---
applyTo: "backend/apps/finance/**"
---

## Finance — Orçamento Vivo (MVP)
Referências obrigatórias:
- docs/finance/00-mvp-spec.md
- docs/finance/01-erd.md
- docs/finance/02-regras-negocio.md
- docs/events/*

Regras:
- Ledger (CostTransaction) é fonte da verdade.
- Idempotência obrigatória:
  - `idempotency_key` determinística (ex: wo:{id}:labor)
  - unique (tenant_id, idempotency_key)
- Lock mensal:
  - transação locked não pode ser alterada; usar adjustment
- Eventos MVP:
  - work_order.closed
  - cost.entry_posted
  - commitment.approved
  - savings.event_posted
