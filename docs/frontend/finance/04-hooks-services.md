# Hooks e Services — Finance (React Query)

## Estrutura sugerida
- src/services/finance/financeService.ts
- src/hooks/finance/useFinanceSummary.ts
- src/hooks/finance/useLedger.ts
- src/hooks/finance/useBudgets.ts
- src/hooks/finance/useCommitments.ts
- src/hooks/finance/useSavings.ts

## Padrão de keys (exemplo)
financeKeys:
- summary(month, filters)
- ledger.list(filters)
- budgets.plan(year)
- commitments.list(filters)
- savings.list(filters)

## Diretrizes
- Sempre usar queryKey estável
- Paginação server-side: page, pageSize
- enabled condicionado à autenticação
- invalidation pós-mutation:
  - ao criar CostTransaction manual: invalidar ledger + summary do mês
  - ao aprovar commitment: invalidar commitments + summary do mês
  - ao postar custos OS: invalidar ledger + summary + OS detail
