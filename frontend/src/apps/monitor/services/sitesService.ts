/**
 * Service para gerenciar Sites (localizações físicas)
 * 
 * Sites representam as localizações físicas onde os equipamentos 
 * estão instalados (ex: Matriz, Filial Norte, etc.)
 * 
 * Endpoints disponíveis:
 * - GET /sites/ - Lista todos os sites
 * - POST /sites/ - Cria novo site
 * - GET /sites/{id}/ - Detalhes de um site
 * - GET /sites/{id}/stats/ - Estatísticas do site
 */

import { api } from '@/lib/api';
import type { Site, SiteFilters, SiteStats } from '../types/site';

/**
 * Interface para criação de Site
 */
export interface CreateSiteData {
  name: string;
  company?: string;
  sector?: string;
  subsector?: string;
  address?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Helper para extrair array de dados da resposta (suporta array direto ou paginado)
 */
const extractArray = <T>(data: any): T[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

export const sitesService = {
  /**
   * Lista todos os sites com filtros opcionais
   * 
   * @param filters - Filtros opcionais (company, sector, search)
   * @returns Lista de sites
   */
  async list(filters?: SiteFilters): Promise<Site[]> {
    const response = await api.get<any>('/sites/', { params: filters });
    return extractArray<Site>(response.data);
  },

  /**
   * Busca um site específico por ID
   * 
   * @param id - ID do site
   * @returns Site completo
   */
  async getById(id: number): Promise<Site> {
    const response = await api.get<Site>(`/sites/${id}/`);
    return response.data;
  },

  /**
   * Cria um novo site
   * 
   * @param data - Dados do site a ser criado
   * @returns Site criado
   */
  async create(data: CreateSiteData): Promise<Site> {
    const response = await api.post<Site>('/sites/', {
      name: data.name,
      company: data.company || '',
      sector: data.sector || '',
      subsector: data.subsector || '',
      address: data.address || '',
      timezone: data.timezone || 'America/Sao_Paulo',
      latitude: data.latitude || null,
      longitude: data.longitude || null,
    });
    return response.data;
  },

  /**
   * Busca estatísticas de um site específico
   * 
   * @param id - ID do site
   * @returns Estatísticas do site
   */
  async getStats(id: number): Promise<SiteStats> {
    const response = await api.get<SiteStats>(`/sites/${id}/stats/`);
    return response.data;
  },

  /**
   * Busca sites por empresa
   */
  async getByCompany(company: string): Promise<Site[]> {
    return this.list({ company });
  },

  /**
   * Busca sites por setor
   */
  async getBySector(sector: string): Promise<Site[]> {
    return this.list({ sector });
  },
};
