/**
 * Maintenance Plans Service (Planos de Manutenção)
 * 
 * Serviço para gerenciamento de planos de manutenção preventiva
 * 
 * Endpoints:
 * - GET /api/cmms/plans/ - Lista
 * - POST /api/cmms/plans/ - Criar
 * - PATCH /api/cmms/plans/{id}/ - Atualizar
 * - DELETE /api/cmms/plans/{id}/ - Deletar
 * - POST /api/cmms/plans/{id}/generate/ - Gerar OS
 */

import { api } from '@/lib/api';
import type { MaintenancePlan } from '@/types';
import type { ApiMaintenancePlan, PaginatedResponse } from '@/types/api';

// ============================================
// Tipos
// ============================================

export interface PlanFilters {
  is_active?: boolean;
  frequency?: string[];
  asset?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface CreatePlanData {
  name: string;
  description?: string;
  frequency: MaintenancePlan['frequency'];
  is_active?: boolean;
  assets: string[]; // IDs dos ativos
  checklist_template?: string;
  auto_generate?: boolean;
  next_execution?: string; // Data de início (YYYY-MM-DD)
}

export interface GenerateWorkOrdersResult {
  work_orders_created: number;
  work_order_ids: string[];
  next_execution: string;
}

// ============================================
// Mappers
// ============================================

const mapFrequency = (freq: ApiMaintenancePlan['frequency']): MaintenancePlan['frequency'] => {
  const mapping: Record<ApiMaintenancePlan['frequency'], MaintenancePlan['frequency']> = {
    'DAILY': 'DAILY',
    'WEEKLY': 'WEEKLY',
    'BIWEEKLY': 'BIWEEKLY',
    'MONTHLY': 'MONTHLY',
    'QUARTERLY': 'QUARTERLY',
    'SEMI_ANNUAL': 'SEMI_ANNUAL',
    'ANNUAL': 'ANNUAL',
  };
  return mapping[freq] || 'MONTHLY';
};

const mapPlan = (plan: ApiMaintenancePlan): MaintenancePlan => ({
  id: String(plan.id),
  name: plan.name,
  description: plan.description || '',
  frequency: mapFrequency(plan.frequency),
  isActive: plan.is_active,
  // Campos da API - com valores defensivos
  assets: (plan.assets || []).map(String),
  asset_tags: plan.asset_tags || [],
  asset_names: plan.asset_names || [],
  checklist_id: plan.checklist_template ? String(plan.checklist_template) : undefined,
  checklist_name: plan.checklist_template_name || null,
  next_execution_date: plan.next_execution || null,
  last_execution_date: plan.last_execution || null,
  auto_generate: plan.auto_generate ?? false,
  work_orders_generated: plan.work_orders_generated ?? 0,
  // Campos legados para compatibilidade com UI existente
  scope: {
    equipment_ids: (plan.assets || []).map(String),
    equipment_names: plan.asset_names || [],
  },
  status: plan.is_active ? 'Ativo' : 'Inativo',
});

// ============================================
// Service
// ============================================

export const plansService = {
  /**
   * Lista todos os planos
   */
  async getAll(filters?: PlanFilters): Promise<MaintenancePlan[]> {
    const params: Record<string, string | number | boolean | undefined> = {};
    
    if (filters?.is_active !== undefined) params.is_active = filters.is_active;
    if (filters?.frequency?.length) params.frequency = filters.frequency.join(',');
    if (filters?.asset) params.asset = filters.asset;
    if (filters?.search) params.search = filters.search;
    if (filters?.ordering) params.ordering = filters.ordering;
    if (filters?.page) params.page = filters.page;
    if (filters?.page_size) params.page_size = filters.page_size;

    try {
      const response = await api.get<PaginatedResponse<ApiMaintenancePlan>>('/cmms/plans/', { params });
      console.log('[plansService.getAll] Response:', response.data);
      return response.data.results.map(mapPlan);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status: number; data: unknown } };
        console.error('[plansService.getAll] Erro:', axiosError.response?.status, axiosError.response?.data);
      }
      throw error;
    }
  },

  /**
   * Busca plano por ID
   */
  async getById(id: string): Promise<MaintenancePlan & {
    assets: string[];
    asset_tags: string[];
    next_execution: string | null;
    last_execution: string | null;
    auto_generate: boolean;
    work_orders_generated: number;
  }> {
    const response = await api.get<ApiMaintenancePlan>(`/cmms/plans/${id}/`);
    return {
      ...mapPlan(response.data),
      assets: response.data.assets.map(String),
      asset_tags: response.data.asset_tags,
      next_execution: response.data.next_execution,
      last_execution: response.data.last_execution,
      auto_generate: response.data.auto_generate,
      work_orders_generated: response.data.work_orders_generated,
    };
  },

  /**
   * Cria novo plano
   */
  async create(data: CreatePlanData): Promise<MaintenancePlan> {
    const payload: Record<string, unknown> = {
      name: data.name,
      description: data.description || '',
      frequency: data.frequency,
      is_active: data.is_active ?? true,
      assets: data.assets.map(Number),
      checklist_template: data.checklist_template ? Number(data.checklist_template) : null,
      auto_generate: data.auto_generate ?? true,
    };
    
    // Adicionar next_execution se fornecido
    if (data.next_execution) {
      payload.next_execution = data.next_execution;
    }
    
    console.log('[plansService.create] Payload:', JSON.stringify(payload, null, 2));
    try {
      const response = await api.post<ApiMaintenancePlan>('/cmms/plans/', payload);
      return mapPlan(response.data);
    } catch (error: unknown) {
      // Captura detalhes do erro para debug
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status: number; data: unknown } };
        console.error('[plansService.create] Erro:', axiosError.response?.status, axiosError.response?.data);
      }
      throw error;
    }
  },

  /**
   * Atualiza plano
   */
  async update(id: string, data: Partial<CreatePlanData>): Promise<MaintenancePlan> {
    const payload: Record<string, unknown> = {};
    
    if (data.name) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description;
    if (data.frequency) payload.frequency = data.frequency;
    if (data.is_active !== undefined) payload.is_active = data.is_active;
    if (data.assets) payload.assets = data.assets.map(Number);
    if (data.checklist_template !== undefined) {
      payload.checklist_template = data.checklist_template ? Number(data.checklist_template) : null;
    }
    if (data.auto_generate !== undefined) payload.auto_generate = data.auto_generate;
    if (data.next_execution !== undefined) {
      payload.next_execution = data.next_execution || null;
    }

    const response = await api.patch<ApiMaintenancePlan>(`/cmms/plans/${id}/`, payload);
    return mapPlan(response.data);
  },

  /**
   * Deleta plano
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/cmms/plans/${id}/`);
  },

  /**
   * Ativa/desativa plano
   */
  async toggleActive(id: string, isActive: boolean): Promise<MaintenancePlan> {
    const response = await api.patch<ApiMaintenancePlan>(`/cmms/plans/${id}/`, { is_active: isActive });
    return mapPlan(response.data);
  },

  /**
   * Gera ordens de serviço para o plano
   */
  async generateWorkOrders(id: string): Promise<GenerateWorkOrdersResult> {
    const response = await api.post<{
      work_orders_created: number;
      work_order_ids: number[];
      next_execution: string;
    }>(`/cmms/plans/${id}/generate/`);
    
    return {
      work_orders_created: response.data.work_orders_created,
      work_order_ids: response.data.work_order_ids.map(String),
      next_execution: response.data.next_execution,
    };
  },

  /**
   * Adiciona ativo ao plano
   */
  async addAsset(planId: string, assetId: string): Promise<void> {
    await api.post(`/cmms/plans/${planId}/assets/`, { asset: Number(assetId) });
  },

  /**
   * Remove ativo do plano
   */
  async removeAsset(planId: string, assetId: string): Promise<void> {
    await api.delete(`/cmms/plans/${planId}/assets/${assetId}/`);
  },

  /**
   * Obtém estatísticas dos planos
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    by_frequency: Record<string, number>;
    next_executions: { plan_id: string; plan_name: string; next_date: string }[];
  }> {
    const response = await api.get<{
      total: number;
      active: number;
      inactive: number;
      by_frequency: Record<string, number>;
      next_executions: { plan_id: number; plan_name: string; next_date: string }[];
    }>('/cmms/plans/stats/');
    
    return {
      ...response.data,
      next_executions: response.data.next_executions.map(e => ({
        ...e,
        plan_id: String(e.plan_id),
      })),
    };
  },
};
