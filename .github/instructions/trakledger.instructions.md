---
applyTo: "backend/apps/TrakLedger/**"
---

## TrakLedger — Orçamento Vivo (MVP)
Referências obrigatórias:
- docs/TrakLedger/00-mvp-spec.md
- docs/TrakLedger/01-erd.md
- docs/TrakLedger/02-regras-negocio.md
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
