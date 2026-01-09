/**
 * Requests Service (Solicitações de Manutenção)
 * 
 * Serviço para gerenciamento de solicitações
 * 
 * Endpoints:
 * - GET /api/cmms/requests/ - Lista
 * - POST /api/cmms/requests/ - Criar
 * - PATCH /api/cmms/requests/{id}/ - Atualizar
 * - POST /api/cmms/requests/{id}/convert/ - Converter para OS
 */

import { api } from '@/lib/api';
import type { Solicitation, SolicitationItem, SolicitationStatusHistory } from '@/types';
import type { ApiRequest, PaginatedResponse } from '@/types/api';

// ============================================
// Tipos
// ============================================

export interface RequestFilters {
  status?: ('NEW' | 'TRIAGING' | 'CONVERTED' | 'REJECTED')[];
  location?: string;
  asset?: string;
  requester?: string;
  search?: string;
  created_from?: string;
  created_to?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface CreateRequestData {
  sector_id: string;
  subsection_id?: string;
  equipment_id?: string;
  note: string;
  items?: { stock_item_id: string; qty: number }[];
}

export interface ConvertToWorkOrderData {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scheduled_date: string;
  assigned_to?: string;
  description?: string;
}

// ============================================
// Mappers
// ============================================

const mapStatus = (status: ApiRequest['status']): Solicitation['status'] => {
  switch (status) {
    case 'NEW':
      return 'Nova';
    case 'TRIAGING':
      return 'Em triagem';
    case 'CONVERTED':
      return 'Convertida em OS';
    case 'REJECTED':
      return 'Rejeitada';
    default:
      return 'Nova';
  }
};

const mapRequest = (req: ApiRequest): Solicitation => ({
  id: String(req.id),
  location_id: req.subsection ? String(req.subsection) : String(req.sector),
  location_name: req.subsection_name || req.sector_name || '',
  equipment_id: req.asset ? String(req.asset) : '',
  equipment_name: req.asset_name || '',
  requester_user_id: String(req.requester),
  requester_user_name: req.requester_name,
  status: mapStatus(req.status),
  note: req.note,
  items: req.items?.map((i): SolicitationItem => ({
    id: String(i.id),
    stock_item_id: String(i.inventory_item),
    stock_item_name: i.item_name,
    unit: i.unit,
    qty: i.quantity,
  })) || [],
  status_history: req.status_history?.map((h): SolicitationStatusHistory => ({
    from: h.from_status === 'NEW' ? 'Nova' :
          h.from_status === 'TRIAGING' ? 'Em triagem' :
          h.from_status === 'CONVERTED' ? 'Convertida em OS' :
          h.from_status === 'REJECTED' ? 'Rejeitada' : undefined,
    to: h.to_status === 'NEW' ? 'Nova' :
        h.to_status === 'TRIAGING' ? 'Em triagem' :
        h.to_status === 'CONVERTED' ? 'Convertida em OS' :
        h.to_status === 'REJECTED' ? 'Rejeitada' : 'Nova',
    at: h.changed_at,
  })) || [],
  rejection_reason: req.rejection_reason || undefined,
  work_order_id: req.work_order_id ? String(req.work_order_id) : undefined,
  work_order_number: req.work_order_number || undefined,
  created_at: req.created_at,
  updated_at: req.updated_at,
});

// ============================================
// Service
// ============================================

export const requestsService = {
  /**
   * Lista todas as solicitações
   */
  async getAll(filters?: RequestFilters): Promise<Solicitation[]> {
    const params: Record<string, string | number | undefined> = {};
    
    if (filters?.status?.length) params.status__in = filters.status.join(',');
    if (filters?.location) params.location = filters.location;
    if (filters?.asset) params.asset = filters.asset;
    if (filters?.requester) params.requester = filters.requester;
    if (filters?.search) params.search = filters.search;
    if (filters?.created_from) params.created_from = filters.created_from;
    if (filters?.created_to) params.created_to = filters.created_to;
    if (filters?.ordering) params.ordering = filters.ordering;
    if (filters?.page) params.page = filters.page;
    if (filters?.page_size) params.page_size = filters.page_size;

    const response = await api.get<PaginatedResponse<ApiRequest>>('/cmms/requests/', { params });
    return response.data.results.map(mapRequest);
  },

  /**
   * Busca uma solicitação por ID
   */
  async getById(id: string): Promise<Solicitation> {
    const response = await api.get<ApiRequest>(`/cmms/requests/${id}/`);
    return mapRequest(response.data);
  },

  /**
   * Cria uma nova solicitação
   */
  async create(data: CreateRequestData): Promise<Solicitation> {
    const payload = {
      sector: Number(data.sector_id),
      subsection: data.subsection_id ? Number(data.subsection_id) : null,
      asset: data.equipment_id ? Number(data.equipment_id) : null,
      note: data.note,
      items: data.items?.map(i => ({
        inventory_item: Number(i.stock_item_id),
        quantity: i.qty,
      })),
    };
    const response = await api.post<ApiRequest>('/cmms/requests/', payload);
    return mapRequest(response.data);
  },

  /**
   * Atualiza status de uma solicitação
   */
  async updateStatus(id: string, status: 'NEW' | 'TRIAGING' | 'REJECTED', rejection_reason?: string): Promise<Solicitation> {
    const payload: { status: string; rejection_reason?: string } = { status };
    if (status === 'REJECTED' && rejection_reason) {
      payload.rejection_reason = rejection_reason;
    }
    const response = await api.patch<ApiRequest>(`/cmms/requests/${id}/`, payload);
    return mapRequest(response.data);
  },

  /**
   * Converte solicitação em ordem de serviço
   */
  async convertToWorkOrder(id: string, data: ConvertToWorkOrderData): Promise<{
    request: Solicitation;
    work_order_id: string;
    work_order_number: string;
  }> {
    const payload = {
      priority: data.priority,
      scheduled_date: data.scheduled_date,
      assigned_to: data.assigned_to ? Number(data.assigned_to) : null,
      description: data.description,
    };
    
    const response = await api.post<{
      request: ApiRequest;
      work_order_id: number;
      work_order_number: string;
    }>(`/cmms/requests/${id}/convert/`, payload);
    
    return {
      request: mapRequest(response.data.request),
      work_order_id: String(response.data.work_order_id),
      work_order_number: response.data.work_order_number,
    };
  },

  /**
   * Adiciona item de estoque à solicitação
   */
  async addItem(requestId: string, itemId: string, quantity: number): Promise<SolicitationItem> {
    const response = await api.post<{
      id: number;
      inventory_item: number;
      item_name: string;
      quantity: number;
      unit: string;
    }>(`/cmms/requests/${requestId}/items/`, {
      inventory_item: Number(itemId),
      quantity,
    });
    
    return {
      id: String(response.data.id),
      stock_item_id: String(response.data.inventory_item),
      stock_item_name: response.data.item_name,
      qty: response.data.quantity,
      unit: response.data.unit,
    };
  },

  /**
   * Remove item de uma solicitação
   */
  async removeItem(requestId: string, itemId: string): Promise<void> {
    await api.delete(`/cmms/requests/${requestId}/items/${itemId}/`);
  },

  /**
   * Obtém contagem por status
   */
  async getStatusCounts(): Promise<{
    new: number;
    triaging: number;
    converted: number;
    rejected: number;
  }> {
    const response = await api.get<{
      new: number;
      triaging: number;
      converted: number;
      rejected: number;
    }>('/cmms/requests/counts/');
    return response.data;
  },
};
