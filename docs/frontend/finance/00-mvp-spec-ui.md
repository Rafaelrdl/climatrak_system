# MVP UI Spec — Finance (Orçamento Vivo) no Frontend

## Objetivo do MVP (UI)
Entregar UI que permita:
- visualizar o dashboard mensal (Planejado vs Comprometido vs Realizado + Economia)
- cadastrar orçamento (planejado)
- consultar ledger (realizado) e lançar custo manual (adjustment)
- criar e aprovar compromissos básicos (comprometido)
- registrar economia manual (SavingsEvent)
- integrar custos à OS (aba Custos e fechamento de OS com confirmação)

## Escopo (inclui)
### Telas
- /finance (Painel do mês)
- /finance/budgets (Orçamentos)
- /finance/ledger (Ledger)
- /finance/commitments (Compromissos)
- /finance/savings (Economia)
- /finance/settings (Cadastros base)

### Integrações obrigatórias
- /cmms/work-orders/:id
  - Aba “Custos”
  - Ação “Postar custos” (após fechamento)

### Componentes base
- MoneyCell, DeltaBadge, MonthPicker, CostCenterSelect, CategorySelect
- DataTable com filtros + paginação
- Upload de anexos (NF/cotações)

## Fora de escopo (MVP)
- Energia e custo automático por telemetria (v2)
- Economia automática por baseline (v2)
- BAR/Forecast (v2)
- Workflow de compras completo (ordered/received/paid)

## Critérios de sucesso
- Gestor consegue ver o mês e entender desvios (sem planilha)
- Técnico fecha OS e custos aparecem no ledger automaticamente (via backend)
- Diretor consegue ver economia registrada (manual) e abrir evidências

## Definition of Done (UI)
- [ ] Rotas protegidas por RBAC
- [ ] Estados: loading/empty/error padronizados
- [ ] React Query com keys consistentes
- [ ] Tabelas com filtros e paginação
- [ ] Formulários com validação
- [ ] E2E mínimo: fechar OS → custo aparece no ledger → painel atualiza
