# Backlog — Issues prontas

## M0 - Finance Core Foundation

### [FIN-001] Criar app finance + modelos base (CostCenter, RateCard, Budget*)
**Labels:** epic, backend, db  
**Referências:** docs/finance/01-erd.md, docs/finance/02-regras-negocio.md

**Objetivo**
Implementar núcleo de centros de custo, rate card e orçamento por envelopes.

**Aceite**
- CRUD CostCenter com hierarquia
- CRUD RateCard com vigência
- BudgetPlan/Envelope/Month funcionando

**Checklist**
- models + migrations
- testes unitários

---

### [FIN-002] Implementar Ledger (CostTransaction) com idempotência e lock de período
**Labels:** feature, backend, db, tests  
**Dependências:** FIN-001  
**Referências:** docs/finance/02-regras-negocio.md

**Aceite**
- Unique (tenant_id, idempotency_key)
- Lock impede update/delete sem permissão
- Ajuste manual possível com auditoria

---

### [EVT-001] Implementar Domain Outbox (tabela + dispatcher base)
**Labels:** epic, backend, db, celery, tests  
**Referências:** docs/events/01-contrato-eventos.md

**Aceite**
- Worker consome pending e marca processed/failed
- Reprocessamento seguro

---

### [API-001] APIs Finance base (CostCenter, RateCard, Budget*)
**Labels:** feature, api, backend, tests  
**Dependências:** FIN-001

**Aceite**
- Endpoints CRUD protegidos
- Paginação/filtros

---

## M1 - Cost Engine (OS → Ledger)

### [CMMS-001] WorkOrder: suportar horas, peças e terceiros (mínimo para custos)
**Labels:** feature, backend, db, tests  
**Referências:** docs/product/02-personas-e-historias.md

**Aceite**
- TimeEntry por role/hours
- PartUsage com qty/unit_cost ou link inventário
- ExternalCost com amount e anexos

---

### [FIN-003] Publicar evento work_order.closed ao fechar OS
**Labels:** feature, backend, celery, tests  
**Dependências:** EVT-001, CMMS-001  
**Referências:** docs/events/02-eventos-mvp.md

**Aceite**
- Evento criado na outbox ao fechar OS
- Payload completo

---

### [FIN-004] Cost Engine: consumir work_order.closed e postar ledger + emitir cost.entry_posted
**Labels:** epic, celery, backend, db, tests  
**Dependências:** FIN-002, FIN-003

**Aceite**
- Lançamentos labor/parts/third_party idempotentes
- Evento cost.entry_posted emitido
- Testes de cálculo

---

### [API-002] APIs do Ledger (listar + ajuste manual)
**Labels:** feature, api, backend, tests  
**Dependências:** FIN-002

---
## M2 - Commitments

### [FIN-005] Commitment model + estados básicos
**Labels:** feature, backend, db, tests  
**Dependências:** FIN-001

### [API-003] APIs Commitments + approve/cancel
**Labels:** feature, api, backend, tests  
**Dependências:** FIN-005

### [FIN-006] Evento commitment.approved + refresh summary
**Labels:** celery, backend, reporting, tests  
**Dependências:** EVT-001, FIN-005

---


## M3 - Savings manual + Reporting

### [FIN-007] SavingsEvent manual (com evidências)
**Labels:** feature, backend, db, tests  
**Dependências:** FIN-001
aq
### [API-004] APIs SavingsEvent
**Labels:** api, backend, tests  
**Dependências:** FIN-007

### [RPT-001] Summary mensal (planejado vs comprometido vs realizado + economia)
**Labels:** reporting, backend, db, performance, tests  
**Dependências:** FIN-001, FIN-002, FIN-005, FIN-007

**Aceite**
- Endpoint summary retorna KPIs e breakdown por categoria
- Performance aceitável (índices + tabela summary)

---

## V2 (M4/M5)
- [ENG-001] Energia (tarifa + custo diário) + ledger energy
- [SAV-001] Savings automático via baseline
- [RSK-001] BAR/Forecast (RiskSnapshot)