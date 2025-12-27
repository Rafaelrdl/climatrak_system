/**
 * Service para gerenciar Assets (ativos HVAC)
 * 
 * Assets representam os equipamentos físicos monitorados
 * (ex: Chillers, AHUs, Boilers, etc.)
 * 
 * Endpoints utilizados:
 * - GET /api/assets/ - Lista básica
 * - GET /api/assets/complete/ - Lista completa com métricas
 * - GET /api/assets/{id}/ - Detalhes
 * - GET /api/assets/{id}/sensors/ - Sensores do asset
 * 
 * 🔧 CORRIGIDO: Usa cliente Axios principal (@/lib/api) para autenticação
 * com cookies HttpOnly, igual ao TrakSense HVAC.
 */

import { api } from '@/lib/api';
import type { Asset, AssetFilters, AssetSensor } from '../types/asset';

// Helper para normalizar asset do backend para o frontend
const normalizeAsset = (asset: any): Asset => ({
  ...asset,
  // Aliases para compatibilidade
  type: asset.asset_type,
  // Construir location a partir dos dados reais: company > sector > subsection
  location: buildLocationString(asset),
  siteId: asset.site,
  siteName: asset.site_name,
  healthScore: asset.health_score,
  createdAt: asset.created_at,
  updatedAt: asset.updated_at,
});

// Helper para construir string de localização
const buildLocationString = (asset: any): string => {
  const parts: string[] = [];
  
  // Priorizar dados do relacionamento direto (locations app)
  if (asset.company_name) {
    parts.push(asset.company_name);
  } else if (asset.site_company) {
    parts.push(asset.site_company);
  }
  
  if (asset.sector_name) {
    parts.push(asset.sector_name);
  } else if (asset.site_sector) {
    parts.push(asset.site_sector);
  }
  
  if (asset.subsection_name) {
    parts.push(asset.subsection_name);
  } else if (asset.site_subsector) {
    parts.push(asset.site_subsector);
  }
  
  // Fallback para location_description ou full_location
  if (parts.length === 0) {
    return asset.location_description || asset.full_location || '';
  }
  
  return parts.join(' > ');
};

export const assetsService = {
  /**
   * Lista todos os assets (versão básica)
   */
  async getAll(filters?: AssetFilters): Promise<Asset[]> {
    const response = await api.get<any>('/assets/', { params: filters });
    const data = response.data;
    const payload = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : [];
    return payload.map(normalizeAsset);
  },

  /**
   * Lista assets com dados completos (incluindo métricas e status)
   * 
   * Este é o endpoint principal para dashboards de monitoramento
   */
  async getAllComplete(filters?: AssetFilters): Promise<Asset[]> {
    const response = await api.get<any>('/assets/complete/', { params: filters });
    const data = response.data;
    const payload = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : [];
    return payload.map(normalizeAsset);
  },

  /**
   * Busca um asset específico por ID
   */
  async getById(id: number): Promise<Asset> {
    const response = await api.get<any>(`/assets/${id}/`);
    return normalizeAsset(response.data);
  },

  /**
   * Busca sensores de um asset
   */
  async getSensors(assetId: number): Promise<AssetSensor[]> {
    const response = await api.get<AssetSensor[]>(`/assets/${assetId}/sensors/`);
    return response.data;
  },

  /**
   * Cria um novo asset
   */
  async create(asset: Partial<Asset>): Promise<Asset> {
    const response = await api.post<any>('/assets/', asset);
    return normalizeAsset(response.data);
  },

  /**
   * Atualiza um asset existente
   */
  async update(id: number, asset: Partial<Asset>): Promise<Asset> {
    const response = await api.patch<any>(`/assets/${id}/`, asset);
    return normalizeAsset(response.data);
  },

  /**
   * Remove um asset
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/assets/${id}/`);
  },
};
