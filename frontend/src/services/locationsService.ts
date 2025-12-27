/**
 * Locations Service (Empresas, Setores, Subsetores)
 * 
 * Serviço para gerenciamento da hierarquia de locais
 * 
 * Endpoints:
 * - GET /api/locations/companies/
 * - GET /api/locations/sectors/
 * - GET /api/locations/subsections/
 * - GET /api/locations/tree/
 */

import { api } from '@/lib/api';
import type { Company, Sector, SubSection, LocationNode } from '@/types';
import type { ApiCompany, ApiSector, ApiSubsection, ApiLocationNode, PaginatedResponse } from '@/types/api';

// ============================================
// Mappers
// ============================================

const mapCompany = (c: ApiCompany): Company => ({
  id: String(c.id),
  name: c.name,
  segment: c.description || c.segment || '',  // description é usado como segmento no banco
  cnpj: c.cnpj || '',
  address: {
    zip: c.zip_code || '',
    city: c.city || '',
    state: c.state || '',
    fullAddress: c.address || '',
  },
  responsible: c.manager_name || c.responsible_name || '',
  role: c.responsible_role || '',
  totalArea: c.total_area || 0,
  occupants: c.occupants || 0,
  hvacUnits: c.hvac_units || 0,
  notes: c.notes || '',
  createdAt: c.created_at || new Date().toISOString(),
});

const mapSector = (s: ApiSector): Sector => ({
  id: String(s.id),
  name: s.name,
  companyId: String(s.company),
  responsible: s.supervisor_name || s.responsible_name || '',
  phone: s.responsible_phone || '',
  email: s.responsible_email || '',
  area: typeof s.area === 'number' ? s.area : (parseFloat(String(s.area)) || 0),
  occupants: s.occupants || 0,
  hvacUnits: s.hvac_units || 0,
  notes: s.description || s.notes || '',
});

const mapSubsection = (ss: ApiSubsection): SubSection => ({
  id: String(ss.id),
  name: ss.name,
  sectorId: String(ss.sector),
  notes: ss.description || ss.notes || '',
});

const mapLocationNode = (node: ApiLocationNode): LocationNode => ({
  id: String(node.id),
  name: node.name,
  type: node.type,
  parentId: node.parent_id ? String(node.parent_id) : undefined,
  children: node.children?.map(mapLocationNode),
  data: {} as Company | Sector | SubSection, // Preenchido separadamente se necessário
});

// ============================================
// Service
// ============================================

export const locationsService = {
  // ==========================================
  // Companies
  // ==========================================
  
  async getCompanies(): Promise<Company[]> {
    const response = await api.get<PaginatedResponse<ApiCompany>>('/locations/companies/');
    return response.data.results.map(mapCompany);
  },

  async getCompany(id: string): Promise<Company> {
    const response = await api.get<ApiCompany>(`/locations/companies/${id}/`);
    return mapCompany(response.data);
  },

  async createCompany(data: Omit<Company, 'id' | 'createdAt'>): Promise<Company> {
    const payload = {
      name: data.name || '',
      description: data.segment || '',  // segment é mapeado para description
      cnpj: data.cnpj || '',
      address: data.address?.fullAddress || '',
      city: data.address?.city || '',
      state: data.address?.state || '',
      zip_code: data.address?.zip || '',
      responsible_name: data.responsible || '',
      responsible_role: data.role || '',
      total_area: data.totalArea || null,
      occupants: data.occupants || 0,
      hvac_units: data.hvacUnits || 0,
    };

    try {
      const response = await api.post<ApiCompany>('/locations/companies/', payload);
      return mapCompany(response.data);
    } catch (error: unknown) {
      console.error('Error creating company:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown } };
        console.error('Response data:', axiosError.response?.data);
      }
      throw error;
    }
  },

  async updateCompany(id: string, data: Partial<Company>): Promise<Company> {
    const payload: Record<string, unknown> = {};
    
    // Campos básicos
    if (data.name !== undefined) payload.name = data.name;
    if (data.segment !== undefined) payload.description = data.segment;  // segment -> description
    if (data.cnpj !== undefined) payload.cnpj = data.cnpj;
    
    // Endereço
    if (data.address) {
      if (data.address.fullAddress !== undefined) payload.address = data.address.fullAddress;
      if (data.address.city !== undefined) payload.city = data.address.city;
      if (data.address.state !== undefined) payload.state = data.address.state;
      if (data.address.zip !== undefined) payload.zip_code = data.address.zip;
    }
    
    // Dados operacionais
    if (data.responsible !== undefined) payload.responsible_name = data.responsible;
    if (data.role !== undefined) payload.responsible_role = data.role;
    if (data.totalArea !== undefined) payload.total_area = data.totalArea || null;
    if (data.occupants !== undefined) payload.occupants = data.occupants;
    if (data.hvacUnits !== undefined) payload.hvac_units = data.hvacUnits;
    


    const response = await api.patch<ApiCompany>(`/locations/companies/${id}/`, payload);
    return mapCompany(response.data);
  },

  async deleteCompany(id: string): Promise<void> {
    await api.delete(`/locations/companies/${id}/`);
  },

  // ==========================================
  // Sectors
  // ==========================================

  async getSectors(companyId?: string): Promise<Sector[]> {
    const params = companyId ? { company: companyId } : {};
    const response = await api.get<PaginatedResponse<ApiSector>>('/locations/sectors/', { params });
    return response.data.results.map(mapSector);
  },

  async getSector(id: string): Promise<Sector> {
    const response = await api.get<ApiSector>(`/locations/sectors/${id}/`);
    return mapSector(response.data);
  },

  async createSector(data: Omit<Sector, 'id'>): Promise<Sector> {
    const payload = {
      name: data.name,
      company: Number(data.companyId),
      description: data.notes || '',
      responsible_name: data.responsible || '',
      responsible_phone: data.phone || '',
      responsible_email: data.email || '',
      area: data.area || null,
      occupants: data.occupants || 0,
      hvac_units: data.hvacUnits || 0,
    };

    try {
      const response = await api.post<ApiSector>('/locations/sectors/', payload);
      return mapSector(response.data);
    } catch (error: unknown) {
      console.error('Error creating sector:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown } };
        console.error('Response data:', axiosError.response?.data);
      }
      throw error;
    }
  },

  async updateSector(id: string, data: Partial<Sector>): Promise<Sector> {
    const payload: Record<string, unknown> = {};
    
    if (data.name) payload.name = data.name;
    if (data.companyId) payload.company = Number(data.companyId);
    if (data.notes !== undefined) payload.description = data.notes;
    if (data.responsible !== undefined) payload.responsible_name = data.responsible;
    if (data.phone !== undefined) payload.responsible_phone = data.phone;
    if (data.email !== undefined) payload.responsible_email = data.email;
    if (data.area !== undefined) payload.area = data.area || null;
    if (data.occupants !== undefined) payload.occupants = data.occupants;
    if (data.hvacUnits !== undefined) payload.hvac_units = data.hvacUnits;
    


    const response = await api.patch<ApiSector>(`/locations/sectors/${id}/`, payload);
    return mapSector(response.data);
  },

  async deleteSector(id: string): Promise<void> {
    await api.delete(`/locations/sectors/${id}/`);
  },

  // ==========================================
  // Subsections
  // ==========================================

  async getSubsections(sectorId?: string): Promise<SubSection[]> {
    const params = sectorId ? { sector: sectorId } : {};
    const response = await api.get<PaginatedResponse<ApiSubsection>>('/locations/subsections/', { params });
    return response.data.results.map(mapSubsection);
  },

  async getSubsection(id: string): Promise<SubSection> {
    const response = await api.get<ApiSubsection>(`/locations/subsections/${id}/`);
    return mapSubsection(response.data);
  },

  async createSubsection(data: Omit<SubSection, 'id'>): Promise<SubSection> {
    const payload = {
      name: data.name,
      sector: Number(data.sectorId),
      code: '',  // Campo obrigatório para unique_together
      description: data.notes || '',
    };

    const response = await api.post<ApiSubsection>('/locations/subsections/', payload);
    return mapSubsection(response.data);
  },

  async updateSubsection(id: string, data: Partial<SubSection>): Promise<SubSection> {
    const payload: Record<string, unknown> = {};
    
    if (data.name) payload.name = data.name;
    if (data.sectorId) payload.sector = Number(data.sectorId);
    if (data.notes !== undefined) payload.description = data.notes;
    


    const response = await api.patch<ApiSubsection>(`/locations/subsections/${id}/`, payload);
    return mapSubsection(response.data);
  },

  async deleteSubsection(id: string): Promise<void> {
    await api.delete(`/locations/subsections/${id}/`);
  },

  // ==========================================
  // Tree (Hierarquia completa)
  // ==========================================

  async getTree(): Promise<LocationNode[]> {
    const response = await api.get<ApiLocationNode[]>('/locations/tree/');
    return response.data.map(mapLocationNode);
  },

  /**
   * Obtém contagens para validação
   */
  async getCounts(): Promise<{
    companies: number;
    sectors: number;
    subsections: number;
  }> {
    const response = await api.get<{
      companies: number;
      sectors: number;
      subsections: number;
    }>('/locations/counts/');
    return response.data;
  },
};
