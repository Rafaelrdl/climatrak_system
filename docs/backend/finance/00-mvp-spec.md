# MVP Spec — Finance (Orçamento Vivo) no TrakSense Backend

## Objetivo do MVP
Entregar um módulo financeiro que:
- permita cadastrar orçamento por mês e categoria,
- capture custos reais automaticamente a partir de Ordens de Serviço (OS),
- mostre dashboard com Planejado vs Comprometido vs Realizado,
- suporte compromissos básicos e economia manual.

## Escopo (inclui)
### Dados
- CostCenter (hierarquia)
- RateCard (custo/h por perfil + vigência)
- BudgetPlan (ano) + BudgetEnvelope (categoria/centro) + BudgetMonth (valores mensais)
- CostTransaction (ledger) com idempotency_key e lock de período
- Commitment básico (comprometido)
- SavingsEvent manual (economia com evidência)

### Regras
- Fechar OS → gerar custos no ledger:
  - labor (RateCard)
  - parts (unit_cost ou integração com inventário simples)
  - third_party (valor lançado)
- Planejado vs Real:
  - real = soma ledger no mês
- Comprometido:
  - soma commitments com status ativo (submitted/approved)

### APIs
- CRUD centros de custo, rate cards, budgets
- Ledger list + manual adjustments
- Commitments + approve/cancel
- Summary mensal (planejado/comprometido/realizado/economia)

## Fora de escopo (MVP)
- Cálculo automático de energia (tarifa + job diário)
- Economia automática (baseline antes/depois)
- BAR/Forecast automático (risk snapshots)
- Workflow completo de compras (ordered/received/paid)
- Particionamento do ledger por mês (apenas índices no MVP)

## Critérios de sucesso
- Fechamento de OS gera custos e aparece no dashboard financeiro do mês.
- Gestor consegue cadastrar orçamento e ver desvios sem planilha.
- Estrutura pronta para evoluir para energia/economia automática.

## Checklist de pronto (DoD)
- [ ] Migrations aplicam sem erros em tenant novo
- [ ] Endpoints com RBAC mínimo
- [ ] Jobs idempotentes
- [ ] Testes de cálculo de labor/parts
- [ ] Summary mensal responde rápido em volume moderado
- [ ] Documentação do módulo completa em `/docs`
