# IA e Rotas — Finance UI

## Rotas Finance
- /finance → Painel do mês
- /finance/budgets → Orçamentos
- /finance/commitments → Compromissos
- /finance/ledger → Ledger
- /finance/savings → Economia
- /finance/settings → Cadastros base

## Pontes (integrações)
- /cmms/work-orders/:id
  - aba Custos (labor/parts/third_party)
  - ação Postar custos / visualizar lançamentos no ledger
- /assets/:id
  - aba Custos do ativo (TCO simplificado: somas do ledger)
- /monitor/alerts/:id (v2)
  - CTA: registrar economia relacionada

## Filtros globais recomendados (header)
- Mês (MonthPicker)
- Site (se houver)
- Centro de custo
- Categoria
- (opcional) Ativo

## Padrões de navegação
- Cards e tabelas devem levar para telas de detalhe (drill-down)
- Toda tabela deve ter filtros + paginação
