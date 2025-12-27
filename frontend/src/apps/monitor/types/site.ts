/**
 * Site Types para o módulo Monitor
 * 
 * Tipos para sites/localizações físicas
 */

export interface Site {
  id: number;
  name: string;
  full_name?: string;
  company?: string;
  sector?: string;
  subsector?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

export interface SiteFilters {
  company?: string;
  sector?: string;
  timezone?: string;
  search?: string;
  page_size?: number;
}

export interface SiteStats {
  total_assets: number;
  assets_by_status: Record<string, number>;
  assets_by_type: Record<string, number>;
  total_devices: number;
  online_devices: number;
  avg_device_availability: number;
  total_sensors: number;
  online_sensors: number;
  assets_with_active_alerts: number;
}
