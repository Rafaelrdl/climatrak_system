// ============================================================
// ClimaTrak Mobile - Alerts Service
// ============================================================

import { api } from './client';
import { cacheStorage, syncQueueStorage, globalStorage } from '@/shared/storage';
import type { 
  Alert, 
  AlertFilters, 
  PaginatedResponse 
} from '@/types';

const CACHE_KEYS = {
  LIST: 'alerts_list',
  ACTIVE: 'alerts_active',
  DETAIL: (id: string) => `alert_${id}`,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (shorter for alerts)

export const alertService = {
  /**
   * List alerts with filters and pagination
   */
  async list(
    filters?: AlertFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<Alert>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('page_size', String(pageSize));
    params.append('ordering', '-triggered_at');

    if (filters) {
      if (filters.status?.length) {
        filters.status.forEach(s => params.append('status', s));
      }
      if (filters.severity?.length) {
        filters.severity.forEach(s => params.append('severity', s));
      }
      if (filters.asset_id) {
        params.append('asset', filters.asset_id);
      }
      if (filters.site_id) {
        params.append('site', filters.site_id);
      }
      if (filters.rule_id) {
        params.append('rule', filters.rule_id);
      }
      if (filters.triggered_after) {
        params.append('triggered_at__gte', filters.triggered_after);
      }
      if (filters.triggered_before) {
        params.append('triggered_at__lte', filters.triggered_before);
      }
    }

    const response = await api.get<PaginatedResponse<Alert>>(
      `/api/alerts/?${params.toString()}`
    );

    await cacheStorage.set(CACHE_KEYS.LIST, response.data, CACHE_TTL);

    return response.data;
  },

  /**
   * Get active alerts (not acknowledged or resolved)
   */
  async getActive(
    page: number = 1,
    pageSize: number = 50
  ): Promise<PaginatedResponse<Alert>> {
    const params = new URLSearchParams();
    params.append('status', 'active');
    params.append('page', String(page));
    params.append('page_size', String(pageSize));
    params.append('ordering', '-severity,-triggered_at');

    const response = await api.get<PaginatedResponse<Alert>>(
      `/api/alerts/?${params.toString()}`
    );

    await cacheStorage.set(CACHE_KEYS.ACTIVE, response.data, CACHE_TTL);

    return response.data;
  },

  /**
   * Get cached active alerts
   */
  async getActiveCached(): Promise<PaginatedResponse<Alert> | null> {
    return cacheStorage.get<PaginatedResponse<Alert>>(CACHE_KEYS.ACTIVE);
  },

  /**
   * Get alerts by asset
   */
  async getByAsset(
    assetId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<Alert>> {
    const params = new URLSearchParams();
    params.append('asset', assetId);
    params.append('page', String(page));
    params.append('page_size', String(pageSize));
    params.append('ordering', '-triggered_at');

    const response = await api.get<PaginatedResponse<Alert>>(
      `/api/alerts/?${params.toString()}`
    );

    return response.data;
  },

  /**
   * Get alert by ID
   */
  async getById(id: string): Promise<Alert> {
    const response = await api.get<Alert>(`/api/alerts/${id}/`);
    
    await cacheStorage.set(CACHE_KEYS.DETAIL(id), response.data, CACHE_TTL);

    return response.data;
  },

  /**
   * Acknowledge an alert
   */
  async acknowledge(
    id: string,
    notes?: string
  ): Promise<Alert> {
    const deviceId = await globalStorage.getDeviceId();
    const idempotencyKey = `mobile:${deviceId}:alert_ack:${id}:${Date.now()}`;

    try {
      const response = await api.post<Alert>(
        `/api/alerts/${id}/acknowledge/`,
        { notes },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );
      
      await cacheStorage.set(CACHE_KEYS.DETAIL(id), response.data, CACHE_TTL);
      
      return response.data;
    } catch (error: any) {
      // Queue for later if offline
      if (!error.response) {
        await syncQueueStorage.add({
          entity: 'alert',
          action: 'acknowledge',
          payload: { id, notes },
          endpoint: `/api/alerts/${id}/acknowledge/`,
          method: 'POST',
          idempotencyKey,
        });

        // Return optimistic update
        const cached = await cacheStorage.get<Alert>(CACHE_KEYS.DETAIL(id));
        if (cached) {
          return {
            ...cached,
            status: 'acknowledged',
            acknowledged_at: new Date().toISOString(),
          };
        }
      }
      throw error;
    }
  },

  /**
   * Resolve an alert
   */
  async resolve(
    id: string,
    resolution_notes: string,
    work_order_id?: string
  ): Promise<Alert> {
    const deviceId = await globalStorage.getDeviceId();
    const idempotencyKey = `mobile:${deviceId}:alert_resolve:${id}:${Date.now()}`;

    try {
      const response = await api.post<Alert>(
        `/api/alerts/${id}/resolve/`,
        { resolution_notes, work_order_id },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );
      
      await cacheStorage.set(CACHE_KEYS.DETAIL(id), response.data, CACHE_TTL);
      
      return response.data;
    } catch (error: any) {
      // Queue for later if offline
      if (!error.response) {
        await syncQueueStorage.add({
          entity: 'alert',
          action: 'resolve',
          payload: { id, resolution_notes, work_order_id },
          endpoint: `/api/alerts/${id}/resolve/`,
          method: 'POST',
          idempotencyKey,
        });

        // Return optimistic update
        const cached = await cacheStorage.get<Alert>(CACHE_KEYS.DETAIL(id));
        if (cached) {
          return {
            ...cached,
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolution_notes,
          };
        }
      }
      throw error;
    }
  },

  /**
   * Create work order from alert
   */
  async createWorkOrder(
    alertId: string,
    workOrderData: {
      title: string;
      description?: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      type: 'corrective' | 'preventive' | 'predictive' | 'inspection';
    }
  ): Promise<{ alert: Alert; work_order_id: string }> {
    const deviceId = await globalStorage.getDeviceId();
    const idempotencyKey = `mobile:${deviceId}:alert_wo:${alertId}:${Date.now()}`;

    const response = await api.post<{ alert: Alert; work_order_id: string }>(
      `/api/alerts/${alertId}/create-work-order/`,
      workOrderData,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );

    await cacheStorage.set(CACHE_KEYS.DETAIL(alertId), response.data.alert, CACHE_TTL);

    return response.data;
  },

  /**
   * Get alert statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    by_severity: Record<string, number>;
  }> {
    const response = await api.get('/api/alerts/stats/');
    return response.data;
  },

  /**
   * Get recent alerts for dashboard
   */
  async getRecent(limit: number = 5): Promise<Alert[]> {
    const params = new URLSearchParams();
    params.append('page_size', String(limit));
    params.append('ordering', '-triggered_at');
    params.append('status', 'active');

    const response = await api.get<PaginatedResponse<Alert>>(
      `/api/alerts/?${params.toString()}`
    );

    return response.data.results;
  },
};

export default alertService;
