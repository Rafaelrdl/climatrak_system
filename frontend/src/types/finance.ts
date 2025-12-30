/**
 * Tipos para o módulo Finance
 * Baseado em: docs/backend/api/finance.md
 */

// ==================== Enums ====================

export type TransactionType = 'labor' | 'parts' | 'third_party' | 'adjustment';
export type TransactionCategory = 'preventive' | 'corrective' | 'predictive' | 'other';
export type CommitmentStatus = 'draft' | 'submitted' | 'approved' | 'cancelled' | 'converted';
export type SavingsConfidence = 'high' | 'med' | 'low';
export type SavingsEventType = 'avoided_failure' | 'energy_saving' | 'lifespan_extension' | 'other';
export type BudgetPlanStatus = 'draft' | 'approved' | 'locked';
export type Currency = 'BRL' | 'USD' | 'EUR';

// ==================== Core Models ====================

export interface CostCenter {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RateCard {
  id: string;
  role: string;
  cost_per_hour: number;
  effective_from: string;
  created_at: string;
  updated_at: string;
}

// ==================== Budget ====================

export interface BudgetPlan {
  id: string;
  year: number;
  currency: Currency;
  status: BudgetPlanStatus;
  created_at: string;
  updated_at: string;
}

export interface Envelope {
  id: string;
  budget_plan: string;
  cost_center: string;
  category: TransactionCategory;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  is_active?: boolean;
  rules?: {
    asset_ids?: string[];
    location_ids?: string[];
  };
  months?: BudgetMonthFromBackend[]; // dados do backend
  created_at: string;
  updated_at: string;
}

export interface BudgetMonthFromBackend {
  id: string;
  month: string; // DateField "YYYY-MM-DD"
  planned_amount: number;
  contingency_amount: number;
  is_locked: boolean;
  locked_at?: string;
  locked_by?: string;
}

export interface EnvelopeMonth {
  id?: string;
  month: number; // 1-12 (frontend)
  planned_amount: number;
  contingency_amount: number; // frontend only
}

export interface BudgetMonthInput {
  month: string; // YYYY-MM-DD format (backend)
  planned_amount: number;
  contingency_amount?: number;
}

// ==================== Ledger ====================

export interface CostTransaction {
  id: string;
  occurred_at: string;
  amount: number;
  currency: Currency;
  transaction_type: TransactionType;
  category: TransactionCategory;
  cost_center_id: string;
  cost_center_name?: string;
  asset_id?: string | null;
  asset_name?: string;
  work_order_id?: string | null;
  work_order_number?: string;
  envelope_id?: string | null;
  meta?: Record<string, unknown>;
  idempotency_key: string;
  created_at: string;
}

export interface ManualTransactionInput {
  occurred_at: string;
  amount: number;
  currency: Currency;
  transaction_type: 'adjustment';
  category: TransactionCategory;
  cost_center_id: string;
  asset_id?: string;
  work_order_id?: string;
  meta?: {
    reason?: string;
    invoice?: string;
    [key: string]: unknown;
  };
}

// ==================== Commitments ====================

export interface Commitment {
  id: string;
  cost_center_id: string;
  cost_center_name?: string;
  category: TransactionCategory;
  amount: number;
  currency: Currency;
  vendor_id?: string | null;
  vendor_name?: string;
  work_order_id?: string | null;
  work_order_number?: string;
  status: CommitmentStatus;
  budget_month: string; // YYYY-MM-DD (first day of month)
  due_date?: string;
  description?: string;
  notes?: string; // Deprecated: use description
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

export interface CommitmentInput {
  cost_center_id: string;
  category: TransactionCategory;
  amount: number;
  currency: Currency;
  vendor_id?: string;
  work_order_id?: string;
  status?: CommitmentStatus;
  budget_month: string;
  due_date?: string;
  notes?: string;
  attachments?: string[];
}

// ==================== Savings ====================

export interface SavingsEvent {
  id: string;
  event_type: SavingsEventType;
  occurred_at: string;
  savings_amount: number;
  currency: Currency;
  confidence: SavingsConfidence;
  cost_center_id: string;
  cost_center_name?: string;
  asset_id?: string | null;
  asset_name?: string;
  work_order_id?: string | null;
  alert_id?: string | null;
  baseline_ref?: Record<string, unknown>;
  explanation?: string;
  evidence_links?: Record<string, string>;
  created_at: string;
}

export interface SavingsEventInput {
  event_type: SavingsEventType;
  occurred_at: string;
  savings_amount: number;
  currency: Currency;
  confidence: SavingsConfidence;
  cost_center_id: string;
  asset_id?: string;
  work_order_id?: string;
  alert_id?: string;
  baseline_ref?: Record<string, unknown>;
  explanation?: string;
  evidence_links?: Record<string, string>;
}

// ==================== Summary ====================

export interface CategorySummary {
  category: TransactionCategory;
  planned: number;
  committed: number;
  actual: number;
  savings: number;
}

export interface FinanceSummary {
  month: string; // YYYY-MM
  planned: number;
  committed: number;
  actual: number;
  savings: number;
  variance: number;
  by_category: CategorySummary[];
}

// ==================== Filters ====================

export interface LedgerFilters {
  start_date?: string;
  end_date?: string;
  cost_center?: string;
  asset?: string;
  work_order?: string;
  category?: TransactionCategory;
  type?: TransactionType;
  page?: number;
  page_size?: number;
}

export interface CommitmentFilters {
  cost_center_id?: string;
  status?: CommitmentStatus;
  budget_month?: string;
  page?: number;
  page_size?: number;
}

export interface SavingsFilters {
  from?: string;
  to?: string;
  cost_center_id?: string;
  asset_id?: string;
  event_type?: SavingsEventType;
  confidence?: SavingsConfidence;
  page?: number;
  page_size?: number;
}

// ==================== Pagination ====================

export interface FinancePaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

// ==================== API Response wrappers ====================

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}
