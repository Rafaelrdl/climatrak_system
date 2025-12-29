/**
 * Finance Service
 * 
 * Serviço centralizado para todas as operações da API Finance.
 * Baseado em: docs/backend/api/finance.md
 */

import { api } from '@/lib';
import type {
  CostCenter,
  RateCard,
  BudgetPlan,
  Envelope,
  EnvelopeMonth,
  CostTransaction,
  ManualTransactionInput,
  Commitment,
  CommitmentInput,
  SavingsEvent,
  SavingsEventInput,
  FinanceSummary,
  LedgerFilters,
  CommitmentFilters,
  SavingsFilters,
  PaginatedResponse,
  ApiResponse,
} from '@/types/finance';

const BASE_URL = '/finance';

// ==================== Cost Centers ====================

export async function getCostCenters(): Promise<CostCenter[]> {
  const { data } = await api.get<ApiResponse<CostCenter[]>>(`${BASE_URL}/cost-centers`);
  return data.data ?? data as unknown as CostCenter[];
}

export async function createCostCenter(
  input: Pick<CostCenter, 'name' | 'code' | 'parent_id'>
): Promise<CostCenter> {
  const { data } = await api.post<ApiResponse<CostCenter>>(`${BASE_URL}/cost-centers`, input);
  return data.data ?? data as unknown as CostCenter;
}

export async function updateCostCenter(
  id: string,
  input: Partial<Pick<CostCenter, 'name' | 'code' | 'parent_id'>>
): Promise<CostCenter> {
  const { data } = await api.patch<ApiResponse<CostCenter>>(`${BASE_URL}/cost-centers/${id}`, input);
  return data.data ?? data as unknown as CostCenter;
}

export async function deleteCostCenter(id: string): Promise<void> {
  await api.delete(`${BASE_URL}/cost-centers/${id}`);
}

// ==================== Rate Cards ====================

export async function getRateCards(): Promise<RateCard[]> {
  const { data } = await api.get<ApiResponse<RateCard[]>>(`${BASE_URL}/rate-cards`);
  return data.data ?? data as unknown as RateCard[];
}

export async function createRateCard(
  input: Pick<RateCard, 'role' | 'cost_per_hour' | 'effective_from'>
): Promise<RateCard> {
  const { data } = await api.post<ApiResponse<RateCard>>(`${BASE_URL}/rate-cards`, input);
  return data.data ?? data as unknown as RateCard;
}

// ==================== Budget Plans ====================

export async function getBudgetPlans(year?: number): Promise<BudgetPlan[]> {
  const params = year ? { year } : {};
  const { data } = await api.get<ApiResponse<BudgetPlan[]>>(`${BASE_URL}/budget-plans`, { params });
  return data.data ?? data as unknown as BudgetPlan[];
}

export async function createBudgetPlan(
  input: Pick<BudgetPlan, 'year' | 'currency' | 'status'>
): Promise<BudgetPlan> {
  const { data } = await api.post<ApiResponse<BudgetPlan>>(`${BASE_URL}/budget-plans`, input);
  return data.data ?? data as unknown as BudgetPlan;
}

export async function updateBudgetPlan(
  id: string,
  input: Partial<Pick<BudgetPlan, 'status'>>
): Promise<BudgetPlan> {
  const { data } = await api.patch<ApiResponse<BudgetPlan>>(`${BASE_URL}/budget-plans/${id}`, input);
  return data.data ?? data as unknown as BudgetPlan;
}

// ==================== Envelopes ====================

export async function getEnvelopes(budgetPlanId: string): Promise<Envelope[]> {
  const { data } = await api.get<ApiResponse<Envelope[]>>(`${BASE_URL}/envelopes`, {
    params: { budget_plan_id: budgetPlanId },
  });
  return data.data ?? data as unknown as Envelope[];
}

export async function createEnvelope(
  input: Omit<Envelope, 'id' | 'created_at' | 'updated_at'>
): Promise<Envelope> {
  const { data } = await api.post<ApiResponse<Envelope>>(`${BASE_URL}/envelopes`, input);
  return data.data ?? data as unknown as Envelope;
}

export async function updateEnvelopeMonths(
  envelopeId: string,
  months: EnvelopeMonth[]
): Promise<Envelope> {
  const { data } = await api.put<ApiResponse<Envelope>>(
    `${BASE_URL}/envelopes/${envelopeId}/months`,
    { months }
  );
  return data.data ?? data as unknown as Envelope;
}

// ==================== Ledger (Transactions) ====================

export async function getTransactions(
  filters: LedgerFilters
): Promise<PaginatedResponse<CostTransaction>> {
  const { data } = await api.get<PaginatedResponse<CostTransaction>>(
    `${BASE_URL}/transactions`,
    { params: filters }
  );
  return data;
}

export async function createManualTransaction(
  input: ManualTransactionInput
): Promise<CostTransaction> {
  const { data } = await api.post<ApiResponse<CostTransaction>>(
    `${BASE_URL}/transactions/manual`,
    input
  );
  return data.data ?? data as unknown as CostTransaction;
}

// ==================== Commitments ====================

export async function getCommitments(
  filters: CommitmentFilters
): Promise<PaginatedResponse<Commitment>> {
  const { data } = await api.get<PaginatedResponse<Commitment>>(
    `${BASE_URL}/commitments`,
    { params: filters }
  );
  return data;
}

export async function getCommitment(id: string): Promise<Commitment> {
  const { data } = await api.get<ApiResponse<Commitment>>(`${BASE_URL}/commitments/${id}`);
  return data.data ?? data as unknown as Commitment;
}

export async function createCommitment(input: CommitmentInput): Promise<Commitment> {
  const { data } = await api.post<ApiResponse<Commitment>>(`${BASE_URL}/commitments`, input);
  return data.data ?? data as unknown as Commitment;
}

export async function updateCommitment(
  id: string,
  input: Partial<CommitmentInput>
): Promise<Commitment> {
  const { data } = await api.patch<ApiResponse<Commitment>>(`${BASE_URL}/commitments/${id}`, input);
  return data.data ?? data as unknown as Commitment;
}

export async function approveCommitment(id: string): Promise<Commitment> {
  const { data } = await api.post<ApiResponse<Commitment>>(`${BASE_URL}/commitments/${id}/approve`);
  return data.data ?? data as unknown as Commitment;
}

export async function cancelCommitment(id: string): Promise<Commitment> {
  const { data } = await api.post<ApiResponse<Commitment>>(`${BASE_URL}/commitments/${id}/cancel`);
  return data.data ?? data as unknown as Commitment;
}

// ==================== Savings Events ====================

export async function getSavingsEvents(
  filters: SavingsFilters
): Promise<PaginatedResponse<SavingsEvent>> {
  const { data } = await api.get<PaginatedResponse<SavingsEvent>>(
    `${BASE_URL}/savings-events`,
    { params: filters }
  );
  return data;
}

export async function createSavingsEvent(input: SavingsEventInput): Promise<SavingsEvent> {
  const { data } = await api.post<ApiResponse<SavingsEvent>>(`${BASE_URL}/savings-events`, input);
  return data.data ?? data as unknown as SavingsEvent;
}

// ==================== Summary ====================

export async function getFinanceSummary(
  month: string, // YYYY-MM
  costCenterId?: string
): Promise<FinanceSummary> {
  const params: Record<string, string> = { month };
  if (costCenterId) {
    params.cost_center_id = costCenterId;
  }
  const { data } = await api.get<ApiResponse<FinanceSummary>>(
    `${BASE_URL}/summary/budget`,
    { params }
  );
  return data.data ?? data as unknown as FinanceSummary;
}

// ==================== Export all ====================

export const financeService = {
  // Cost Centers
  getCostCenters,
  createCostCenter,
  updateCostCenter,
  deleteCostCenter,
  
  // Rate Cards
  getRateCards,
  createRateCard,
  
  // Budget Plans
  getBudgetPlans,
  createBudgetPlan,
  updateBudgetPlan,
  
  // Envelopes
  getEnvelopes,
  createEnvelope,
  updateEnvelopeMonths,
  
  // Ledger
  getTransactions,
  createManualTransaction,
  
  // Commitments
  getCommitments,
  getCommitment,
  createCommitment,
  updateCommitment,
  approveCommitment,
  cancelCommitment,
  
  // Savings
  getSavingsEvents,
  createSavingsEvent,
  
  // Summary
  getFinanceSummary,
};

export default financeService;
