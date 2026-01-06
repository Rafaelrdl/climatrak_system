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
import type { PaginatedResponse } from '@/types/api';

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
  patrimony_number?: string;
  criticality?: string;
  warranty_expiry?: string;
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
  // Especificações elétricas
  nominal_voltage?: number | string | null;
  phases?: number | null;
  nominal_current?: number | string | null;
  power_factor?: number | string | null;
  capacity?: number | string | null;
  capacity_unit?: string | null;
  refrigerant?: string | null;
  active_power_kw?: number | string | null;
  apparent_power_kva?: number | string | null;
  reactive_power_kvar?: number | string | null;
}

// ============================================
// Mappers: Backend → Frontend
// ============================================

/**
 * Mapeia asset_type do backend para type do Equipment
 * Nota: Tipos customizados são retornados como estão (sem mapeamento)
 */
const mapAssetType = (assetType: string): Equipment['type'] => {
  // Mapeamentos legados para compatibilidade
  const legacyMapping: Record<string, string> = {
    'AHU': 'AHU',
    'FAN_COIL': 'FAN_COIL',
    'CONDENSADORA': 'SPLIT',
  };
  
  // Retorna o mapeamento legado se existir, senão retorna o tipo original
  return (legacyMapping[assetType] || assetType) as Equipment['type'];
};

/**
 * Mapeia status do backend para status do Equipment
 */
const mapAssetStatus = (status: string): Equipment['status'] => {
  const mapping: Record<string, Equipment['status']> = {
    'OK': 'OK',
    'MAINTENANCE': 'MAINTENANCE',
    'STOPPED': 'STOPPED',
    'ALERT': 'ALERT',
    // Legacy/backward compatibility
    'OPERATIONAL': 'OK',
    'WARNING': 'ALERT',
    'CRITICAL': 'ALERT',
    'INACTIVE': 'STOPPED',
    'ACTIVE': 'OK',
  };
  return mapping[status] || 'OK';
};

/**
 * Mapeia criticidade do backend ou specifications
 */
const mapCriticidade = (criticality?: string, specs?: Record<string, unknown>, healthScore?: number): Equipment['criticidade'] => {
  // Primeiro tentar ler do campo criticality do backend
  if (criticality && ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'].includes(criticality)) {
    return criticality as Equipment['criticidade'];
  }
  // Depois tentar ler da specifications
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
  patrimonio?: string;
  warrantyExpiry?: string;
  nominalVoltage?: number;
  phases?: number;
  nominalCurrent?: number;
  powerFactor?: number;
  capacityUnit?: string;
  refrigerant?: string;
  activePower?: number;
  apparentPower?: number;
  reactivePower?: number;
} => {
  return {
    id: String(asset.id),
    tag: asset.tag,
    model: asset.model || '',
    brand: asset.manufacturer || '',
    type: mapAssetType(asset.asset_type),
    capacity: asset.capacity ? Number(asset.capacity) : (asset.specifications?.capacity as number) || 0,
    sectorId: asset.sector ? String(asset.sector) : undefined,
    subSectionId: asset.subsection ? String(asset.subsection) : undefined,
    // Campos extras para o modal
    companyId: asset.company_id ? String(asset.company_id) : undefined,
    sectorName: asset.sector_name || undefined,
    subsectionName: asset.subsection_name || undefined,
    installDate: asset.installation_date || '',
    nextMaintenance: '', // TODO: Calcular próxima manutenção
    status: mapAssetStatus(asset.status),
    criticidade: mapCriticidade(asset.criticality, asset.specifications, asset.health_score),
    lastMaintenance: asset.last_maintenance,
    totalOperatingHours: undefined, // TODO: Calcular horas
    energyConsumption: undefined, // TODO: Calcular consumo
    warrantyExpiry: asset.warranty_expiry || undefined,
    serialNumber: asset.serial_number,
    patrimonio: asset.patrimony_number || undefined,
    location: asset.location_description || asset.full_location,
    notes: asset.name,
    // Especificações elétricas
    nominalVoltage: asset.nominal_voltage ? Number(asset.nominal_voltage) : undefined,
    phases: asset.phases ? Number(asset.phases) : undefined,
    nominalCurrent: asset.nominal_current ? Number(asset.nominal_current) : undefined,
    powerFactor: asset.power_factor ? Number(asset.power_factor) : undefined,
    capacityUnit: asset.capacity_unit || undefined,
    refrigerant: asset.refrigerant || undefined,
    activePower: asset.active_power_kw ? Number(asset.active_power_kw) : undefined,
    apparentPower: asset.apparent_power_kva ? Number(asset.apparent_power_kva) : undefined,
    reactivePower: asset.reactive_power_kvar ? Number(asset.reactive_power_kvar) : undefined,
    // Incluir specifications para poder ler no modal
    specifications: asset.specifications,
  };
};

/**
 * Converte Equipment para dados parciais de ApiAsset (para updates e create)
 */
const equipmentToApiAsset = (equipment: Partial<Equipment> & {
  patrimonio?: string;
  capacityUnit?: string;
  nominalVoltage?: number | string;
  phases?: number;
  nominalCurrent?: number | string;
  powerFactor?: number | string;
  refrigerant?: string;
  activePower?: number | string;
  apparentPower?: number | string;
  reactivePower?: number | string;
  warrantyExpiry?: string;
}): Partial<ApiAsset> => {
  const data: Partial<ApiAsset> = {};
  
  // Campos de texto - enviar mesmo se vazios para permitir limpar valores
  if (equipment.tag !== undefined) data.tag = equipment.tag;
  if (equipment.model !== undefined) data.model = equipment.model;
  if (equipment.brand !== undefined) data.manufacturer = equipment.brand;
  if (equipment.serialNumber !== undefined) data.serial_number = equipment.serialNumber;
  if (equipment.patrimonio !== undefined) data.patrimony_number = equipment.patrimonio;
  if (equipment.installDate !== undefined) data.installation_date = equipment.installDate;
  if (equipment.lastMaintenance !== undefined) data.last_maintenance = equipment.lastMaintenance;
  if (equipment.warrantyExpiry !== undefined) data.warranty_expiry = equipment.warrantyExpiry;
  if (equipment.location !== undefined) data.location_description = equipment.location;
  if (equipment.notes !== undefined) data.name = equipment.notes;
  
  // Criticidade - mapear para o campo do backend
  if (equipment.criticidade !== undefined) {
    data.criticality = equipment.criticidade;
  }
  
  // Campos de localização (sector e subsection)
  if (equipment.sectorId !== undefined) {
    data.sector = equipment.sectorId ? parseInt(equipment.sectorId, 10) : null;
  }
  if (equipment.subSectionId !== undefined) {
    data.subsection = equipment.subSectionId ? parseInt(equipment.subSectionId, 10) : null;
  }
  
  // Especificações elétricas
  if (equipment.nominalVoltage !== undefined) {
    data.nominal_voltage = equipment.nominalVoltage ? String(equipment.nominalVoltage) : null;
  }
  if (equipment.phases !== undefined) {
    data.phases = equipment.phases || null;
  }
  if (equipment.nominalCurrent !== undefined) {
    data.nominal_current = equipment.nominalCurrent ? String(equipment.nominalCurrent) : null;
  }
  if (equipment.powerFactor !== undefined) {
    data.power_factor = equipment.powerFactor ? String(equipment.powerFactor) : null;
  }
  if (equipment.capacity !== undefined) {
    data.capacity = equipment.capacity ? String(equipment.capacity) : null;
  }
  if (equipment.capacityUnit !== undefined) {
    data.capacity_unit = equipment.capacityUnit || null;
  }
  if (equipment.refrigerant !== undefined) {
    data.refrigerant = equipment.refrigerant || null;
  }
  if (equipment.activePower !== undefined) {
    data.active_power_kw = equipment.activePower ? String(equipment.activePower) : null;
  }
  if (equipment.apparentPower !== undefined) {
    data.apparent_power_kva = equipment.apparentPower ? String(equipment.apparentPower) : null;
  }
  if (equipment.reactivePower !== undefined) {
    data.reactive_power_kvar = equipment.reactivePower ? String(equipment.reactivePower) : null;
  }
  
  // Incluir specifications se fornecido, mesclando com criticidade
  const specs: Record<string, unknown> = equipment.specifications ? { ...equipment.specifications } : {};
  
  // Adicionar criticidade às specifications (legado)
  if (equipment.criticidade !== undefined) {
    specs.criticidade = equipment.criticidade;
  }
  
  // Só enviar specifications se tiver algo
  if (Object.keys(specs).length > 0) {
    data.specifications = specs;
  }
  
  // Mapear status reverso
  if (equipment.status) {
    const statusMapping: Record<string, string> = {
      'OK': 'OK',
      'MAINTENANCE': 'MAINTENANCE',
      'STOPPED': 'STOPPED',
      'ALERT': 'ALERT',
      // Legacy/backward compatibility
      'FUNCTIONING': 'OK',
    };
    data.status = statusMapping[equipment.status] || equipment.status;
  }
  
  // Mapear tipo reverso
  if (equipment.type) {
    // Mapeamentos legados para compatibilidade reversa
    const legacyTypeMapping: Record<string, string> = {
      'CENTRAL': 'AHU', // CENTRAL do frontend vira AHU no backend
    };
    // Usa o mapeamento legado se existir, senão usa o tipo original
    data.asset_type = legacyTypeMapping[equipment.type] || equipment.type;
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
      const statusMapping: Record<string, string> = {
        'OK': 'OK',
        'MAINTENANCE': 'MAINTENANCE',
        'STOPPED': 'STOPPED',
        'ALERT': 'ALERT',
        // Legacy/backward compatibility
        'FUNCTIONING': 'OK',
      };
      params.status = statusMapping[filters.status] || filters.status;
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
   * Cria um novo equipamento/ativo
   */
  async create(data: {
    tag: string;
    name: string;
    site: number;
    assetType: string;
    assetTypeOther?: string;
    status?: Equipment['status'];
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    patrimonio?: string;
    criticidade?: string;
    warrantyExpiry?: string;
    installDate?: string;
    sectorId?: string;
    subSectionId?: string;
    location?: string;
    capacity?: number;
    capacityUnit?: string;
    nominalVoltage?: number;
    phases?: number;
    nominalCurrent?: number;
    powerFactor?: number;
    refrigerant?: string;
    activePower?: number;
    apparentPower?: number;
    reactivePower?: number;
  }): Promise<Equipment> {
    const apiData: Partial<ApiAsset> & { site: number; tag: string; name: string; asset_type: string } = {
      tag: data.tag,
      name: data.name,
      site: data.site,
      asset_type: data.assetType,
    };
    
    // Tipo customizado (quando assetType = 'OTHER')
    if (data.assetTypeOther) {
      apiData.asset_type_other = data.assetTypeOther;
    }
    
    // Campos opcionais
    if (data.manufacturer) apiData.manufacturer = data.manufacturer;
    if (data.model) apiData.model = data.model;
    if (data.serialNumber) apiData.serial_number = data.serialNumber;
    if (data.patrimonio) apiData.patrimony_number = data.patrimonio;
    if (data.criticidade) apiData.criticality = data.criticidade;
    if (data.warrantyExpiry && data.warrantyExpiry.trim() !== '') apiData.warranty_expiry = data.warrantyExpiry;
    if (data.installDate && data.installDate.trim() !== '') apiData.installation_date = data.installDate;
    if (data.location) apiData.location_description = data.location;
    if (data.status) {
      const statusMapping: Record<string, string> = {
        'OK': 'OK',
        'MAINTENANCE': 'MAINTENANCE',
        'STOPPED': 'STOPPED',
        'ALERT': 'ALERT',
        // Legacy/backward compatibility
        'FUNCTIONING': 'OK',
      };
      apiData.status = statusMapping[data.status] || data.status;
    }
    
    // Localização
    if (data.sectorId) apiData.sector = parseInt(data.sectorId, 10);
    if (data.subSectionId) apiData.subsection = parseInt(data.subSectionId, 10);
    
    // Especificações elétricas
    if (data.capacity) apiData.capacity = String(data.capacity);
    if (data.capacityUnit) apiData.capacity_unit = data.capacityUnit;
    if (data.nominalVoltage) apiData.nominal_voltage = String(data.nominalVoltage);
    if (data.phases) apiData.phases = data.phases;
    if (data.nominalCurrent) apiData.nominal_current = String(data.nominalCurrent);
    if (data.powerFactor) apiData.power_factor = String(data.powerFactor);
    if (data.refrigerant) apiData.refrigerant = data.refrigerant;
    if (data.activePower) apiData.active_power_kw = String(data.activePower);
    if (data.apparentPower) apiData.apparent_power_kva = String(data.apparentPower);
    if (data.reactivePower) apiData.reactive_power_kvar = String(data.reactivePower);
    
    const response = await api.post<ApiAsset>('/assets/', apiData);
    return apiAssetToEquipment(response.data);
  },

  /**
   * Exclui um equipamento/ativo
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/assets/${id}/`);
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
      functioning: equipments.filter(e => e.status === 'OK').length,
      maintenance: equipments.filter(e => e.status === 'MAINTENANCE').length,
      stopped: equipments.filter(e => e.status === 'STOPPED' || e.status === 'ALERT').length,
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
