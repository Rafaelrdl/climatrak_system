/**
 * React Query Keys para Finance
 * 
 * Keys padronizadas para cache e invalidation.
 * Baseado em: docs/frontend/finance/04-hooks-services.md
 */

import type {
  LedgerFilters,
  CommitmentFilters,
  SavingsFilters,
} from '@/types/finance';

export const financeKeys = {
  // Base keys
  all: ['finance'] as const,
  
  // Summary
  summary: (month: string, costCenterId?: string) => 
    [...financeKeys.all, 'summary', month, costCenterId] as const,
  
  // Ledger/Transactions
  ledger: {
    all: () => [...financeKeys.all, 'ledger'] as const,
    list: (filters: LedgerFilters) => [...financeKeys.ledger.all(), 'list', filters] as const,
  },
  
  // Budgets
  budgets: {
    all: () => [...financeKeys.all, 'budgets'] as const,
    plans: (year?: number) => [...financeKeys.budgets.all(), 'plans', year] as const,
    envelopes: (budgetPlanId: string) => 
      [...financeKeys.budgets.all(), 'envelopes', budgetPlanId] as const,
  },
  
  // Commitments
  commitments: {
    all: () => [...financeKeys.all, 'commitments'] as const,
    list: (filters: CommitmentFilters) => 
      [...financeKeys.commitments.all(), 'list', filters] as const,
    detail: (id: string) => [...financeKeys.commitments.all(), 'detail', id] as const,
  },
  
  // Savings
  savings: {
    all: () => [...financeKeys.all, 'savings'] as const,
    list: (filters: SavingsFilters) => [...financeKeys.savings.all(), 'list', filters] as const,
  },
  
  // Cost Centers
  costCenters: {
    all: () => [...financeKeys.all, 'cost-centers'] as const,
    list: () => [...financeKeys.costCenters.all(), 'list'] as const,
  },
  
  // Rate Cards
  rateCards: {
    all: () => [...financeKeys.all, 'rate-cards'] as const,
    list: () => [...financeKeys.rateCards.all(), 'list'] as const,
  },
};
