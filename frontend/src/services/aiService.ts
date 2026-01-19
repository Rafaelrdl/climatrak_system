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
 */
export async function listAIJobs(filters?: {
  agent?: string;
  status?: JobStatus;
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
