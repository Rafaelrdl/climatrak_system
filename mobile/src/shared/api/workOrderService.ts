// ============================================================
// ClimaTrak Mobile - Work Orders Service
// ============================================================

import { api, getErrorMessage } from './client';
import { cacheStorage, syncQueueStorage, tenantStorage } from '@/shared/storage';
import { v4 as uuidv4 } from 'uuid';
import type { 
  WorkOrder, 
  WorkOrderFilters, 
  WorkOrderPhoto,
  TimeEntry,
  PartUsage,
  ExternalCost,
  WorkOrderCostSummary,
  PaginatedResponse,
  ChecklistResponse,
} from '@/types';

const CACHE_KEYS = {
  LIST: 'work_orders_list',
  DETAIL: (id: string) => `work_order_${id}`,
  MY_ORDERS: 'my_work_orders',
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface CreateWorkOrderData {
  title: string;
  description?: string;
  type: WorkOrder['type'];
  priority: WorkOrder['priority'];
  asset_id?: string;
  site_id?: string;
  assigned_to_id?: string;
  checklist_template_id?: string;
  due_date?: string;
  estimated_hours?: number;
}

export interface UpdateWorkOrderData {
  title?: string;
  description?: string;
  priority?: WorkOrder['priority'];
  status?: WorkOrder['status'];
  assigned_to_id?: string;
  due_date?: string;
  notes?: string;
}

export const workOrderService = {
  /**
   * List work orders with filters and pagination
   */
  async list(
    filters?: WorkOrderFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<WorkOrder>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('page_size', String(pageSize));

    if (filters) {
      if (filters.status?.length) {
        filters.status.forEach(s => params.append('status', s));
      }
      if (filters.priority?.length) {
        filters.priority.forEach(p => params.append('priority', p));
      }
      if (filters.type?.length) {
        filters.type.forEach(t => params.append('type', t));
      }
      if (filters.assigned_to) {
        params.append('assigned_to', filters.assigned_to);
      }
      if (filters.asset_id) {
        params.append('asset', filters.asset_id);
      }
      if (filters.site_id) {
        params.append('site', filters.site_id);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.due_date_from) {
        params.append('due_date_after', filters.due_date_from);
      }
      if (filters.due_date_to) {
        params.append('due_date_before', filters.due_date_to);
      }
    }

    const response = await api.get<PaginatedResponse<WorkOrder>>(
      `/api/cmms/work-orders/?${params.toString()}`
    );

    // Cache the results
    await cacheStorage.set(CACHE_KEYS.LIST, response.data, CACHE_TTL);

    return response.data;
  },

  /**
   * Get work orders assigned to current user
   */
  async getMyOrders(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<WorkOrder>> {
    const user = await tenantStorage.getUser();
    if (!user) {
      throw new Error('User not logged in');
    }

    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('page_size', String(pageSize));
    params.append('assigned_to', user.id);
    params.append('ordering', '-due_date');

    const response = await api.get<PaginatedResponse<WorkOrder>>(
      `/api/cmms/work-orders/?${params.toString()}`
    );

    // Cache for offline
    await cacheStorage.set(CACHE_KEYS.MY_ORDERS, response.data, CACHE_TTL * 2);

    return response.data;
  },

  /**
   * Get cached list of my orders (for offline)
   */
  async getMyOrdersCached(): Promise<PaginatedResponse<WorkOrder> | null> {
    return cacheStorage.get<PaginatedResponse<WorkOrder>>(CACHE_KEYS.MY_ORDERS);
  },

  /**
   * Get work order by ID
   */
  async getById(id: string): Promise<WorkOrder> {
    const response = await api.get<WorkOrder>(`/api/cmms/work-orders/${id}/`);
    
    // Cache for offline
    await cacheStorage.set(CACHE_KEYS.DETAIL(id), response.data, CACHE_TTL * 2);

    return response.data;
  },

  /**
   * Get cached work order (for offline)
   */
  async getByIdCached(id: string): Promise<WorkOrder | null> {
    return cacheStorage.get<WorkOrder>(CACHE_KEYS.DETAIL(id));
  },

  /**
   * Create new work order
   */
  async create(data: CreateWorkOrderData, offline: boolean = false): Promise<WorkOrder | null> {
    const tenantSlug = tenantStorage.getTenant();
    if (!tenantSlug) throw new Error('Tenant not set');

    const idempotencyKey = `mobile:${tenantSlug}:work_order:create:${uuidv4()}`;

    if (offline) {
      // Queue for later sync
      await syncQueueStorage.addToQueue({
        entity_type: 'work_order',
        action: 'create',
        payload: data,
        idempotency_key: idempotencyKey,
        tenant_slug: tenantSlug,
      });
      return null;
    }

    const response = await api.post<WorkOrder>(
      '/api/cmms/work-orders/',
      data,
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      }
    );

    return response.data;
  },

  /**
   * Update work order
   */
  async update(
    id: string, 
    data: UpdateWorkOrderData, 
    offline: boolean = false
  ): Promise<WorkOrder | null> {
    const tenantSlug = tenantStorage.getTenant();
    if (!tenantSlug) throw new Error('Tenant not set');

    if (offline) {
      await syncQueueStorage.addToQueue({
        entity_type: 'work_order',
        entity_id: id,
        action: 'update',
        payload: data,
        idempotency_key: `mobile:${tenantSlug}:work_order:update:${id}:${Date.now()}`,
        tenant_slug: tenantSlug,
      });
      return null;
    }

    const response = await api.patch<WorkOrder>(
      `/api/cmms/work-orders/${id}/`,
      data
    );

    // Update cache
    await cacheStorage.set(CACHE_KEYS.DETAIL(id), response.data, CACHE_TTL * 2);

    return response.data;
  },

  /**
   * Start work order execution
   */
  async start(id: string, notes?: string): Promise<WorkOrder> {
    const response = await api.post<WorkOrder>(
      `/api/cmms/work-orders/${id}/start/`,
      { notes }
    );
    await cacheStorage.set(CACHE_KEYS.DETAIL(id), response.data, CACHE_TTL * 2);
    return response.data;
  },

  /**
   * Complete work order
   */
  async complete(
    id: string, 
    data?: { notes?: string; resolution?: string }
  ): Promise<WorkOrder> {
    const response = await api.post<WorkOrder>(
      `/api/cmms/work-orders/${id}/complete/`,
      data || {}
    );
    await cacheStorage.set(CACHE_KEYS.DETAIL(id), response.data, CACHE_TTL * 2);
    return response.data;
  },

  /**
   * Cancel work order
   */
  async cancel(id: string, reason?: string): Promise<WorkOrder> {
    const response = await api.post<WorkOrder>(
      `/api/cmms/work-orders/${id}/cancel/`,
      { reason }
    );
    await cacheStorage.set(CACHE_KEYS.DETAIL(id), response.data, CACHE_TTL * 2);
    return response.data;
  },

  /**
   * Upload photo to work order
   */
  async uploadPhoto(
    workOrderId: string,
    imageUri: string,
    caption?: string,
    offline: boolean = false
  ): Promise<WorkOrderPhoto | null> {
    const tenantSlug = tenantStorage.getTenant();
    if (!tenantSlug) throw new Error('Tenant not set');

    if (offline) {
      await syncQueueStorage.addToQueue({
        entity_type: 'photo',
        entity_id: workOrderId,
        action: 'create',
        payload: { image_uri: imageUri, caption },
        idempotency_key: `mobile:${tenantSlug}:photo:${workOrderId}:${Date.now()}`,
        tenant_slug: tenantSlug,
      });
      return null;
    }

    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: `photo_${Date.now()}.jpg`,
    } as unknown as Blob);
    if (caption) {
      formData.append('caption', caption);
    }

    const response = await api.post<WorkOrderPhoto>(
      `/api/cmms/work-orders/${workOrderId}/photos/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  /**
   * Add time entry (labor hours)
   */
  async addTimeEntry(
    workOrderId: string,
    data: {
      hours: number;
      description?: string;
      date?: string;
    },
    offline: boolean = false
  ): Promise<TimeEntry | null> {
    const tenantSlug = tenantStorage.getTenant();
    if (!tenantSlug) throw new Error('Tenant not set');

    if (offline) {
      await syncQueueStorage.addToQueue({
        entity_type: 'time_entry',
        entity_id: workOrderId,
        action: 'create',
        payload: { work_order: workOrderId, ...data },
        idempotency_key: `mobile:${tenantSlug}:time_entry:${workOrderId}:${Date.now()}`,
        tenant_slug: tenantSlug,
      });
      return null;
    }

    const response = await api.post<TimeEntry>(
      '/api/cmms/time-entries/',
      {
        work_order: workOrderId,
        ...data,
        date: data.date || new Date().toISOString().split('T')[0],
      }
    );

    return response.data;
  },

  /**
   * Add part usage
   */
  async addPartUsage(
    workOrderId: string,
    data: {
      inventory_item_id: string;
      quantity: number;
      notes?: string;
    },
    offline: boolean = false
  ): Promise<PartUsage | null> {
    const tenantSlug = tenantStorage.getTenant();
    if (!tenantSlug) throw new Error('Tenant not set');

    if (offline) {
      await syncQueueStorage.addToQueue({
        entity_type: 'part_usage',
        entity_id: workOrderId,
        action: 'create',
        payload: { work_order: workOrderId, ...data },
        idempotency_key: `mobile:${tenantSlug}:part_usage:${workOrderId}:${data.inventory_item_id}:${Date.now()}`,
        tenant_slug: tenantSlug,
      });
      return null;
    }

    const response = await api.post<PartUsage>(
      '/api/cmms/part-usage/',
      {
        work_order: workOrderId,
        inventory_item: data.inventory_item_id,
        quantity: data.quantity,
        notes: data.notes,
      }
    );

    return response.data;
  },

  /**
   * Save checklist responses
   */
  async saveChecklistResponses(
    workOrderId: string,
    responses: ChecklistResponse[],
    offline: boolean = false
  ): Promise<void> {
    const tenantSlug = tenantStorage.getTenant();
    if (!tenantSlug) throw new Error('Tenant not set');

    if (offline) {
      await syncQueueStorage.addToQueue({
        entity_type: 'checklist_response',
        entity_id: workOrderId,
        action: 'update',
        payload: { responses },
        idempotency_key: `mobile:${tenantSlug}:checklist:${workOrderId}:${Date.now()}`,
        tenant_slug: tenantSlug,
      });
      return;
    }

    await api.patch(`/api/cmms/work-orders/${workOrderId}/`, {
      checklist_responses: responses,
    });
  },

  /**
   * Get cost summary for work order
   */
  async getCostSummary(workOrderId: string): Promise<WorkOrderCostSummary> {
    const response = await api.get<WorkOrderCostSummary>(
      `/api/cmms/work-orders/${workOrderId}/cost-summary/`
    );
    return response.data;
  },

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    total: number;
    open: number;
    in_progress: number;
    completed: number;
    overdue: number;
  }> {
    const response = await api.get('/api/cmms/work-orders/stats/');
    return response.data;
  },
};

export default workOrderService;
