/**
 * Locations Service (Empresas, Unidades, Setores, Subsetores)
 * 
 * Serviço para gerenciamento da hierarquia de locais
 * 
 * Endpoints:
 * - GET /api/locations/companies/
 * - GET /api/locations/units/
 * - GET /api/locations/sectors/
 * - GET /api/locations/subsections/
 * - GET /api/locations/tree/
 */

import { api } from '@/lib/api';
import type { Company, Unit, Sector, SubSection, LocationNode } from '@/types';
import type { ApiCompany, ApiUnit, ApiSector, ApiSubsection, ApiLocationNode, PaginatedResponse } from '@/types/api';

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

const mapUnit = (u: ApiUnit): Unit => ({
  id: String(u.id),
  name: u.name,
  companyId: String(u.company),
  cnpj: u.cnpj || '',
  address: {
    zip: u.zip_code || '',
    city: u.city || '',
    state: u.state || '',
    fullAddress: u.address || '',
  },
  responsible: u.manager_name || u.responsible_name || '',
  role: u.responsible_role || '',
  totalArea: u.total_area ?? undefined,
  occupants: u.occupants ?? undefined,
  hvacUnits: u.hvac_units ?? undefined,
  notes: u.description || u.notes || '',
});

const mapSector = (s: ApiSector): Sector => ({
  id: String(s.id),
  name: s.name,
  unitId: String(s.unit),
  companyId: s.company_id ? String(s.company_id) : undefined,
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
  unitId: ss.unit_id ? String(ss.unit_id) : undefined,
  companyId: ss.company_id ? String(ss.company_id) : undefined,
  area: ss.area ? Number(ss.area) : undefined,
  occupants: ss.occupants ?? undefined,
  hvacUnits: ss.hvac_units ?? undefined,
  notes: ss.description || ss.notes || '',
});

const mapLocationNode = (node: ApiLocationNode): LocationNode => ({
  id: String(node.id),
  name: node.name,
  type: node.type,
  parentId: node.parent_id ? String(node.parent_id) : undefined,
  children: node.children?.map(mapLocationNode),
  data: {} as Company | Unit | Sector | SubSection, // Preenchido separadamente se necessário
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
      const company = mapCompany(response.data);
      
      // NOTA: O Site é criado automaticamente pelo backend via signal (post_save)
      // Não precisa criar aqui para evitar duplicação
      
      return company;
    } catch (error: unknown) {
      console.error('Error creating company:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown } };
        console.error('Response data:', axiosError.response?.data);
      }
      throw error;
    }
  },

  async updateCompany(id: string, data: Partial<Company>, oldName?: string): Promise<Company> {
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
    const company = mapCompany(response.data);
    
    // Se o nome foi alterado, atualiza o Site vinculado
    if (data.name && oldName && data.name !== oldName) {
      try {
        // Busca o Site pelo nome antigo da empresa
        const sitesResponse = await api.get<{ results?: Array<{ id: number; company: string }> } | Array<{ id: number; company: string }>>('/sites/', { 
          params: { company: oldName } 
        });
        const sites = Array.isArray(sitesResponse.data) ? sitesResponse.data : sitesResponse.data.results || [];
        
        // Atualiza cada Site vinculado
        for (const site of sites) {
          await api.patch(`/sites/${site.id}/`, {
            name: data.name,
            company: data.name,
            address: data.address?.fullAddress || undefined,
          });
        }
        console.log(`Site(s) atualizado(s) para a empresa: ${data.name}`);
      } catch (siteError) {
        console.warn('Aviso: Não foi possível atualizar Site automaticamente:', siteError);
      }
    }
    
    return company;
  },

  async deleteCompany(id: string, companyName?: string): Promise<void> {
    // Primeiro, exclui os Sites vinculados à empresa
    if (companyName) {
      try {
        const sitesResponse = await api.get<{ results?: Array<{ id: number; company: string }> } | Array<{ id: number; company: string }>>('/sites/', { 
          params: { company: companyName } 
        });
        const sites = Array.isArray(sitesResponse.data) ? sitesResponse.data : sitesResponse.data.results || [];
        
        // Exclui cada Site vinculado
        for (const site of sites) {
          await api.delete(`/sites/${site.id}/`);
        }
        console.log(`Site(s) excluído(s) para a empresa: ${companyName}`);
      } catch (siteError) {
        console.warn('Aviso: Não foi possível excluir Site automaticamente:', siteError);
      }
    }
    
    // Depois exclui a empresa
    await api.delete(`/locations/companies/${id}/`);
  },

  // ==========================================
  // Units
  // ==========================================

  async getUnits(companyId?: string): Promise<Unit[]> {
    const params = companyId ? { company: companyId } : {};
    const response = await api.get<PaginatedResponse<ApiUnit>>('/locations/units/', { params });
    return response.data.results.map(mapUnit);
  },

  async getUnit(id: string): Promise<Unit> {
    const response = await api.get<ApiUnit>(`/locations/units/${id}/`);
    return mapUnit(response.data);
  },

  async createUnit(data: Omit<Unit, 'id' | 'createdAt'>): Promise<Unit> {
    const payload = {
      name: data.name,
      company: Number(data.companyId),
      description: data.notes || '',
      cnpj: data.cnpj || '',
      address: data.address?.fullAddress || '',
      city: data.address?.city || '',
      state: data.address?.state || '',
      zip_code: data.address?.zip || '',
      total_area: data.totalArea || null,
      occupants: data.occupants || null,
      hvac_units: data.hvacUnits || null,
    };

    try {
      const response = await api.post<ApiUnit>('/locations/units/', payload);
      return mapUnit(response.data);
    } catch (error: unknown) {
      console.error('Error creating unit:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown } };
        console.error('Response data:', axiosError.response?.data);
      }
      throw error;
    }
  },

  async updateUnit(id: string, data: Partial<Unit>): Promise<Unit> {
    const payload: Record<string, unknown> = {};
    
    if (data.name !== undefined) payload.name = data.name;
    if (data.companyId !== undefined) payload.company = Number(data.companyId);
    if (data.notes !== undefined) payload.description = data.notes;
    if (data.cnpj !== undefined) payload.cnpj = data.cnpj;
    if (data.address?.fullAddress !== undefined) payload.address = data.address.fullAddress;
    if (data.address?.city !== undefined) payload.city = data.address.city;
    if (data.address?.state !== undefined) payload.state = data.address.state;
    if (data.address?.zip !== undefined) payload.zip_code = data.address.zip;
    if (data.totalArea !== undefined) payload.total_area = data.totalArea;
    if (data.occupants !== undefined) payload.occupants = data.occupants;
    if (data.hvacUnits !== undefined) payload.hvac_units = data.hvacUnits;

    const response = await api.patch<ApiUnit>(`/locations/units/${id}/`, payload);
    return mapUnit(response.data);
  },

  async deleteUnit(id: string): Promise<void> {
    await api.delete(`/locations/units/${id}/`);
  },

  // ==========================================
  // Sectors
  // ==========================================

  async getSectors(unitId?: string): Promise<Sector[]> {
    const params = unitId ? { unit: unitId } : {};
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
      unit: Number(data.unitId),
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
    if (data.unitId) payload.unit = Number(data.unitId);
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
      description: data.notes || '',
      area: data.area ?? null,
      occupants: data.occupants ?? null,
      hvac_units: data.hvacUnits ?? null,
    };

    const response = await api.post<ApiSubsection>('/locations/subsections/', payload);
    return mapSubsection(response.data);
  },

  async updateSubsection(id: string, data: Partial<SubSection>): Promise<SubSection> {
    const payload: Record<string, unknown> = {};
    
    if (data.name) payload.name = data.name;
    if (data.sectorId) payload.sector = Number(data.sectorId);
    if (data.notes !== undefined) payload.description = data.notes;
    if (data.area !== undefined) payload.area = data.area;
    if (data.occupants !== undefined) payload.occupants = data.occupants;
    if (data.hvacUnits !== undefined) payload.hvac_units = data.hvacUnits;

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
    units: number;
    sectors: number;
    subsections: number;
  }> {
    const response = await api.get<{
      companies: number;
      units: number;
      sectors: number;
      subsections: number;
    }>('/locations/counts/');
    return response.data;
  },
};
