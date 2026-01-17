/**
 * Work Orders Service
 * 
 * Serviço para gerenciamento de Ordens de Serviço (OS)
 * Integra com API Django REST Framework
 * 
 * Endpoints:
 * - GET /api/cmms/work-orders/ - Lista com filtros
 * - POST /api/cmms/work-orders/ - Criar
 * - GET /api/cmms/work-orders/{id}/ - Detalhes
 * - PATCH /api/cmms/work-orders/{id}/ - Atualizar
 * - DELETE /api/cmms/work-orders/{id}/ - Deletar
 * - POST /api/cmms/work-orders/{id}/start/ - Iniciar
 * - POST /api/cmms/work-orders/{id}/complete/ - Concluir
 * - POST /api/cmms/work-orders/{id}/cancel/ - Cancelar
 */

import { api } from '@/lib/api';
import type { WorkOrder, ChecklistResponse, UploadedPhoto, WorkOrderStockItem, ChecklistTemplateItem } from '@/types';
import type { ApiChecklistResponse, ApiWorkOrder, PaginatedResponse } from '@/types/api';

// ============================================
// Helpers
// ============================================

/**
 * Normaliza URL de arquivo para ser absoluta
 * Em desenvolvimento, URLs relativas precisam apontar para o backend
 */
const normalizeFileUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  
  // Já é uma URL absoluta
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // URL relativa - construir URL absoluta para o backend
  // Em dev, usamos o proxy do Vite, então URLs relativas como /media/... funcionam
  // Mas se o backend retorna URLs sem a barra inicial, precisamos ajustar
  const baseUrl = import.meta.env.DEV 
    ? 'http://umc.localhost:8000'  // Backend direto em dev
    : window.location.origin;
  
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${path}`;
};

// ============================================
// Tipos de Filtros
// ============================================

export interface WorkOrderFilters {
  status?: ('OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED')[];
  type?: ('PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE' | 'EMERGENCY' | 'REQUEST')[];
  priority?: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];
  asset?: string;
  assigned_to?: string;
  scheduled_from?: string;
  scheduled_to?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface CompleteWorkOrderData {
  execution_description?: string;
  actual_hours?: number;
  checklist_responses?: ApiChecklistResponse[];
}

export interface WorkOrderStats {
  total: number;
  open: number;
  in_progress: number;
  completed: number;
  overdue: number;
  by_type: {
    preventive: number;
    corrective: number;
    emergency: number;
    request?: number;
  };
  by_priority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

// ============================================
// Mappers: API → Frontend
// ============================================

/**
 * Mapeia status do backend para frontend
 */
const mapStatus = (status: ApiWorkOrder['status']): WorkOrder['status'] => {
  const mapping: Record<ApiWorkOrder['status'], WorkOrder['status']> = {
    'OPEN': 'OPEN',
    'IN_PROGRESS': 'IN_PROGRESS',
    'COMPLETED': 'COMPLETED',
    'CANCELLED': 'CANCELLED',
  };
  return mapping[status] || 'OPEN';
};

/**
 * Mapeia tipo de OS da API para o frontend
 */
const mapType = (type: ApiWorkOrder['type']): WorkOrder['type'] => {
  if (type === 'REQUEST') return 'REQUEST';
  if (type === 'PREVENTIVE') return 'PREVENTIVE';
  if (type === 'EMERGENCY') return 'EMERGENCY';
  return 'CORRECTIVE';
};

/**
 * Mapeia Work Order da API para o modelo do frontend
 */
const mapWorkOrder = (wo: ApiWorkOrder): WorkOrder => ({
  id: String(wo.id),
  number: wo.number,
  equipmentId: String(wo.asset),
  type: mapType(wo.type),
  status: mapStatus(wo.status),
  priority: wo.priority,
  description: wo.description,
  scheduledDate: wo.scheduled_date,
  createdAt: wo.created_at,
  startedAt: wo.started_at || undefined,
  completedAt: wo.completed_at || undefined,
  assignedTo: wo.assigned_to ? String(wo.assigned_to) : undefined,
  assignedToName: wo.assigned_to_name || undefined,
  executionDescription: wo.execution_description || undefined,
  maintenancePlanId: wo.maintenance_plan ? String(wo.maintenance_plan) : undefined,
  requestId: wo.request ? String(wo.request) : undefined,
  photos: Array.isArray(wo.photos) ? wo.photos.map((p): UploadedPhoto => ({
    id: String(p.id),
    url: normalizeFileUrl(p.file),
    name: p.caption || p.file?.split('/').pop() || 'Foto',
    uploadedAt: p.uploaded_at,
    uploadedBy: p.uploaded_by_name || undefined,
  })) : [],
  checklistResponses: Array.isArray(wo.checklist_responses) ? wo.checklist_responses.map((cr): ChecklistResponse => ({
    taskId: cr.item_id,
    taskName: cr.question,
    completed: Boolean(cr.response),
    observations: cr.observations,
  })) : [],
  stockItems: Array.isArray(wo.items) ? wo.items.map((i): WorkOrderStockItem => ({
    id: String(i.id),
    workOrderId: String(wo.id),
    stockItemId: String(i.inventory_item),
    itemName: i.item_name,
    itemSku: i.item_sku,
    unit: i.unit,
    quantity: i.quantity,
  })) : [],
  // Campos de assinatura
  signature: wo.signature || undefined,
  signedBy: wo.signed_by || undefined,
  signedAt: wo.signed_at || undefined,
  // Campos de checklist template
  checklistTemplate: wo.checklist_template || undefined,
  checklistTemplateName: wo.checklist_template_name || undefined,
  checklistTemplateItems: Array.isArray(wo.checklist_template_items) 
    ? wo.checklist_template_items.map((item): ChecklistTemplateItem => ({
        id: item.id,
        label: item.label,
        type: item.type,
        required: item.required,
        order: item.order,
        options: item.options,
      }))
    : undefined,
});

/**
 * Converte data ISO para formato YYYY-MM-DD
 */
const formatDateForApi = (dateString: string): string => {
  // Se já está no formato YYYY-MM-DD, retornar como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  // Se for ISO datetime, extrair apenas a parte da data
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

/**
 * Mapeia dados do frontend para payload da API
 */
const mapToApi = (data: Partial<WorkOrder>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  
  if (data.equipmentId) payload.asset = Number(data.equipmentId);
  if (data.type) payload.type = data.type;
  if ('status' in data) payload.status = data.status;
  if (data.priority) payload.priority = data.priority;
  if (data.description) payload.description = data.description;
  if ('scheduledDate' in data) {
    // Se for undefined, envia null para limpar o campo
    payload.scheduled_date = data.scheduledDate ? formatDateForApi(data.scheduledDate) : null;
  }
  if ('assignedTo' in data) {
    // Se for undefined, envia null para limpar o campo
    payload.assigned_to = data.assignedTo ? Number(data.assignedTo) : null;
  }
  if ('assignedToName' in data) {
    // Remover o nome do técnico quando for undefined
    payload.assigned_to_name = data.assignedToName || null;
  }
  if ('executionDescription' in data) payload.execution_description = data.executionDescription;
  if (data.startedAt) payload.started_at = data.startedAt;
  if (data.completedAt) payload.completed_at = data.completedAt;
  
  // Campos de assinatura
  if ('signature' in data) payload.signature = data.signature;
  if ('signedBy' in data) payload.signed_by = data.signedBy;
  if ('signedAt' in data) payload.signed_at = data.signedAt;
  
  return payload;
};

// ============================================
// Service
// ============================================

export const workOrdersService = {
  /**
   * Lista todas as ordens de serviço com filtros
   */
  async getAll(filters?: WorkOrderFilters): Promise<WorkOrder[]> {
    const params: Record<string, string | number | undefined> = {};
    
    if (filters?.status?.length) params.status__in = filters.status.join(',');
    if (filters?.type?.length) params.type__in = filters.type.join(',');
    if (filters?.priority?.length) params.priority__in = filters.priority.join(',');
    if (filters?.asset) params.asset = filters.asset;
    if (filters?.assigned_to) params.assigned_to = filters.assigned_to;
    if (filters?.scheduled_from) params.scheduled_date__gte = filters.scheduled_from;
    if (filters?.scheduled_to) params.scheduled_date__lte = filters.scheduled_to;
    if (filters?.search) params.search = filters.search;
    if (filters?.ordering) params.ordering = filters.ordering;
    if (filters?.page) params.page = filters.page;
    if (filters?.page_size) params.page_size = filters.page_size;

    const response = await api.get<PaginatedResponse<ApiWorkOrder>>('/cmms/work-orders/', { params });
    return response.data.results.map(mapWorkOrder);
  },

  /**
   * Lista paginada com metadados
   */
  async getAllPaginated(filters?: WorkOrderFilters): Promise<{
    results: WorkOrder[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const params: Record<string, string | number | undefined> = {};
    
    if (filters?.status?.length) params.status__in = filters.status.join(',');
    if (filters?.type?.length) params.type__in = filters.type.join(',');
    if (filters?.priority?.length) params.priority__in = filters.priority.join(',');
    if (filters?.asset) params.asset = filters.asset;
    if (filters?.assigned_to) params.assigned_to = filters.assigned_to;
    if (filters?.scheduled_from) params.scheduled_date__gte = filters.scheduled_from;
    if (filters?.scheduled_to) params.scheduled_date__lte = filters.scheduled_to;
    if (filters?.search) params.search = filters.search;
    if (filters?.ordering) params.ordering = filters.ordering;
    if (filters?.page) params.page = filters.page;
    if (filters?.page_size) params.page_size = filters.page_size;

    const response = await api.get<PaginatedResponse<ApiWorkOrder>>('/cmms/work-orders/', { params });
    return {
      results: response.data.results.map(mapWorkOrder),
      count: response.data.count,
      next: response.data.next,
      previous: response.data.previous,
    };
  },

  /**
   * Busca uma ordem de serviço por ID
   */
  async getById(id: string): Promise<WorkOrder> {
    const response = await api.get<ApiWorkOrder>(`/cmms/work-orders/${id}/`);
    return mapWorkOrder(response.data);
  },

  /**
   * Cria uma nova ordem de serviço
   */
  async create(data: Partial<WorkOrder>): Promise<WorkOrder> {
    const payload = mapToApi(data);
    const response = await api.post<ApiWorkOrder>('/cmms/work-orders/', payload);
    return mapWorkOrder(response.data);
  },

  /**
   * Atualiza uma ordem de serviço
   */
  async update(id: string, data: Partial<WorkOrder>): Promise<WorkOrder> {
    const payload = mapToApi(data);
    const response = await api.patch<ApiWorkOrder>(`/cmms/work-orders/${id}/`, payload);
    return mapWorkOrder(response.data);
  },

  /**
   * Deleta uma ordem de serviço
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/cmms/work-orders/${id}/`);
  },

  /**
   * Inicia uma ordem de serviço (muda status para IN_PROGRESS)
   */
  async start(id: string, technicianId?: string): Promise<WorkOrder> {
    const data = technicianId ? { assigned_to: Number(technicianId) } : {};
    const response = await api.post<ApiWorkOrder>(`/cmms/work-orders/${id}/start/`, data);
    return mapWorkOrder(response.data);
  },

  /**
   * Conclui uma ordem de serviço
   */
  async complete(id: string, data: CompleteWorkOrderData): Promise<WorkOrder> {
    const response = await api.post<ApiWorkOrder>(`/cmms/work-orders/${id}/complete/`, data);
    return mapWorkOrder(response.data);
  },

  /**
   * Cancela uma ordem de serviço
   */
  async cancel(id: string, reason: string): Promise<WorkOrder> {
    const response = await api.post<ApiWorkOrder>(`/cmms/work-orders/${id}/cancel/`, { reason });
    return mapWorkOrder(response.data);
  },

  /**
   * Processa e posta custos da OS no Finance
   */
  async postCosts(id: string): Promise<{
    success: boolean;
    transactions_created: number;
    transactions: string[];
  }> {
    const response = await api.post<{
      success: boolean;
      transactions_created: number;
      transactions: string[];
    }>(`/cmms/work-orders/${id}/post-costs/`);
    return response.data;
  },

  /**
   * Upload de foto para uma OS
   */
  async uploadPhoto(id: string, file: File, caption?: string): Promise<UploadedPhoto> {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);
    
    const response = await api.post<{
      id: number;
      file: string;
      caption: string;
      uploaded_at: string;
      uploaded_by_name?: string;
    }>(`/cmms/work-orders/${id}/photos/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    return {
      id: String(response.data.id),
      url: normalizeFileUrl(response.data.file),
      name: response.data.caption || file.name,
      uploadedAt: response.data.uploaded_at,
      uploadedBy: response.data.uploaded_by_name,
    };
  },

  /**
   * Remove uma foto de uma OS
   */
  async deletePhoto(workOrderId: string, photoId: string): Promise<void> {
    await api.delete(`/cmms/work-orders/${workOrderId}/photos/${photoId}/`);
  },

  /**
   * Adiciona item de estoque a uma OS
   */
  async addStockItem(id: string, itemId: string, quantity: number): Promise<WorkOrderStockItem> {
    const response = await api.post<{
      id: number;
      inventory_item: number;
      quantity: number;
    }>(`/cmms/work-orders/${id}/items/`, {
      inventory_item: Number(itemId),
      quantity,
    });
    
    return {
      id: String(response.data.id),
      workOrderId: id,
      stockItemId: String(response.data.inventory_item),
      quantity: response.data.quantity,
    };
  },

  /**
   * Remove item de estoque de uma OS
   */
  async removeStockItem(workOrderId: string, itemId: string): Promise<void> {
    await api.delete(`/cmms/work-orders/${workOrderId}/items/${itemId}/`);
  },

  /**
   * Obtém estatísticas das ordens de serviço
   */
  async getStats(): Promise<WorkOrderStats> {
    const response = await api.get<WorkOrderStats>('/cmms/work-orders/stats/');
    return response.data;
  },

  /**
   * Obtém ordens de serviço de um equipamento específico
   */
  async getByAsset(assetId: string): Promise<WorkOrder[]> {
    return this.getAll({ asset: assetId });
  },

  /**
   * Obtém ordens de serviço atrasadas
   */
  async getOverdue(): Promise<WorkOrder[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getAll({
      status: ['OPEN', 'IN_PROGRESS'],
      scheduled_to: today,
    });
  },

  /**
   * Obtém próximas ordens de serviço (próximos 7 dias)
   */
  async getUpcoming(days: number = 7): Promise<WorkOrder[]> {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);
    
    return this.getAll({
      status: ['OPEN'],
      scheduled_from: today.toISOString().split('T')[0],
      scheduled_to: futureDate.toISOString().split('T')[0],
    });
  },
};
