# Roadmap — Finance no TrakSense Backend (unificado)

## M0 — Foundation
- Criar app finance (CostCenter, RateCard, Budget*)
- Ledger (CostTransaction) com idempotência e lock
- Outbox base (eventos)

## M1 — Cost Engine (OS → Ledger)
- WorkOrder com horas/peças/terceiros
- Fechar OS publica `work_order.closed`
- Worker cria lançamentos e emite `cost.entry_posted`

## M2 — Commitments (Comprometido)
- Commitment básico + approve/cancel
- Summary mensal inclui comprometido

## M3 — Savings manual + Reporting
- SavingsEvent manual com evidência
- Summary mensal inclui economia
- Export CSV

## M4 (v2) — Energia + Savings automático
- Tarifa + custo diário via telemetria/estimativa
- Baseline antes/depois

## M5 (v2) — BAR/Forecast
- Risk snapshots e priorização por risco financeiro