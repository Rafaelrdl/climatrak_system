/**
 * Finance Query Hooks (React Query)
 * 
 * Hooks para dados do módulo Finance com cache e invalidation automáticos.
 * Baseado em: docs/frontend/finance/04-hooks-services.md
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '@/services/finance/financeService';
import { financeKeys } from './keys';
import type {
  LedgerFilters,
  CommitmentFilters,
  SavingsFilters,
  ManualTransactionInput,
  CommitmentInput,
  SavingsEventInput,
  CostCenter,
  RateCard,
  BudgetPlan,
} from '@/types/finance';

// ==================== Summary ====================

export function useFinanceSummary(month: string, costCenterId?: string) {
  return useQuery({
    queryKey: financeKeys.summary(month, costCenterId),
    queryFn: () => financeService.getFinanceSummary(month, costCenterId),
    enabled: !!month,
    staleTime: 30_000, // 30 seconds
  });
}

// ==================== Ledger ====================

export function useLedger(filters: LedgerFilters) {
  return useQuery({
    queryKey: financeKeys.ledger.list(filters),
    queryFn: () => financeService.getTransactions(filters),
    staleTime: 30_000,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: ManualTransactionInput) => 
      financeService.createManualTransaction(input),
    onSuccess: (data) => {
      // Invalidate ledger and summary for affected month
      queryClient.invalidateQueries({ queryKey: financeKeys.ledger.all() });
      const month = data.occurred_at.slice(0, 7); // YYYY-MM
      queryClient.invalidateQueries({ 
        queryKey: financeKeys.summary(month) 
      });
    },
  });
}

// ==================== Budgets ====================

export function useBudgetPlans(year?: number) {
  return useQuery({
    queryKey: financeKeys.budgets.plans(year),
    queryFn: () => financeService.getBudgetPlans(year),
    staleTime: 60_000, // 1 minute
  });
}

export function useCreateBudgetPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: Pick<BudgetPlan, 'year' | 'currency' | 'status'>) =>
      financeService.createBudgetPlan(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets.all() });
    },
  });
}

export function useEnvelopes(budgetPlanId: string) {
  return useQuery({
    queryKey: financeKeys.budgets.envelopes(budgetPlanId),
    queryFn: () => financeService.getEnvelopes(budgetPlanId),
    enabled: !!budgetPlanId,
    staleTime: 60_000,
  });
}

// ==================== Commitments ====================

export function useCommitments(filters: CommitmentFilters) {
  return useQuery({
    queryKey: financeKeys.commitments.list(filters),
    queryFn: () => financeService.getCommitments(filters),
    staleTime: 30_000,
  });
}

export function useCommitment(id: string) {
  return useQuery({
    queryKey: financeKeys.commitments.detail(id),
    queryFn: () => financeService.getCommitment(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateCommitment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: CommitmentInput) => financeService.createCommitment(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.commitments.all() });
      // Invalidate summary for budget month
      const month = data.budget_month.slice(0, 7);
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(month) });
    },
  });
}

export function useUpdateCommitment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CommitmentInput> }) =>
      financeService.updateCommitment(id, input),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.commitments.detail(id) });
      queryClient.invalidateQueries({ queryKey: financeKeys.commitments.all() });
    },
  });
}

export function useApproveCommitment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => financeService.approveCommitment(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.commitments.detail(id) });
      queryClient.invalidateQueries({ queryKey: financeKeys.commitments.all() });
      // Invalidate summary for budget month
      const month = data.budget_month.slice(0, 7);
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(month) });
    },
  });
}

export function useCancelCommitment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => financeService.cancelCommitment(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.commitments.detail(id) });
      queryClient.invalidateQueries({ queryKey: financeKeys.commitments.all() });
      // Invalidate summary for budget month
      const month = data.budget_month.slice(0, 7);
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(month) });
    },
  });
}

// ==================== Savings ====================

export function useSavings(filters: SavingsFilters) {
  return useQuery({
    queryKey: financeKeys.savings.list(filters),
    queryFn: () => financeService.getSavingsEvents(filters),
    staleTime: 30_000,
  });
}

export function useCreateSavingsEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: SavingsEventInput) => financeService.createSavingsEvent(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.savings.all() });
      // Invalidate summary for event month
      const month = data.occurred_at.slice(0, 7);
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(month) });
    },
  });
}

// ==================== Cost Centers ====================

export function useCostCenters() {
  return useQuery({
    queryKey: financeKeys.costCenters.list(),
    queryFn: () => financeService.getCostCenters(),
    staleTime: 5 * 60_000, // 5 minutes
  });
}

export function useCreateCostCenter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: Pick<CostCenter, 'name' | 'code' | 'parent_id'>) =>
      financeService.createCostCenter(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.costCenters.all() });
    },
  });
}

export function useUpdateCostCenter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Pick<CostCenter, 'name' | 'code' | 'parent_id'>> }) =>
      financeService.updateCostCenter(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.costCenters.all() });
    },
  });
}

export function useDeleteCostCenter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => financeService.deleteCostCenter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.costCenters.all() });
    },
  });
}

// ==================== Rate Cards ====================

export function useRateCards() {
  return useQuery({
    queryKey: financeKeys.rateCards.list(),
    queryFn: () => financeService.getRateCards(),
    staleTime: 5 * 60_000, // 5 minutes
  });
}

export function useCreateRateCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: Pick<RateCard, 'role' | 'cost_per_hour' | 'effective_from'>) =>
      financeService.createRateCard(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.rateCards.all() });
    },
  });
}
