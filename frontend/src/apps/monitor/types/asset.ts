/**
 * Asset Types para o módulo Monitor
 * 
 * Tipos para ativos HVAC com integração IoT
 * Sincronizado com o backend Django REST Framework
 */

export type AssetStatus = 
  | 'OPERATIONAL' 
  | 'WARNING' 
  | 'CRITICAL' 
  | 'MAINTENANCE' 
  | 'INACTIVE'
  // Legacy aliases (for backward compatibility)
  | 'OK' | 'ACTIVE' | 'Alert' | 'Stopped' | 'ERROR';

export type AssetType = 
  | 'CHILLER' 
  | 'AHU' 
  | 'BOILER' 
  | 'FAN_COIL' 
  | 'VRF' 
  | 'SPLIT' 
  | 'CONDENSADORA' 
  | 'COOLING_TOWER' 
  | 'PUMP' 
  | 'OTHER'
  // Legacy aliases
  | 'Chiller' | 'Boiler' | 'Fan Coil' | 'Split' | 'Torre de Resfriamento' | 'Outro';

export interface AssetSpecifications {
  capacity?: number;
  capacity_unit?: string;
  voltage?: number;
  refrigerant?: string;
  [key: string]: unknown;
}

export interface SensorReading {
  sensor_id: number;
  sensor_name: string;
  value: number | null;
  unit: string;
  timestamp: string | null;
  is_online: boolean;
}

/**
 * Asset completo retornado pelo endpoint /api/assets/complete/
 * 
 * Usado tanto pelo TrakSense Monitor quanto pelo TrakNor CMMS
 */
export interface Asset {
  id: number;
  tag: string;
  name: string;
  
  // Relacionamentos
  site: number;
  site_name: string;
  site_company?: string;
  site_sector?: string;
  site_subsector?: string;
  
  // Localização via locations app
  sector_id?: number | null;
  sector_name?: string | null;
  subsection_id?: number | null;
  subsection_name?: string | null;
  company_id?: number | null;
  company_name?: string | null;
  
  // Localização
  full_location?: string;
  location_description?: string;
  
  // Tipo e modelo
  asset_type: AssetType;
  asset_type_other?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  
  // Status e saúde
  status: AssetStatus;
  health_score: number;
  
  // Datas
  installation_date?: string;
  last_maintenance?: string;
  created_at?: string;
  updated_at?: string;
  
  // Especificações técnicas (JSON)
  specifications?: AssetSpecifications;
  
  // Contadores (do endpoint /complete/)
  device_count?: number;
  sensor_count?: number;
  online_device_count?: number;
  online_sensor_count?: number;
  
  // Métricas em tempo real (do endpoint /complete/)
  latest_readings?: Record<string, SensorReading>;
  
  // Alertas
  alert_count?: number;
  
  // ==== ALIASES para compatibilidade com código legado ====
  /** @deprecated Use asset_type */
  type?: AssetType;
  /** @deprecated Use location_description */
  location?: string;
  /** @deprecated Use site */
  siteId?: number;
  /** @deprecated Use site_name */
  siteName?: string;
  /** @deprecated Use health_score */
  healthScore?: number;
  /** @deprecated Removido - calcular via sensores */
  powerConsumption?: number;
  /** @deprecated Use created_at */
  createdAt?: string;
  /** @deprecated Use updated_at */
  updatedAt?: string;
}

export interface AssetFilters {
  site?: number;
  asset_type?: string;
  status?: string;
  search?: string;
}

export interface AssetSensor {
  id: number;
  tag: string;
  name: string;
  metric_type: string;
  unit: string;
  last_value: number | null;
  last_reading_at: string | null;
  is_online: boolean;
  // Campos do device
  device: number;
  device_name: string;
  device_display_name: string;
  device_serial: string;
  device_mqtt_client_id: string;
  asset_tag: string;
  created_at?: string;
}
