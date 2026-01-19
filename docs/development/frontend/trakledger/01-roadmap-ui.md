# Roadmap UI — Finance (ClimaTrak System)

## Visão geral
Finance é uma capacidade do sistema único (CMMS + Monitoramento + Finance).
A UI do Finance deve conectar dinheiro ao fluxo real: OS, ativos e alertas.

---

## FE-FIN-00 — Fundação (base do Finance UI)
Entregas:
- Rotas Finance + menu + RBAC
- Layout padrão com filtros globais: Mês, Site, Centro de Custo, Categoria
- API layer: financeService + hooks (React Query)
- Componentes base: MoneyCell, DeltaBadge, MonthPicker, DataTable, Upload

---

## FE-FIN-01 — Painel do mês (executivo)
Tela: `/finance`
- Cards: Planejado, Comprometido, Realizado, Economia
- Breakdown por categoria e centro de custo
- Top desvios (ativo/categoria)
- Links rápidos para Ledger/Compromissos/Savings

---

## FE-FIN-02 — Orçamentos (planejado) + Cadastros base
Telas:
- `/finance/settings` (centros de custo, categorias, regras básicas)
- `/finance/budgets` (plano anual + distribuição mensal)

---

## FE-FIN-03 — Ledger (realizado) + Lançamentos manuais
Tela: `/finance/ledger`
- Filtros avançados e links para OS/Ativo
- Criar adjustment (custo manual) com justificativa e anexos

---

## FE-FIN-04 — Integração CMMS (OS → custos)
Tela integrada:
- `/cmms/work-orders/:id` → aba Custos
- Wizard ao fechar OS para confirmar custos e postar

---

## FE-FIN-05 — Compromissos (comprometido) + Aprovação
Tela: `/finance/commitments`
- Lista por status + fluxo approve/cancel
- Criar compromisso a partir de uma OS

---

## FE-FIN-06 — Economia (Savings) + ROI
Tela: `/finance/savings`
- Criar SavingsEvent manual com evidências
- Dashboard de economia acumulada e top economias

---

## FE-FIN-07 — Polimento / Governança / Observabilidade UI
- Auditoria nas telas críticas
- Export CSV
- E2E + validações de permissão

---

## FE-FIN-08 (v2) — Energia e custo por performance HVAC
- Energia real/estimada
- Alertas energéticos com impacto financeiro
- Comparativos por site/ativo
