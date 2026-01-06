// ============================================================
// ClimaTrak Mobile - Assets Service
// ============================================================

import { api } from './client';
import { cacheStorage } from '@/shared/storage';
import type { 
  Asset, 
  AssetFilters, 
  WorkOrder,
  PaginatedResponse 
} from '@/types';

const CACHE_KEYS = {
  LIST: 'assets_list',
  DETAIL: (id: string) => `asset_${id}`,
  HISTORY: (id: string) => `asset_history_${id}`,
};

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const assetService = {
  /**
   * List assets with filters and pagination
   */
  async list(
    filters?: AssetFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<Asset>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('page_size', String(pageSize));

    if (filters) {
      if (filters.status?.length) {
        filters.status.forEach(s => params.append('status', s));
      }
      if (filters.criticality?.length) {
        filters.criticality.forEach(c => params.append('criticality', c));
      }
      if (filters.type?.length) {
        filters.type.forEach(t => params.append('type', t));
      }
      if (filters.site_id) {
        params.append('site', filters.site_id);
      }
      if (filters.sector_id) {
        params.append('sector', filters.sector_id);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
    }

    const response = await api.get<PaginatedResponse<Asset>>(
      `/api/assets/?${params.toString()}`
    );

    // Cache the results
    await cacheStorage.set(CACHE_KEYS.LIST, response.data, CACHE_TTL);

    return response.data;
  },

  /**
   * Search assets by tag, name, or QR code
   */
  async search(query: string): Promise<Asset[]> {
    const params = new URLSearchParams();
    params.append('search', query);
    params.append('page_size', '20');

    const response = await api.get<PaginatedResponse<Asset>>(
      `/api/assets/?${params.toString()}`
    );

    return response.data.results;
  },

  /**
   * Find asset by QR code
   */
  async findByQrCode(qrCode: string): Promise<Asset | null> {
    const params = new URLSearchParams();
    params.append('qr_code', qrCode);

    const response = await api.get<PaginatedResponse<Asset>>(
      `/api/assets/?${params.toString()}`
    );

    if (response.data.results.length > 0) {
      const asset = response.data.results[0];
      await cacheStorage.set(CACHE_KEYS.DETAIL(asset.id), asset, CACHE_TTL);
      return asset;
    }

    return null;
  },

  /**
   * Find asset by tag
   */
  async findByTag(tag: string): Promise<Asset | null> {
    const params = new URLSearchParams();
    params.append('tag', tag);

    const response = await api.get<PaginatedResponse<Asset>>(
      `/api/assets/?${params.toString()}`
    );

    if (response.data.results.length > 0) {
      const asset = response.data.results[0];
      await cacheStorage.set(CACHE_KEYS.DETAIL(asset.id), asset, CACHE_TTL);
      return asset;
    }

    return null;
  },

  /**
   * Get asset by ID
   */
  async getById(id: string): Promise<Asset> {
    const response = await api.get<Asset>(`/api/assets/${id}/`);
    
    // Cache for offline
    await cacheStorage.set(CACHE_KEYS.DETAIL(id), response.data, CACHE_TTL);

    return response.data;
  },

  /**
   * Get cached asset (for offline)
   */
  async getByIdCached(id: string): Promise<Asset | null> {
    return cacheStorage.get<Asset>(CACHE_KEYS.DETAIL(id));
  },

  /**
   * Get work order history for an asset
   */
  async getWorkOrderHistory(
    assetId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedResponse<WorkOrder>> {
    const params = new URLSearchParams();
    params.append('asset', assetId);
    params.append('page', String(page));
    params.append('page_size', String(pageSize));
    params.append('ordering', '-created_at');

    const response = await api.get<PaginatedResponse<WorkOrder>>(
      `/api/cmms/work-orders/?${params.toString()}`
    );

    // Cache history
    await cacheStorage.set(CACHE_KEYS.HISTORY(assetId), response.data, CACHE_TTL);

    return response.data;
  },

  /**
   * Get cached work order history
   */
  async getWorkOrderHistoryCached(
    assetId: string
  ): Promise<PaginatedResponse<WorkOrder> | null> {
    return cacheStorage.get<PaginatedResponse<WorkOrder>>(CACHE_KEYS.HISTORY(assetId));
  },

  /**
   * Get asset types (distinct values)
   */
  async getTypes(): Promise<string[]> {
    const response = await api.get<{ types: string[] }>('/api/assets/types/');
    return response.data.types;
  },

  /**
   * Update asset
   */
  async update(id: string, data: Partial<Asset>): Promise<Asset> {
    const response = await api.patch<Asset>(`/api/assets/${id}/`, data);
    await cacheStorage.set(CACHE_KEYS.DETAIL(id), response.data, CACHE_TTL);
    return response.data;
  },
};

export default assetService;
