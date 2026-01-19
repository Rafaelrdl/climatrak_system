# Backlog — Frontend Finance (Issues prontas)

## Milestone FE-M0 — Fundação
### [FE-FIN-001] Criar rotas Finance + menu + guard RBAC
**Labels:** feature, frontend  
**Refs:** docs/frontend/finance/02-ia-rotas.md, 06-rbac-permissoes.md

Aceite:
- Rotas /finance/* funcionando
- Guard de rota por role
- Menu item Finance visível conforme role

---

### [FE-FIN-002] Criar componentes base (MoneyCell, DeltaBadge, MonthPicker, DataTable, Uploader)
**Labels:** feature, frontend  
**Refs:** 03-componentes-base.md

Aceite:
- Componentes reutilizáveis prontos
- DataTable suporta paginação e filtros server-side
- Upload de anexos com UI clara

---

### [FE-FIN-003] Criar financeService + hooks (React Query keys padrão)
**Labels:** feature, frontend  
**Refs:** 04-hooks-services.md, docs/api/finance.md

Aceite:
- financeService com métodos principais
- hooks useFinanceSummary/useLedger/useBudgets/useCommitments/useSavings
- invalidation correta pós-mutation

---

## Milestone FE-M1 — Painel do mês
### [FE-FIN-004] Tela /finance (Painel do mês) com KPIs + breakdown
**Labels:** feature, frontend  
**Refs:** 05-telas-fluxos.md, docs/api/finance.md

Aceite:
- Cards planned/committed/actual/savings
- Breakdown por categoria
- Links para ledger/commitments/savings

---

## Milestone FE-M2 — Orçamentos + Cadastros
### [FE-FIN-005] Tela /finance/budgets (plano anual + editor mensal)
**Labels:** feature, frontend  
**Refs:** 05-telas-fluxos.md, docs/api/finance.md

### [FE-FIN-006] Tela /finance/settings (centros de custo + categorias se aplicável)
**Labels:** feature, frontend  
**Refs:** 05-telas-fluxos.md

---

## Milestone FE-M3 — Ledger
### [FE-FIN-007] Tela /finance/ledger com filtros e detalhe
**Labels:** feature, frontend  
**Refs:** 05-telas-fluxos.md, docs/api/finance.md

### [FE-FIN-008] Modal de ajuste manual (adjustment) + anexos
**Labels:** feature, frontend  
**Refs:** docs/api/finance.md

---

## Milestone FE-M4 — Integração com OS
### [FE-FIN-009] Aba Custos na OS + Postar custos + link “Ver no ledger”
**Labels:** feature, frontend  
**Refs:** 05-telas-fluxos.md

Aceite:
- Aba custos exibe labor/parts/third_party
- Botão postar custos respeita permissão
- Link abre ledger filtrado por work_order_id

---

## Milestone FE-M5 — Comprometidos + Economia
### [FE-FIN-010] Tela /finance/commitments com fluxo submit/approve/cancel
**Labels:** feature, frontend  
**Refs:** 05-telas-fluxos.md, docs/api/finance.md

### [FE-FIN-011] Tela /finance/savings + criar SavingsEvent manual
**Labels:** feature, frontend  
**Refs:** 05-telas-fluxos.md, docs/api/finance.md
