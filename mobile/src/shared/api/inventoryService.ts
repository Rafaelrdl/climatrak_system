// ============================================================
// ClimaTrak Mobile - Inventory Service
// ============================================================

import { api } from './client';
import { cacheStorage, syncQueueStorage, globalStorage } from '@/shared/storage';
import type { 
  InventoryItem, 
  InventoryFilters, 
  PaginatedResponse 
} from '@/types';

const CACHE_KEYS = {
  LIST: 'inventory_list',
  DETAIL: (id: string) => `inventory_${id}`,
  LOW_STOCK: 'inventory_low_stock',
};

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export interface InventoryMovement {
  id: string;
  item_id: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  work_order_id?: string;
  notes?: string;
  created_at: string;
  created_by: {
    id: string;
    name: string;
  };
}

export const inventoryService = {
  /**
   * List inventory items with filters and pagination
   */
  async list(
    filters?: InventoryFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<InventoryItem>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('page_size', String(pageSize));

    if (filters) {
      if (filters.category) {
        params.append('category', filters.category);
      }
      if (filters.warehouse_id) {
        params.append('warehouse', filters.warehouse_id);
      }
      if (filters.low_stock) {
        params.append('low_stock', 'true');
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
    }

    const response = await api.get<PaginatedResponse<InventoryItem>>(
      `/api/inventory/items/?${params.toString()}`
    );

    await cacheStorage.set(CACHE_KEYS.LIST, response.data, CACHE_TTL);

    return response.data;
  },

  /**
   * Search inventory items by name, code, or barcode
   */
  async search(query: string): Promise<InventoryItem[]> {
    const params = new URLSearchParams();
    params.append('search', query);
    params.append('page_size', '20');

    const response = await api.get<PaginatedResponse<InventoryItem>>(
      `/api/inventory/items/?${params.toString()}`
    );

    return response.data.results;
  },

  /**
   * Find item by barcode
   */
  async findByBarcode(barcode: string): Promise<InventoryItem | null> {
    const params = new URLSearchParams();
    params.append('barcode', barcode);

    const response = await api.get<PaginatedResponse<InventoryItem>>(
      `/api/inventory/items/?${params.toString()}`
    );

    if (response.data.results.length > 0) {
      const item = response.data.results[0];
      await cacheStorage.set(CACHE_KEYS.DETAIL(item.id), item, CACHE_TTL);
      return item;
    }

    return null;
  },

  /**
   * Get item by ID
   */
  async getById(id: string): Promise<InventoryItem> {
    const response = await api.get<InventoryItem>(`/api/inventory/items/${id}/`);
    
    await cacheStorage.set(CACHE_KEYS.DETAIL(id), response.data, CACHE_TTL);

    return response.data;
  },

  /**
   * Get cached item
   */
  async getByIdCached(id: string): Promise<InventoryItem | null> {
    return cacheStorage.get<InventoryItem>(CACHE_KEYS.DETAIL(id));
  },

  /**
   * Get low stock items
   */
  async getLowStock(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<InventoryItem>> {
    const params = new URLSearchParams();
    params.append('low_stock', 'true');
    params.append('page', String(page));
    params.append('page_size', String(pageSize));

    const response = await api.get<PaginatedResponse<InventoryItem>>(
      `/api/inventory/items/?${params.toString()}`
    );

    await cacheStorage.set(CACHE_KEYS.LOW_STOCK, response.data, CACHE_TTL);

    return response.data;
  },

  /**
   * Get item movement history
   */
  async getMovements(
    itemId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<InventoryMovement>> {
    const params = new URLSearchParams();
    params.append('item', itemId);
    params.append('page', String(page));
    params.append('page_size', String(pageSize));
    params.append('ordering', '-created_at');

    const response = await api.get<PaginatedResponse<InventoryMovement>>(
      `/api/inventory/movements/?${params.toString()}`
    );

    return response.data;
  },

  /**
   * Register stock movement (for work orders)
   */
  async registerMovement(
    itemId: string,
    data: {
      type: 'out' | 'in' | 'adjustment';
      quantity: number;
      work_order_id?: string;
      notes?: string;
    }
  ): Promise<InventoryMovement> {
    const deviceId = await globalStorage.getDeviceId();
    const idempotencyKey = `mobile:${deviceId}:inv_move:${itemId}:${Date.now()}`;

    try {
      const response = await api.post<InventoryMovement>(
        `/api/inventory/items/${itemId}/movement/`,
        data,
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );

      // Invalidate cache since stock changed
      await cacheStorage.remove(CACHE_KEYS.DETAIL(itemId));
      await cacheStorage.remove(CACHE_KEYS.LIST);
      await cacheStorage.remove(CACHE_KEYS.LOW_STOCK);

      return response.data;
    } catch (error: any) {
      // Queue for later if offline
      if (!error.response) {
        await syncQueueStorage.add({
          entity_type: 'inventory',
          action: 'update',
          payload: { itemId, ...data },
          endpoint: `/api/inventory/items/${itemId}/movement/`,
          method: 'POST',
          idempotency_key: idempotencyKey,
        });

        // Return optimistic movement
        return {
          id: `temp_${Date.now()}`,
          item_id: itemId,
          type: data.type,
          quantity: data.quantity,
          work_order_id: data.work_order_id,
          notes: data.notes,
          created_at: new Date().toISOString(),
          created_by: { id: '', name: 'Você' },
        };
      }
      throw error;
    }
  },

  /**
   * Get categories
   */
  async getCategories(): Promise<{ id: string; name: string }[]> {
    const response = await api.get<{ id: string; name: string }[]>(
      '/api/inventory/categories/'
    );
    return response.data;
  },

  /**
   * Get warehouses
   */
  async getWarehouses(): Promise<{ id: string; name: string; site?: string }[]> {
    const response = await api.get<{ id: string; name: string; site?: string }[]>(
      '/api/inventory/warehouses/'
    );
    return response.data;
  },

  /**
   * Check stock availability
   */
  async checkAvailability(
    itemId: string,
    quantity: number
  ): Promise<{
    available: boolean;
    current_stock: number;
    reserved: number;
  }> {
    const response = await api.get(
      `/api/inventory/items/${itemId}/availability/?quantity=${quantity}`
    );
    return response.data;
  },
};

export default inventoryService;
