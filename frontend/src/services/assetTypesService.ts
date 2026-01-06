/**
 * Service para gerenciamento de Tipos de Ativo
 * 
 * Endpoints:
 *  - GET /asset-types/ - Lista tipos de ativo
 *  - POST /asset-types/ - Cria novo tipo
 *  - DELETE /asset-types/{id}/ - Remove tipo
 */

import api from '@/lib/api';

// Interface do tipo de ativo
export interface AssetType {
  id: number;
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Interface para criação
export interface CreateAssetTypeData {
  code: string;
  name: string;
  description?: string;
}

// Interface da resposta da API
interface ApiAssetType {
  id: number;
  code: string;
  name: string;
  description: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Mapeia resposta da API para o formato do frontend
const mapAssetType = (data: ApiAssetType): AssetType => ({
  id: data.id,
  code: data.code,
  name: data.name,
  description: data.description,
  isSystem: data.is_system,
  isActive: data.is_active,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

export const assetTypesService = {
  /**
   * Lista todos os tipos de ativo
   */
  async getAll(): Promise<AssetType[]> {
    const response = await api.get<ApiAssetType[] | { results: ApiAssetType[] }>('/asset-types/');
    const data = Array.isArray(response.data) ? response.data : response.data.results || [];
    return data.map(mapAssetType);
  },

  /**
   * Cria um novo tipo de ativo
   */
  async create(data: CreateAssetTypeData): Promise<AssetType> {
    const response = await api.post<ApiAssetType>('/asset-types/', {
      code: data.code,
      name: data.name,
      description: data.description || '',
    });
    return mapAssetType(response.data);
  },

  /**
   * Remove um tipo de ativo
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/asset-types/${id}/`);
  },
};

export default assetTypesService;
