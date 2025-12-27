/**
 * Service para gerenciar Rules (regras de monitoramento)
 * 
 * Rules definem condições para disparo automático de alertas
 * 
 * 🔧 CORRIGIDO: Usa cliente Axios principal (@/lib/api) para autenticação
 */

import { api } from '@/lib/api';
import type { 
  Rule, 
  RuleFilters, 
  CreateRuleRequest, 
  UpdateRuleRequest,
  RuleStatistics 
} from '../types/rule';

interface PaginatedResponse<T> {
  results: T[];
  count: number;
}

export const rulesService = {
  /**
   * Lista todas as regras
   */
  async list(filters?: RuleFilters): Promise<PaginatedResponse<Rule>> {
    const response = await api.get<PaginatedResponse<Rule>>('/alerts/rules/', { params: filters });
    return response.data;
  },

  /**
   * Busca uma regra específica
   */
  async get(id: number): Promise<Rule> {
    const response = await api.get<Rule>(`/alerts/rules/${id}/`);
    return response.data;
  },

  /**
   * Cria uma nova regra
   */
  async create(data: CreateRuleRequest): Promise<Rule> {
    const response = await api.post<Rule>('/alerts/rules/', data);
    return response.data;
  },

  /**
   * Atualiza uma regra (PATCH - parcial)
   */
  async patch(id: number, data: UpdateRuleRequest): Promise<Rule> {
    const response = await api.patch<Rule>(`/alerts/rules/${id}/`, data);
    return response.data;
  },

  /**
   * Atualiza uma regra (PUT - completo)
   */
  async update(id: number, data: CreateRuleRequest): Promise<Rule> {
    const response = await api.put<Rule>(`/alerts/rules/${id}/`, data);
    return response.data;
  },

  /**
   * Remove uma regra
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/alerts/rules/${id}/`);
  },

  /**
   * Toggle status de uma regra (enabled/disabled)
   */
  async toggleStatus(id: number): Promise<Rule> {
    const response = await api.post<Rule>(`/alerts/rules/${id}/toggle_status/`);
    return response.data;
  },

  /**
   * Estatísticas das regras
   */
  async statistics(): Promise<RuleStatistics> {
    const response = await api.get<RuleStatistics>('/alerts/rules/statistics/');
    return response.data;
  },
};
