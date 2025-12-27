/**
 * Inventory Service
 * 
 * Gerencia operações de estoque via API TrakSense
 */

import { api } from '@/lib/api';
import type {
  ApiInventoryItem,
  ApiInventoryCategory,
  ApiInventoryMovement,
  PaginatedResponse,
} from '@/types/api';

// ============================================================================
// CATEGORIES
// ============================================================================

export interface InventoryCategoryParams {
  is_active?: boolean;
  parent?: number | null;
  search?: string;
}

export const inventoryCategoriesService = {
  async getAll(params?: InventoryCategoryParams) {
    const response = await api.get<ApiInventoryCategory[]>('/inventory/categories/', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<ApiInventoryCategory>(`/inventory/categories/${id}/`);
    return response.data;
  },

  async getTree() {
    const response = await api.get<ApiInventoryCategory[]>('/inventory/categories/tree/');
    return response.data;
  },

  async create(data: Partial<ApiInventoryCategory>) {
    const response = await api.post<ApiInventoryCategory>('/inventory/categories/', data);
    return response.data;
  },

  async update(id: number, data: Partial<ApiInventoryCategory>) {
    const response = await api.patch<ApiInventoryCategory>(`/inventory/categories/${id}/`, data);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/inventory/categories/${id}/`);
  },
};

// ============================================================================
// ITEMS
// ============================================================================

export interface InventoryItemParams {
  is_active?: boolean;
  is_critical?: boolean;
  category?: number;
  supplier?: string;
  location?: string;
  stock_status?: 'LOW' | 'OUT_OF_STOCK' | 'OK';
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface InventoryStats {
  total_items: number;
  active_items: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  critical_items_count: number;
  categories_count: number;
  recent_movements: number;
}

export const inventoryItemsService = {
  async getAll(params?: InventoryItemParams) {
    const response = await api.get<ApiInventoryItem[]>('/inventory/items/', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<ApiInventoryItem>(`/inventory/items/${id}/`);
    return response.data;
  },

  async getLowStock() {
    const response = await api.get<ApiInventoryItem[]>('/inventory/items/low_stock/');
    return response.data;
  },

  async getCritical() {
    const response = await api.get<ApiInventoryItem[]>('/inventory/items/critical/');
    return response.data;
  },

  async getStats() {
    const response = await api.get<InventoryStats>('/inventory/items/stats/');
    return response.data;
  },

  async getMovements(id: number) {
    const response = await api.get<ApiInventoryMovement[]>(`/inventory/items/${id}/movements/`);
    return response.data;
  },

  async create(data: Partial<ApiInventoryItem>) {
    const response = await api.post<ApiInventoryItem>('/inventory/items/', data);
    return response.data;
  },

  async update(id: number, data: Partial<ApiInventoryItem>) {
    const response = await api.patch<ApiInventoryItem>(`/inventory/items/${id}/`, data);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/inventory/items/${id}/`);
  },

  async adjust(id: number, quantity: number, note?: string) {
    const response = await api.post<{ item: ApiInventoryItem; movement: ApiInventoryMovement }>(
      `/inventory/items/${id}/adjust/`,
      { quantity, note }
    );
    return response.data;
  },
};

// ============================================================================
// MOVEMENTS
// ============================================================================

export interface InventoryMovementParams {
  type?: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';
  reason?: string;
  item?: number;
  work_order?: number;
  performed_by?: number;
  created_at__gte?: string;
  created_at__lte?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface CreateMovementData {
  item: number;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';
  reason: string;
  quantity: number;
  unit_cost?: number;
  work_order_id?: number;
  reference?: string;
  invoice_number?: string;
  note?: string;
}

export interface MovementSummary {
  period_days: number;
  total_movements: number;
  by_type: Array<{ type: string; count: number; total_quantity: number }>;
  by_reason: Array<{ reason: string; count: number }>;
}

export interface ConsumptionByCategory {
  category_id: number | null;
  category_name: string;
  total_consumed: number;
}

export interface TopConsumedItem {
  item_id: number;
  item_name: string;
  item_sku: string;
  item_unit: string;
  category_name: string;
  total_consumed: number;
}

export const inventoryMovementsService = {
  async getAll(params?: InventoryMovementParams) {
    const response = await api.get<PaginatedResponse<ApiInventoryMovement>>('/inventory/movements/', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<ApiInventoryMovement>(`/inventory/movements/${id}/`);
    return response.data;
  },

  async getSummary(days: number = 30) {
    const response = await api.get<MovementSummary>('/inventory/movements/summary/', {
      params: { days },
    });
    return response.data;
  },

  async getConsumptionByCategory(days: number = 90) {
    const response = await api.get<ConsumptionByCategory[]>('/inventory/movements/consumption_by_category/', {
      params: { days },
    });
    return response.data;
  },

  async getTopConsumedItems(days: number = 90, limit: number = 5) {
    const response = await api.get<TopConsumedItem[]>('/inventory/movements/top_consumed_items/', {
      params: { days, limit },
    });
    return response.data;
  },

  async create(data: CreateMovementData) {
    const response = await api.post<ApiInventoryMovement>('/inventory/movements/', data);
    return response.data;
  },
};

// ============================================================================
// COUNTS (Contagens de Inventário)
// ============================================================================

export interface InventoryCount {
  id: number;
  name: string;
  description: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  status_display: string;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  categories: number[];
  location: string;
  created_by: number;
  created_by_name: string;
  performed_by: number | null;
  performed_by_name: string | null;
  notes: string;
  items: InventoryCountItem[];
  item_count: number;
  counted_count: number;
  discrepancy_count: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryCountItem {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  expected_quantity: number;
  counted_quantity: number | null;
  is_counted: boolean;
  difference: number | null;
  has_discrepancy: boolean;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCountData {
  name: string;
  description?: string;
  scheduled_date?: string;
  categories?: number[];
  location?: string;
  notes?: string;
}

export const inventoryCountsService = {
  async getAll(params?: { status?: string; scheduled_date__gte?: string; scheduled_date__lte?: string }) {
    const response = await api.get<InventoryCount[]>('/inventory/counts/', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<InventoryCount>(`/inventory/counts/${id}/`);
    return response.data;
  },

  async create(data: CreateCountData) {
    const response = await api.post<InventoryCount>('/inventory/counts/', data);
    return response.data;
  },

  async update(id: number, data: Partial<CreateCountData>) {
    const response = await api.patch<InventoryCount>(`/inventory/counts/${id}/`, data);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/inventory/counts/${id}/`);
  },

  async start(id: number) {
    const response = await api.post<InventoryCount>(`/inventory/counts/${id}/start/`);
    return response.data;
  },

  async complete(id: number, options?: { apply_partial?: boolean; apply_adjustments?: boolean }) {
    const response = await api.post<{ count: InventoryCount; adjustments_made: number }>(
      `/inventory/counts/${id}/complete/`,
      options
    );
    return response.data;
  },

  async cancel(id: number) {
    const response = await api.post<InventoryCount>(`/inventory/counts/${id}/cancel/`);
    return response.data;
  },

  async generateItems(id: number) {
    const response = await api.post<{ items_created: number; total_items: number }>(
      `/inventory/counts/${id}/generate-items/`
    );
    return response.data;
  },

  async countItem(countId: number, itemId: number, counted_quantity: number, note?: string) {
    const response = await api.post<InventoryCountItem>(
      `/inventory/counts/${countId}/items/${itemId}/count/`,
      { counted_quantity, note }
    );
    return response.data;
  },
};

// Export all services as a single object
export const inventoryService = {
  categories: inventoryCategoriesService,
  items: inventoryItemsService,
  movements: inventoryMovementsService,
  counts: inventoryCountsService,
};

export default inventoryService;
