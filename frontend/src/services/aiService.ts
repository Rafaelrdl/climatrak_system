/**
 * Service para integração com AI Agents
 * 
 * Endpoints:
 *  - GET /api/ai/agents/ - Lista agentes disponíveis
 *  - POST /api/ai/agents/{key}/run/ - Executa agente
 *  - GET /api/ai/jobs/ - Lista jobs de IA
 *  - GET /api/ai/jobs/{id}/ - Detalhe de um job
 *  - GET /api/ai/health/ - Health check
 */

import api from '@/lib/api';

// Enums e tipos

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

export interface Agent {
  key: string;
  name: string;
  description: string;
  version: string;
  require_llm: boolean;
}

export interface AIJobRequest {
  input?: Record<string, unknown>;
  related?: {
    type: string;
    id: number | string;
  };
  idempotency_key?: string;
}

export interface AIJob {
  id: string;
  agent_key: string;
  status: JobStatus;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  related_type?: string;
  related_id?: string | null;
  error_message?: string | null;
  tokens_used?: number;
  execution_time_ms?: number;
  attempts?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface AIJobRunResponse {
  job_id: string;
  status: JobStatus;
  created: boolean;
}

export interface HealthCheckResponse {
  llm: {
    healthy: boolean;
    provider: string;
    base_url: string;
    model: string;
  };
  agents: Agent[];
  status: 'healthy' | 'degraded' | 'error';
}

// Root Cause Analysis specific types
export interface RootCauseInput {
  alert_id: number | string;
  window_minutes?: number;
}

export interface Hypothesis {
  id: string;
  title: string;
  confidence: number;
  evidence: string[];
  severity?: string;
  recommendation?: string;
}

export interface ImmediateAction {
  action: string;
  priority?: string;
}

export interface RecommendedWorkOrder {
  title: string;
  type: string;
  priority: string;
  estimated_duration_hours?: number;
  parts_potentially_needed?: string[];
}

export interface RootCauseAnalysisOutput {
  schema_version: string;
  alert: {
    id: number;
    asset_tag: string;
    parameter_key: string;
    current_value: number;
    threshold_value: number;
    severity: string;
    unit: string;
    triggered_at: string;
  };
  hypotheses: Hypothesis[];
  immediate_actions: string[];
  recommended_work_order?: RecommendedWorkOrder;
  notes?: string;
  tokens_used: number;
  analysis_completed_at: string;
}

// API Functions

/**
 * Lista os agentes de IA disponíveis
 */
export async function getAvailableAgents(): Promise<Agent[]> {
  const response = await api.get('/ai/agents/');
  return response.data;
}

/**
 * Executa um agente especificado
 */
export async function runAgent(
  agentKey: string,
  request: AIJobRequest
): Promise<AIJobRunResponse> {
  const response = await api.post(`/ai/agents/${agentKey}/run/`, request);
  return response.data;
}

/**
 * Lista os jobs de IA
 * 
 * @param filters Filtros opcionais (agent, status, related_type, related_id)
 */
export async function listAIJobs(filters?: {
  agent?: string;
  status?: JobStatus;
  related_type?: string;
  related_id?: string | number;
}): Promise<AIJob[]> {
  const response = await api.get('/ai/jobs/', { params: filters });
  return response.data;
}

/**
 * Obtém detalhes de um job específico
 */
export async function getAIJob(jobId: string): Promise<AIJob> {
  const response = await api.get(`/ai/jobs/${jobId}/`);
  return response.data;
}

/**
 * Verifica saúde do módulo de IA
 */
export async function checkAIHealth(): Promise<HealthCheckResponse> {
  const response = await api.get('/ai/health/');
  return response.data;
}

// Root Cause Analysis convenience functions

/**
 * Analisa a causa raiz de um alerta usando IA
 * 
 * Nota: Cada chamada gera uma nova análise. Para re-analisar o mesmo alerta,
 * usamos timestamp na idempotency_key para permitir múltiplas tentativas.
 */
export async function analyzeAlertWithAI(
  alertId: number | string,
  windowMinutes: number = 120
): Promise<AIJobRunResponse> {
  // Incluir timestamp para permitir re-análises do mesmo alerta
  const timestamp = Date.now();
  return runAgent('root_cause', {
    input: {
      alert_id: alertId,
      window_minutes: windowMinutes,
    },
    related: {
      type: 'alert',
      id: alertId,
    },
    idempotency_key: `rca:${alertId}:${timestamp}`,
  });
}

/**
 * Obtém o resultado da análise de causa raiz
 */
export async function getRootCauseAnalysis(jobId: string): Promise<RootCauseAnalysisOutput | null> {
  const job = await getAIJob(jobId);

  if (job.status !== JobStatus.SUCCEEDED) {
    return null;
  }

  return job.output_data as unknown as RootCauseAnalysisOutput;
}

/**
 * Hook para polling de um job de IA até conclusão
 * 
 * Retorna null se o job não foi encontrado ou falhou
 */
export async function pollAIJob(
  jobId: string,
  maxRetries: number = 60,
  delayMs: number = 1000
): Promise<AIJob | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const job = await getAIJob(jobId);

      if (
        job.status === JobStatus.SUCCEEDED ||
        job.status === JobStatus.FAILED ||
        job.status === JobStatus.TIMEOUT ||
        job.status === JobStatus.CANCELLED
      ) {
        return job;
      }

      // Aguarda antes do próximo poll
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } catch (error) {
      console.error(`Error polling job ${jobId}:`, error);
      throw error;
    }
  }

  throw new Error(`Job ${jobId} polling timeout after ${maxRetries} attempts`);
}

/**
 * Analisa um alerta e aguarda o resultado
 */
export async function analyzeAlertAndWait(
  alertId: number | string,
  windowMinutes: number = 120
): Promise<RootCauseAnalysisOutput> {
  // Inicia análise
  const jobResponse = await analyzeAlertWithAI(alertId, windowMinutes);

  // Aguarda conclusão
  const completedJob = await pollAIJob(jobResponse.job_id);

  if (!completedJob) {
    throw new Error('Failed to analyze alert: Job not found');
  }

  if (completedJob.status === JobStatus.FAILED) {
    throw new Error(`Analysis failed: ${completedJob.error_message}`);
  }

  if (completedJob.status !== JobStatus.SUCCEEDED) {
    throw new Error(`Unexpected job status: ${completedJob.status}`);
  }

  return completedJob.output_data as unknown as RootCauseAnalysisOutput;
}

// ============================================
// Inventory Agent Types and Functions (AI-004)
// ============================================

export interface InventoryAnalysisInput {
  mode?: 'overview' | 'item';
  item_id?: number;
  window_days?: number;
  top_n?: number;
  default_lead_time_days?: number;
  safety_days?: number;
  dead_stock_days?: number;
  overstock_days?: number;
}

export interface InventorySummary {
  total_items: number;
  items_with_consumption: number;
  total_stock_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  critical_low_count: number;
  reorder_count: number;
  overstock_count: number;
  dead_stock_count: number;
}

export interface ReorderRecommendation {
  item_id: number;
  code: string;
  name: string;
  unit: string;
  category_name: string | null;
  current_qty: number;
  avg_daily_usage: number;
  lead_time_days: number;
  days_of_cover: number | null;
  stockout_risk: boolean;
  suggested_reorder_point: number;
  suggested_min_quantity: number;
  suggested_max_quantity: number;
  suggested_order_qty: number;
  confidence: 'high' | 'medium' | 'low';
  priority?: 'critical' | 'high' | 'medium';
  notes: string[];
}

export interface OverstockRecommendation {
  item_id: number;
  code: string;
  name: string;
  unit: string;
  category_name: string | null;
  current_qty: number;
  avg_daily_usage: number;
  excess_qty: number;
  excess_value: number;
  confidence: 'high' | 'medium' | 'low';
  notes: string[];
}

export interface DeadStockRecommendation {
  item_id: number;
  code: string;
  name: string;
  unit: string;
  category_name: string | null;
  current_qty: number;
  stock_value: number;
  days_since_last_out?: number;
  confidence: 'high' | 'medium' | 'low';
  notes: string[];
}

export interface InventoryAnalysisOutput {
  agent_key: 'inventory';
  version: string;
  mode: 'overview' | 'item';
  window_days: number;
  generated_at: string;
  summary: InventorySummary;
  recommendations: {
    reorder: ReorderRecommendation[];
    overstock: OverstockRecommendation[];
    dead_stock: DeadStockRecommendation[];
  };
  llm_summary: string | null;
  engine: {
    type: 'heuristic' | 'llm+heuristic';
    assumptions: string[];
  };
}

/**
 * Executa análise de inventário usando IA
 *
 * @param options Opções de análise (window_days, top_n, etc.)
 * @returns Promise com job_id para polling
 */
export async function runInventoryAnalysis(
  options: InventoryAnalysisInput = {}
): Promise<AIJobRunResponse> {
  const timestamp = Date.now();
  const mode = options.mode || 'overview';
  const windowDays = options.window_days || 90;

  // Construir idempotency_key única
  const keyParts = [
    'inventory',
    mode,
    mode === 'item' ? options.item_id : 'all',
    `${windowDays}d`,
    timestamp,
  ];

  return runAgent('inventory', {
    input: {
      mode,
      window_days: windowDays,
      ...options,
    },
    idempotency_key: keyParts.join(':'),
  });
}

/**
 * Executa análise de inventário para um item específico
 *
 * @param itemId ID do item para analisar
 * @param options Opções adicionais
 */
export async function runInventoryItemAnalysis(
  itemId: number,
  options: Omit<InventoryAnalysisInput, 'mode' | 'item_id'> = {}
): Promise<AIJobRunResponse> {
  return runInventoryAnalysis({
    ...options,
    mode: 'item',
    item_id: itemId,
  });
}

/**
 * Executa análise de inventário e aguarda resultado
 *
 * @param options Opções de análise
 * @param pollOptions Opções de polling (maxRetries, delayMs)
 */
export async function analyzeInventoryAndWait(
  options: InventoryAnalysisInput = {},
  pollOptions: { maxRetries?: number; delayMs?: number } = {}
): Promise<InventoryAnalysisOutput> {
  const { maxRetries = 120, delayMs = 1000 } = pollOptions;

  // Inicia análise
  const jobResponse = await runInventoryAnalysis(options);

  // Aguarda conclusão
  const completedJob = await pollAIJob(jobResponse.job_id, maxRetries, delayMs);

  if (!completedJob) {
    throw new Error('Falha na análise de inventário: Job não encontrado');
  }

  if (completedJob.status === JobStatus.FAILED) {
    throw new Error(`Análise falhou: ${completedJob.error_message}`);
  }

  if (completedJob.status === JobStatus.TIMEOUT) {
    throw new Error('Análise expirou (timeout)');
  }

  if (completedJob.status !== JobStatus.SUCCEEDED) {
    throw new Error(`Status inesperado: ${completedJob.status}`);
  }

  return completedJob.output_data as unknown as InventoryAnalysisOutput;
}

// ============================================
// Predictive Agent Types and Functions (AI-005)
// ============================================

export interface PredictiveInput {
  asset_id: number;
  telemetry_window_days?: number;
  corrective_lookback_days?: number;
}

export interface PredictiveRisk {
  score: number;
  level: 'minimal' | 'low' | 'medium' | 'high';
  drivers: string[];
}

export interface PredictiveSignals {
  alerts_last_24h: number;
  alerts_last_7d: number;
  telemetry_window_days: number;
  telemetry: Array<{
    sensor_id: string;
    avg: number | null;
    min: number | null;
    max: number | null;
    last: number | null;
    last_at: string | null;
    reading_count: number;
  }>;
}

export interface RecommendedWorkOrderSuggestion {
  should_create: boolean;
  type: 'PREDICTIVE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  asset_id: number;
  asset_tag: string;
}

export interface PredictiveOutput {
  agent_key: 'predictive';
  as_of: string;
  asset: {
    id: number;
    tag: string;
    name: string;
    asset_type: string;
    site_id: number | null;
    site_name: string | null;
  };
  risk: PredictiveRisk;
  signals: PredictiveSignals;
  recommended_work_order: RecommendedWorkOrderSuggestion | null;
  llm_summary: string | null;
}

/**
 * Executa análise preditiva para um ativo
 */
export async function runPredictiveAnalysis(
  assetId: number,
  options: Omit<PredictiveInput, 'asset_id'> = {}
): Promise<AIJobRunResponse> {
  const timestamp = Date.now();
  
  return runAgent('predictive', {
    input: {
      asset_id: assetId,
      ...options,
    },
    related: {
      type: 'asset',
      id: assetId,
    },
    idempotency_key: `predictive:asset:${assetId}:${timestamp}`,
  });
}

/**
 * Executa análise preditiva e aguarda resultado
 */
export async function analyzePredictiveAndWait(
  assetId: number,
  options: Omit<PredictiveInput, 'asset_id'> = {},
  pollOptions: { maxRetries?: number; delayMs?: number } = {}
): Promise<PredictiveOutput> {
  const { maxRetries = 60, delayMs = 1000 } = pollOptions;
  
  const jobResponse = await runPredictiveAnalysis(assetId, options);
  const completedJob = await pollAIJob(jobResponse.job_id, maxRetries, delayMs);
  
  if (!completedJob || completedJob.status !== JobStatus.SUCCEEDED) {
    throw new Error(completedJob?.error_message || 'Análise preditiva falhou');
  }
  
  return completedJob.output_data as unknown as PredictiveOutput;
}

// ============================================
// Preventive Agent Types and Functions (AI-005)
// ============================================

export interface PreventiveInput {
  scope: 'asset' | 'site' | 'all';
  asset_id?: number;
  site_id?: number;
  due_window_days?: number;
  overdue_window_days?: number;
  corrective_lookback_days?: number;
}

export interface PreventiveRecommendation {
  type: 'execute_overdue_plan' | 'schedule_due_plan' | 'plan_adjustment' | 'create_plan' | 'reduce_backlog';
  priority: 'high' | 'medium' | 'low';
  asset_id: number;
  asset_tag: string;
  title: string;
  rationale: string[];
  plan_id?: number;
  plan_name?: string;
  corrective_count?: number;
  open_wo_count?: number;
  confidence: number;
}

export interface PreventiveAssetSummary {
  id: number;
  tag: string;
  summary: {
    open_wo_count: number;
    overdue_plans: number;
    due_soon_plans: number;
    recent_correctives: number;
  };
}

export interface PreventiveOutput {
  agent_key: 'preventive';
  as_of: string;
  scope: 'asset' | 'site' | 'all';
  asset?: {
    id: number;
    tag: string;
  };
  summary: {
    assets_analyzed: number;
    total_open_work_orders: number;
    total_overdue_plans: number;
    total_due_soon_plans: number;
  };
  recommendations: PreventiveRecommendation[];
  assets: PreventiveAssetSummary[];
  llm_summary: string | null;
}

/**
 * Executa análise preventiva para um ativo
 */
export async function runPreventiveAnalysis(
  assetId: number,
  options: Omit<PreventiveInput, 'scope' | 'asset_id'> = {}
): Promise<AIJobRunResponse> {
  const timestamp = Date.now();
  
  return runAgent('preventive', {
    input: {
      scope: 'asset',
      asset_id: assetId,
      ...options,
    },
    related: {
      type: 'asset',
      id: assetId,
    },
    idempotency_key: `preventive:asset:${assetId}:${timestamp}`,
  });
}

/**
 * Executa análise preventiva e aguarda resultado
 */
export async function analyzePreventiveAndWait(
  assetId: number,
  options: Omit<PreventiveInput, 'scope' | 'asset_id'> = {},
  pollOptions: { maxRetries?: number; delayMs?: number } = {}
): Promise<PreventiveOutput> {
  const { maxRetries = 60, delayMs = 1000 } = pollOptions;
  
  const jobResponse = await runPreventiveAnalysis(assetId, options);
  const completedJob = await pollAIJob(jobResponse.job_id, maxRetries, delayMs);
  
  if (!completedJob || completedJob.status !== JobStatus.SUCCEEDED) {
    throw new Error(completedJob?.error_message || 'Análise preventiva falhou');
  }
  
  return completedJob.output_data as unknown as PreventiveOutput;
}

// ============================================
// Patterns Agent Types and Functions (AI-005)
// ============================================

export interface PatternsInput {
  scope: 'asset' | 'site' | 'all';
  asset_id?: number;
  site_id?: number;
  window_days?: number;
  top_n?: number;
}

export interface PatternTopPart {
  item_id: number | null;
  name: string;
  code: string;
  total_qty: number;
  estimated_cost: number;
  usage_count: number;
}

export interface Pattern {
  type: 'repeat_corrective' | 'high_priority_recurrence' | 'high_consumption_part' | 'high_corrective_ratio' | 'similar_issue';
  priority: 'high' | 'medium' | 'low';
  title: string;
  evidence: Record<string, unknown>;
  recommendation: string;
}

export interface PatternsOutput {
  agent_key: 'patterns';
  as_of: string;
  window_days: number;
  scope: {
    type: 'asset' | 'site' | 'all';
    id?: number;
    tag?: string;
    name?: string;
    site_id?: number;
    site_name?: string;
  };
  kpis: {
    work_orders_total: number;
    corrective: number;
    preventive: number;
    predictive: number;
  };
  top_parts: PatternTopPart[];
  labor_summary?: {
    total_hours: number;
    total_cost: number;
  };
  patterns: Pattern[];
  llm_summary: string | null;
}

/**
 * Executa análise de padrões para um ativo
 */
export async function runPatternsAnalysis(
  assetId: number,
  options: Omit<PatternsInput, 'scope' | 'asset_id'> = {}
): Promise<AIJobRunResponse> {
  const timestamp = Date.now();
  
  return runAgent('patterns', {
    input: {
      scope: 'asset',
      asset_id: assetId,
      window_days: 30,
      ...options,
    },
    related: {
      type: 'asset',
      id: assetId,
    },
    idempotency_key: `patterns:asset:${assetId}:${timestamp}`,
  });
}

/**
 * Executa análise de padrões e aguarda resultado
 */
export async function analyzePatternsAndWait(
  assetId: number,
  options: Omit<PatternsInput, 'scope' | 'asset_id'> = {},
  pollOptions: { maxRetries?: number; delayMs?: number } = {}
): Promise<PatternsOutput> {
  const { maxRetries = 60, delayMs = 1000 } = pollOptions;
  
  const jobResponse = await runPatternsAnalysis(assetId, options);
  const completedJob = await pollAIJob(jobResponse.job_id, maxRetries, delayMs);
  
  if (!completedJob || completedJob.status !== JobStatus.SUCCEEDED) {
    throw new Error(completedJob?.error_message || 'Análise de padrões falhou');
  }
  
  return completedJob.output_data as unknown as PatternsOutput;
}

// ============================================
// Utility: Fetch latest jobs for an asset
// ============================================

export interface AssetAIInsights {
  predictive: AIJob | null;
  preventive: AIJob | null;
  patterns: AIJob | null;
}

/**
 * Busca os últimos jobs de IA para um ativo (predictive, preventive, patterns)
 */
export async function getAssetAIInsights(assetId: number): Promise<AssetAIInsights> {
  const [predictiveJobs, preventiveJobs, patternsJobs] = await Promise.all([
    listAIJobs({
      agent: 'predictive',
      status: JobStatus.SUCCEEDED,
      related_type: 'asset',
      related_id: assetId,
    }),
    listAIJobs({
      agent: 'preventive',
      status: JobStatus.SUCCEEDED,
      related_type: 'asset',
      related_id: assetId,
    }),
    listAIJobs({
      agent: 'patterns',
      status: JobStatus.SUCCEEDED,
      related_type: 'asset',
      related_id: assetId,
    }),
  ]);
  
  return {
    predictive: predictiveJobs[0] || null,
    preventive: preventiveJobs[0] || null,
    patterns: patternsJobs[0] || null,
  };
}

// ============================================
// Quick Repair Agent Types and Functions (AI-003)
// ============================================

export interface QuickRepairInput {
  symptom: string;
  asset_id: number;
  constraints?: string[];
  observations?: string;
  window_days?: number;
}

export interface QuickRepairHypothesis {
  id: string;
  title: string;
  confidence: number;
  evidence: string[];
  severity?: 'high' | 'medium' | 'low';
}

export interface DiagnosisStep {
  step: number;
  action: string;
  expected_result: string;
  tools_required: string[];
}

export interface RepairStep {
  step: number;
  action: string;
  precautions?: string;
  estimated_minutes?: number;
}

export interface InventoryMatch {
  inventory_id: number;
  code: string;
  name: string;
  available_qty: number;
  unit: string;
  unit_cost: number;
  location: string;
}

export interface PartSuggestion {
  name: string;
  quantity: number;
  purpose: string;
  inventory_matches?: InventoryMatch[];
}

export interface SafetyInfo {
  ppe_required: string[];
  warnings: string[];
}

export interface EscalationInfo {
  criteria: string;
  contact: string;
}

export interface SuggestedWorkOrder {
  title: string;
  type: 'CORRECTIVE' | 'PREVENTIVE' | 'PREDICTIVE' | 'EMERGENCY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimated_hours?: number;
}

export interface QuickRepairReference {
  id: number;
  number?: string;
  title?: string;
  description?: string;
  status?: string;
  file_type?: string;
}

export interface QuickRepairAsset {
  id: number;
  tag: string;
  name: string;
  asset_type: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: string;
  specifications: Record<string, unknown>;
  site_name: string | null;
  sector_name: string | null;
  subsection_name: string | null;
}

export interface QuickRepairOutput {
  agent_key: 'quick_repair';
  version: string;
  generated_at: string;
  mode?: 'fallback';
  summary: string;
  hypotheses: QuickRepairHypothesis[];
  diagnosis_steps: DiagnosisStep[];
  repair_steps: RepairStep[];
  parts: PartSuggestion[];
  tools: string[];
  safety: SafetyInfo;
  escalation: EscalationInfo;
  suggested_work_order?: SuggestedWorkOrder;
  references: {
    similar_work_orders: QuickRepairReference[];
    procedures: QuickRepairReference[];
  };
  asset: QuickRepairAsset;
  idempotency_key: string;
}

/**
 * Executa diagnóstico rápido para um ativo com sintoma específico
 *
 * @param assetId ID do ativo
 * @param symptom Descrição do sintoma/problema (mínimo 10 caracteres)
 * @param options Opções adicionais (constraints, observations)
 */
export async function runQuickRepairAnalysis(
  assetId: number,
  symptom: string,
  options: Omit<QuickRepairInput, 'asset_id' | 'symptom'> = {}
): Promise<AIJobRunResponse> {
  const timestamp = Date.now();

  return runAgent('quick_repair', {
    input: {
      asset_id: assetId,
      symptom,
      ...options,
    },
    related: {
      type: 'asset',
      id: assetId,
    },
    idempotency_key: `quick_repair:asset:${assetId}:${timestamp}`,
  });
}

/**
 * Executa diagnóstico rápido e aguarda resultado
 *
 * @param assetId ID do ativo
 * @param symptom Descrição do sintoma/problema
 * @param options Opções adicionais
 * @param pollOptions Opções de polling
 */
export async function analyzeQuickRepairAndWait(
  assetId: number,
  symptom: string,
  options: Omit<QuickRepairInput, 'asset_id' | 'symptom'> = {},
  pollOptions: { maxRetries?: number; delayMs?: number } = {}
): Promise<QuickRepairOutput> {
  const { maxRetries = 90, delayMs = 1000 } = pollOptions;

  const jobResponse = await runQuickRepairAnalysis(assetId, symptom, options);
  const completedJob = await pollAIJob(jobResponse.job_id, maxRetries, delayMs);

  if (!completedJob) {
    throw new Error('Falha no diagnóstico rápido: Job não encontrado');
  }

  if (completedJob.status === JobStatus.FAILED) {
    throw new Error(`Diagnóstico falhou: ${completedJob.error_message}`);
  }

  if (completedJob.status === JobStatus.TIMEOUT) {
    throw new Error('Diagnóstico expirou (timeout)');
  }

  if (completedJob.status !== JobStatus.SUCCEEDED) {
    throw new Error(`Status inesperado: ${completedJob.status}`);
  }

  return completedJob.output_data as unknown as QuickRepairOutput;
}

