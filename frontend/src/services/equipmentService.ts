/**
 * Equipment Service para o TrakNor CMMS
 * 
 * Este serviço integra os dados de ativos do backend Django com o
 * modelo Equipment do CMMS. Serve como ponte entre:
 * - Backend Assets (Django) → Frontend Equipment (CMMS)
 * 
 * Endpoints utilizados:
 * - GET /api/assets/ - Lista de ativos
 * - GET /api/assets/complete/ - Ativos com métricas
 * - GET /api/assets/{id}/ - Detalhes do ativo
 * - PATCH /api/assets/{id}/ - Atualização parcial
 */

import { api } from '@/lib/api';
import type { Equipment } from '@/types';

// ============================================
// Tipos do Backend (API Django)
// ============================================

interface ApiAsset {
  id: number;
  tag: string;
  name: string;
  site: number;
  site_name: string;
  site_company?: string;
  full_location?: string;
  location_description?: string;
  asset_type: string;
  asset_type_other?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  status: string;
  health_score: number;
  installation_date?: string;
  last_maintenance?: string;
  specifications?: Record<string, unknown>;
  device_count?: number;
  sensor_count?: number;
  online_device_count?: number;
  online_sensor_count?: number;
  alert_count?: number;
  created_at?: string;
  updated_at?: string;
  // Campos de localização (Company/Sector/Subsection)
  sector?: number | null;
  subsection?: number | null;
  company_id?: number | null;
  sector_name?: string | null;
  subsection_name?: string | null;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ============================================
// Mappers: Backend → Frontend
// ============================================

/**
 * Mapeia asset_type do backend para type do Equipment
 */
const mapAssetType = (assetType: string): Equipment['type'] => {
  const mapping: Record<string, Equipment['type']> = {
    'CHILLER': 'CHILLER',
    'AHU': 'CENTRAL',
    'VRF': 'VRF',
    'SPLIT': 'SPLIT',
    'FAN_COIL': 'SPLIT',
    'CONDENSADORA': 'SPLIT',
    'BOILER': 'CENTRAL',
    'COOLING_TOWER': 'CENTRAL',
    'PUMP': 'CENTRAL',
    'OTHER': 'CENTRAL',
  };
  return mapping[assetType] || 'CENTRAL';
};

/**
 * Mapeia status do backend para status do Equipment
 */
const mapAssetStatus = (status: string): Equipment['status'] => {
  const mapping: Record<string, Equipment['status']> = {
    'OPERATIONAL': 'FUNCTIONING',
    'WARNING': 'FUNCTIONING',
    'CRITICAL': 'STOPPED',
    'MAINTENANCE': 'MAINTENANCE',
    'INACTIVE': 'STOPPED',
  };
  return mapping[status] || 'FUNCTIONING';
};

/**
 * Mapeia criticidade baseado em specifications ou health_score
 */
const mapCriticidade = (specs?: Record<string, unknown>, healthScore?: number): Equipment['criticidade'] => {
  // Primeiro tentar ler da specifications
  if (specs?.criticidade && typeof specs.criticidade === 'string') {
    const criticidade = specs.criticidade as Equipment['criticidade'];
    if (['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'].includes(criticidade)) {
      return criticidade;
    }
  }
  // Fallback: calcular baseado no health_score
  const score = healthScore ?? 100;
  if (score >= 80) return 'BAIXA';
  if (score >= 50) return 'MEDIA';
  return 'ALTA';
};

/**
 * Converte ApiAsset para Equipment do CMMS
 */
const apiAssetToEquipment = (asset: ApiAsset): Equipment & {
  companyId?: string;
  sectorName?: string;
  subsectionName?: string;
} => {
  // Debug: log para verificar o mapeamento de localização
  if (asset.sector || asset.company_id) {

  }
  
  return {
    id: String(asset.id),
    tag: asset.tag,
    model: asset.model || '',
    brand: asset.manufacturer || '',
    type: mapAssetType(asset.asset_type),
    capacity: (asset.specifications?.capacity as number) || 0,
    sectorId: asset.sector ? String(asset.sector) : undefined,
    subSectionId: asset.subsection ? String(asset.subsection) : undefined,
    // Campos extras para o modal
    companyId: asset.company_id ? String(asset.company_id) : undefined,
    sectorName: asset.sector_name || undefined,
    subsectionName: asset.subsection_name || undefined,
    installDate: asset.installation_date || '',
    nextMaintenance: '', // TODO: Calcular próxima manutenção
    status: mapAssetStatus(asset.status),
    criticidade: mapCriticidade(asset.specifications, asset.health_score),
    lastMaintenance: asset.last_maintenance,
    totalOperatingHours: undefined, // TODO: Calcular horas
    energyConsumption: undefined, // TODO: Calcular consumo
    warrantyExpiry: undefined,
    serialNumber: asset.serial_number,
    location: asset.location_description || asset.full_location,
    notes: asset.name,
    // Incluir specifications para poder ler no modal
    specifications: asset.specifications,
  };
};

/**
 * Converte Equipment para dados parciais de ApiAsset (para updates)
 */
const equipmentToApiAsset = (equipment: Partial<Equipment>): Partial<ApiAsset> => {
  const data: Partial<ApiAsset> = {};
  
  // Campos de texto - enviar mesmo se vazios para permitir limpar valores
  if (equipment.tag !== undefined) data.tag = equipment.tag;
  if (equipment.model !== undefined) data.model = equipment.model;
  if (equipment.brand !== undefined) data.manufacturer = equipment.brand;
  if (equipment.serialNumber !== undefined) data.serial_number = equipment.serialNumber;
  if (equipment.installDate !== undefined) data.installation_date = equipment.installDate;
  if (equipment.lastMaintenance !== undefined) data.last_maintenance = equipment.lastMaintenance;
  if (equipment.location !== undefined) data.location_description = equipment.location;
  if (equipment.notes !== undefined) data.name = equipment.notes;
  
  // Campos de localização (sector e subsection)
  if (equipment.sectorId !== undefined) {
    data.sector = equipment.sectorId ? parseInt(equipment.sectorId, 10) : null;
  }
  if (equipment.subSectionId !== undefined) {
    data.subsection = equipment.subSectionId ? parseInt(equipment.subSectionId, 10) : null;
  }
  
  // Incluir specifications se fornecido, mesclando com criticidade
  const specs: Record<string, unknown> = equipment.specifications ? { ...equipment.specifications } : {};
  
  // Adicionar criticidade às specifications
  if (equipment.criticidade !== undefined) {
    specs.criticidade = equipment.criticidade;
  }
  
  // Só enviar specifications se tiver algo
  if (Object.keys(specs).length > 0) {
    data.specifications = specs;
  }
  
  // Mapear status reverso
  if (equipment.status) {
    const statusMapping: Record<Equipment['status'], string> = {
      'FUNCTIONING': 'OK',
      'MAINTENANCE': 'MAINTENANCE',
      'STOPPED': 'STOPPED',
    };
    data.status = statusMapping[equipment.status];
  }
  
  // Mapear tipo reverso
  if (equipment.type) {
    const typeMapping: Record<Equipment['type'], string> = {
      'CHILLER': 'CHILLER',
      'CENTRAL': 'AHU',
      'VRF': 'VRF',
      'SPLIT': 'FAN_COIL', // Split mapeia para Fan Coil no backend
    };
    data.asset_type = typeMapping[equipment.type];
  }
  
  return data;
};

// ============================================
// Service Methods
// ============================================

export interface EquipmentFilters {
  site?: number;
  type?: Equipment['type'];
  status?: Equipment['status'];
  search?: string;
}

export const equipmentService = {
  /**
   * Lista todos os equipamentos
   */
  async getAll(filters?: EquipmentFilters): Promise<Equipment[]> {
    const params: Record<string, string | number> = {};
    
    if (filters?.site) params.site = filters.site;
    if (filters?.search) params.search = filters.search;
    
    // Mapear filtros do CMMS para o backend
    if (filters?.type) {
      const typeMapping: Record<Equipment['type'], string> = {
        'CHILLER': 'CHILLER',
        'CENTRAL': 'AHU',
        'VRF': 'VRF',
        'SPLIT': 'SPLIT',
      };
      params.asset_type = typeMapping[filters.type];
    }
    
    if (filters?.status) {
      const statusMapping: Record<Equipment['status'], string> = {
        'FUNCTIONING': 'OPERATIONAL',
        'MAINTENANCE': 'MAINTENANCE',
        'STOPPED': 'INACTIVE',
      };
      params.status = statusMapping[filters.status];
    }
    
    const response = await api.get<PaginatedResponse<ApiAsset> | ApiAsset[]>(
      '/assets/',
      { params }
    );
    
    // Normalizar resposta (pode ser paginada ou array direto)
    const assets = Array.isArray(response.data)
      ? response.data
      : response.data.results || [];
    
    return assets.map(apiAssetToEquipment);
  },

  /**
   * Lista equipamentos com dados completos (métricas, alertas)
   */
  async getAllComplete(filters?: EquipmentFilters): Promise<Equipment[]> {
    const params: Record<string, string | number> = {};
    
    if (filters?.site) params.site = filters.site;
    if (filters?.search) params.search = filters.search;
    
    const response = await api.get<PaginatedResponse<ApiAsset> | ApiAsset[]>(
      '/assets/complete/',
      { params }
    );
    
    const assets = Array.isArray(response.data)
      ? response.data
      : response.data.results || [];
    
    return assets.map(apiAssetToEquipment);
  },

  /**
   * Busca um equipamento específico por ID
   */
  async getById(id: string): Promise<Equipment> {
    const response = await api.get<ApiAsset>(`/assets/${id}/`);
    return apiAssetToEquipment(response.data);
  },

  /**
   * Atualiza um equipamento
   */
  async update(id: string, data: Partial<Equipment>): Promise<Equipment> {
    const apiData = equipmentToApiAsset(data);
    const response = await api.patch<ApiAsset>(`/assets/${id}/`, apiData);
    return apiAssetToEquipment(response.data);
  },

  /**
   * Busca estatísticas gerais dos equipamentos
   */
  async getStats(): Promise<{
    total: number;
    functioning: number;
    maintenance: number;
    stopped: number;
    byType: Record<string, number>;
  }> {
    const equipments = await this.getAll();
    
    const stats = {
      total: equipments.length,
      functioning: equipments.filter(e => e.status === 'FUNCTIONING').length,
      maintenance: equipments.filter(e => e.status === 'MAINTENANCE').length,
      stopped: equipments.filter(e => e.status === 'STOPPED').length,
      byType: {} as Record<string, number>,
    };
    
    // Contar por tipo
    equipments.forEach(e => {
      stats.byType[e.type] = (stats.byType[e.type] || 0) + 1;
    });
    
    return stats;
  },
};

export default equipmentService;
