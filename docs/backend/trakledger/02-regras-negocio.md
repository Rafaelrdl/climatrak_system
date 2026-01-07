# Regras de Negócio — Orçamento, Ledger, Compromissos (MVP)

## 1) Princípios
- Ledger é “fonte da verdade”.
- Custos automáticos devem ser idempotentes.
- Períodos podem ser bloqueados (lock) para auditoria.

## 2) Cálculo de custo de mão de obra (labor)
Entrada:
- WorkOrderTimeEntry: { role, hours }
- RateCard vigente por role

Regra:
- labor_cost = Σ(hours_by_role * rate_card(role))

Saída:
- CostTransaction(transaction_type=labor, category=work_order.category)

## 3) Cálculo de peças/materiais (parts)
MVP:
- parts vêm de WorkOrderPartUsage (qty * unit_cost)
Evolução:
- integrar com InventoryTx (custo médio/último)

## 4) Custos de terceiros (third_party)
MVP:
- lançamento manual em WorkOrderExternalCost
Saída:
- CostTransaction(transaction_type=third_party)

## 5) Categorias
Categorias do Finance e do CMMS devem estar alinhadas:
- preventive | corrective | predictive | improvement | contracts | parts | energy | other

## 6) Comprometidos (Commitments)
Commitment representa reserva de orçamento antes do gasto virar realizado.

Status ativos para “committed” (MVP):
- submitted, approved

Campo `budget_month`:
- sempre 1º dia do mês para evitar ambiguidades.

## 7) Fechamento (lock) de período
Quando mês está locked:
- proibir update/delete de CostTransaction (exceto admin)
- ajustes devem ser feitos como nova transação adjustment, com motivo.

## 8) Idempotência (obrigatório)
- Cada lançamento automático deve ter `idempotency_key` determinístico:
  - exemplo: `wo:{work_order_id}:labor`
  - `wo:{work_order_id}:parts`
  - `wo:{work_order_id}:third_party`
- Unique (tenant_id, idempotency_key) impede duplicação.

## 9) Summary mensal
Summary do mês deve fornecer:
- planned: do budget_month
- committed: commitments ativos no budget_month
- actual: soma do ledger no mês
- savings: soma savings_event no mês