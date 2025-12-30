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
  FinancePaginatedResponse,
  ApiResponse,
} from '@/types/finance';

const BASE_URL = '/finance';

// ==================== Helper para extrair dados ====================

/**
 * Resposta paginada do Django REST Framework
 */
interface DjangoPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Extrai array de dados de uma resposta que pode ser:
 * - Array direto
 * - { data: [...] } (formato ApiResponse)
 * - { results: [...] } (formato Django paginado)
 */
function extractArray<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    // Django paginated response
    if ('results' in obj && Array.isArray(obj.results)) {
      return obj.results as T[];
    }
    // ApiResponse format
    if ('data' in obj && Array.isArray(obj.data)) {
      return obj.data as T[];
    }
  }
  return [];
}

/**
 * Normaliza resposta paginada do Django para o formato esperado pelo frontend
 * Django: { count, next, previous, results }
 * Frontend: { data, meta: { page, page_size, total, total_pages } }
 */
function normalizePaginatedResponse<T>(
  response: unknown,
  pageSize: number = 50
): FinancePaginatedResponse<T> {
  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    
    // Se já está no formato esperado
    if ('data' in obj && 'meta' in obj) {
      return response as FinancePaginatedResponse<T>;
    }
    
    // Django paginated response
    if ('results' in obj) {
      const djangoResp = obj as DjangoPaginatedResponse<T>;
      const total = djangoResp.count ?? 0;
      return {
        data: djangoResp.results ?? [],
        meta: {
          page: 1,
          page_size: pageSize,
          total,
          total_pages: Math.ceil(total / pageSize) || 1,
        },
      };
    }
  }
  
  // Fallback para array vazio
  return {
    data: [],
    meta: {
      page: 1,
      page_size: pageSize,
      total: 0,
      total_pages: 1,
    },
  };
}

// ==================== Cost Centers ====================

export async function getCostCenters(): Promise<CostCenter[]> {
  const { data } = await api.get(`${BASE_URL}/cost-centers/`);
  return extractArray<CostCenter>(data);
}

export async function createCostCenter(
  input: Pick<CostCenter, 'name' | 'code' | 'parent_id'>
): Promise<CostCenter> {
  const { data } = await api.post<ApiResponse<CostCenter>>(`${BASE_URL}/cost-centers/`, input);
  return data.data ?? data as unknown as CostCenter;
}

export async function updateCostCenter(
  id: string,
  input: Partial<Pick<CostCenter, 'name' | 'code' | 'parent_id'>>
): Promise<CostCenter> {
  const { data } = await api.patch<ApiResponse<CostCenter>>(`${BASE_URL}/cost-centers/${id}/`, input);
  return data.data ?? data as unknown as CostCenter;
}

export async function deleteCostCenter(id: string): Promise<void> {
  await api.delete(`${BASE_URL}/cost-centers/${id}/`);
}

// ==================== Rate Cards ====================

export async function getRateCards(): Promise<RateCard[]> {
  const { data } = await api.get(`${BASE_URL}/rate-cards/`);
  return extractArray<RateCard>(data);
}

export async function createRateCard(
  input: Pick<RateCard, 'role' | 'cost_per_hour' | 'effective_from'>
): Promise<RateCard> {
  const { data } = await api.post<ApiResponse<RateCard>>(`${BASE_URL}/rate-cards/`, input);
  return data.data ?? data as unknown as RateCard;
}

export async function updateRateCard(
  id: string,
  input: Partial<Pick<RateCard, 'role' | 'cost_per_hour' | 'effective_from'>>
): Promise<RateCard> {
  const { data } = await api.patch<ApiResponse<RateCard>>(`${BASE_URL}/rate-cards/${id}/`, input);
  return data.data ?? data as unknown as RateCard;
}

export async function deleteRateCard(id: string): Promise<void> {
  await api.delete(`${BASE_URL}/rate-cards/${id}/`);
}

// ==================== Budget Plans ====================

export async function getBudgetPlans(year?: number): Promise<BudgetPlan[]> {
  const params = year ? { year } : {};
  const { data } = await api.get(`${BASE_URL}/budget-plans/`, { params });
  return extractArray<BudgetPlan>(data);
}

export async function createBudgetPlan(
  input: Pick<BudgetPlan, 'year' | 'currency' | 'status'>
): Promise<BudgetPlan> {
  const { data } = await api.post<ApiResponse<BudgetPlan>>(`${BASE_URL}/budget-plans/`, input);
  return data.data ?? data as unknown as BudgetPlan;
}

export async function updateBudgetPlan(
  id: string,
  input: Partial<Pick<BudgetPlan, 'status'>>
): Promise<BudgetPlan> {
  const { data } = await api.patch<ApiResponse<BudgetPlan>>(`${BASE_URL}/budget-plans/${id}/`, input);
  return data.data ?? data as unknown as BudgetPlan;
}

// ==================== Envelopes ====================

export async function getEnvelopes(budgetPlanId: string): Promise<Envelope[]> {
  const { data } = await api.get(`${BASE_URL}/budget-envelopes/`, {
    params: { budget_plan_id: budgetPlanId },
  });
  return extractArray<Envelope>(data);
}

export async function createEnvelope(
  input: Omit<Envelope, 'id' | 'created_at' | 'updated_at'>
): Promise<Envelope> {
  const { data } = await api.post<ApiResponse<Envelope>>(`${BASE_URL}/budget-envelopes/`, input);
  return data.data ?? data as unknown as Envelope;
}

export async function updateEnvelopeMonths(
  envelopeId: string,
  months: { month: string; planned_amount: number }[]
): Promise<Envelope> {
  const { data } = await api.patch<ApiResponse<Envelope>>(
    `${BASE_URL}/budget-envelopes/${envelopeId}/`,
    { months }
  );
  return data.data ?? data as unknown as Envelope;
}

// ==================== Ledger (Transactions) ====================

export async function getTransactions(
  filters: LedgerFilters
): Promise<FinancePaginatedResponse<CostTransaction>> {
  const { data } = await api.get(
    `${BASE_URL}/transactions/`,
    { params: filters }
  );
  return normalizePaginatedResponse<CostTransaction>(data, filters.page_size ?? 50);
}

export async function createManualTransaction(
  input: ManualTransactionInput
): Promise<CostTransaction> {
  // Converter campos do frontend para o formato do backend
  const payload: Record<string, any> = {
    transaction_type: input.transaction_type,
    category: input.category,
    amount: input.amount,
    currency: input.currency,
    occurred_at: input.occurred_at,
    description: input.meta?.reason || 'Ajuste manual',
    meta: input.meta || {},
  };

  // Adicionar apenas campos não-vazios (backend espera UUID ou null, não string vazia)
  if (input.cost_center_id) {
    payload.cost_center = input.cost_center_id;
  }
  if (input.asset_id) {
    payload.asset = input.asset_id;
  }
  if (input.work_order_id) {
    payload.work_order = input.work_order_id;
  }
  
  const { data } = await api.post<ApiResponse<CostTransaction>>(
    `${BASE_URL}/transactions/`,
    payload
  );
  return data.data ?? data as unknown as CostTransaction;
}

// ==================== Commitments ====================

export async function getCommitments(
  filters: CommitmentFilters
): Promise<FinancePaginatedResponse<Commitment>> {
  const { data } = await api.get(
    `${BASE_URL}/commitments/`,
    { params: filters }
  );
  return normalizePaginatedResponse<Commitment>(data, filters.page_size ?? 50);
}

export async function getCommitment(id: string): Promise<Commitment> {
  const { data } = await api.get<ApiResponse<Commitment>>(`${BASE_URL}/commitments/${id}/`);
  return data.data ?? data as unknown as Commitment;
}

export async function createCommitment(input: CommitmentInput): Promise<Commitment> {
  // Converter campos do frontend para o formato do backend
  const payload = {
    cost_center: input.cost_center_id,
    category: input.category,
    amount: input.amount,
    currency: input.currency,
    budget_month: input.budget_month,
    description: input.description,
    vendor_name: input.vendor_id,
    work_order: input.work_order_id,
    submit: input.status === 'submitted',
  };
  
  const { data } = await api.post<ApiResponse<Commitment>>(`${BASE_URL}/commitments/`, payload);
  return data.data ?? data as unknown as Commitment;
}

export async function updateCommitment(
  id: string,
  input: Partial<CommitmentInput>
): Promise<Commitment> {
  const { data } = await api.patch<ApiResponse<Commitment>>(`${BASE_URL}/commitments/${id}/`, input);
  return data.data ?? data as unknown as Commitment;
}

export async function approveCommitment(id: string): Promise<Commitment> {
  const { data } = await api.post<ApiResponse<Commitment>>(`${BASE_URL}/commitments/${id}/approve/`);
  return data.data ?? data as unknown as Commitment;
}

export async function cancelCommitment(id: string): Promise<Commitment> {
  const { data } = await api.post<ApiResponse<Commitment>>(`${BASE_URL}/commitments/${id}/cancel/`);
  return data.data ?? data as unknown as Commitment;
}

// ==================== Savings Events ====================

export async function getSavingsEvents(
  filters: SavingsFilters
): Promise<FinancePaginatedResponse<SavingsEvent>> {
  const { data } = await api.get(
    `${BASE_URL}/savings-events/`,
    { params: filters }
  );
  return normalizePaginatedResponse<SavingsEvent>(data, filters.page_size ?? 50);
}

export async function createSavingsEvent(input: SavingsEventInput): Promise<SavingsEvent> {
  const { data } = await api.post<ApiResponse<SavingsEvent>>(`${BASE_URL}/savings-events/`, input);
  return data.data ?? data as unknown as SavingsEvent;
}

// ==================== Summary ====================

export async function getFinanceSummary(
  month: string, // YYYY-MM ou YYYY-MM-DD
  costCenterId?: string
): Promise<FinanceSummary> {
  // Normalizar para formato YYYY-MM-DD (primeiro dia do mês)
  const monthDate = month.length === 7 ? `${month}-01` : month;
  
  const params: Record<string, string> = { month: monthDate };
  if (costCenterId) {
    params.cost_center = costCenterId;
  }
  const { data } = await api.get<ApiResponse<FinanceSummary>>(
    `${BASE_URL}/budget-summary/`,
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
  updateRateCard,
  deleteRateCard,
  
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
