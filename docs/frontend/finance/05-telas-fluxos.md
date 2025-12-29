# Telas e Fluxos — Finance UI

## 1) /finance (Painel do mês)
Componentes:
- SummaryCards (planned/committed/actual/savings)
- Breakdown por categoria (tabela)
- Top desvios (ativos/categorias)
Ações:
- “Criar comprometido”
- “Lançar custo manual”
- “Registrar economia”

## 2) /finance/budgets
- Lista de BudgetPlans (ano)
- Editor de envelopes:
  - categoria + centro de custo + nome + regras
- Editor mensal:
  - grid 12 meses (planned + contingency)

## 3) /finance/ledger
- DataTable com filtros e links
- Drawer/Modal de detalhe do lançamento
- Modal “Novo ajuste (adjustment)”

## 4) /finance/commitments
- Lista por status
- Form novo commitment (com anexos)
- Ações: submit/approve/cancel
- Exibir “impacto no budget” do mês

## 5) /finance/savings
- Lista de SavingsEvent
- Form de criação manual com:
  - tipo, valor, confiança
  - vínculo (OS/Ativo/Alerta)
  - evidências (links/anexos)

## 6) /finance/settings
- Centros de custo
- Categorias (se configurável)
- Regras simples (opcional MVP)

## Integração com OS
Tela: /cmms/work-orders/:id
- Aba Custos:
  - labor (HH), parts, third_party
- Botão “Postar custos” (se OS closed e ainda não postou)
- Link “Ver no ledger” (abre /finance/ledger filtrado por work_order_id)
