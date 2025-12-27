/**
 * Service para gerenciar Alertas do módulo Monitor
 * 
 * Alertas são gerados automaticamente quando regras são disparadas
 * 
 * Endpoints:
 * - GET /api/alerts/alerts/ - Lista alertas
 * - GET /api/alerts/alerts/{id}/ - Detalhes do alerta
 * - POST /api/alerts/alerts/{id}/acknowledge/ - Reconhecer alerta
 * - POST /api/alerts/alerts/{id}/resolve/ - Resolver alerta
 * - POST /api/alerts/alerts/{id}/link_work_order/ - Vincular OS ao alerta
 * - GET /api/alerts/alerts/statistics/ - Estatísticas
 */

import { api } from '@/lib/api';
import type { 
  Alert, 
  AlertFilters, 
  AlertStatistics,
  AcknowledgeAlertRequest,
  ResolveAlertRequest
} from '../types/alert';

interface PaginatedResponse<T> {
  results: T[];
  count: number;
}

interface LinkWorkOrderResponse {
  status: string;
  alert: Alert;
  work_order_number: string;
}

export const alertsService = {
  /**
   * Lista todos os alertas
   */
  async list(filters?: AlertFilters): Promise<PaginatedResponse<Alert>> {
    const response = await api.get<PaginatedResponse<Alert>>('/alerts/alerts/', { params: filters });
    return response.data;
  },

  /**
   * Busca um alerta específico
   */
  async get(id: number): Promise<Alert> {
    const response = await api.get<Alert>(`/alerts/alerts/${id}/`);
    return response.data;
  },

  /**
   * Reconhece um alerta
   */
  async acknowledge(id: number, data?: AcknowledgeAlertRequest): Promise<{ status: string; alert: Alert }> {
    const response = await api.post<{ status: string; alert: Alert }>(`/alerts/alerts/${id}/acknowledge/`, data || {});
    return response.data;
  },

  /**
   * Resolve um alerta
   */
  async resolve(id: number, data?: ResolveAlertRequest): Promise<{ status: string; alert: Alert }> {
    const response = await api.post<{ status: string; alert: Alert }>(`/alerts/alerts/${id}/resolve/`, data || {});
    return response.data;
  },

  /**
   * Exclui um alerta
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/alerts/alerts/${id}/`);
  },

  /**
   * Vincula uma ordem de serviço ao alerta e o reconhece automaticamente
   */
  async linkWorkOrder(alertId: number, workOrderId: number): Promise<LinkWorkOrderResponse> {
    const response = await api.post<LinkWorkOrderResponse>(
      `/alerts/alerts/${alertId}/link_work_order/`,
      { work_order_id: workOrderId }
    );
    return response.data;
  },

  /**
   * Estatísticas dos alertas
   */
  async statistics(): Promise<AlertStatistics> {
    const response = await api.get<AlertStatistics>('/alerts/alerts/statistics/');
    return response.data;
  },
};
