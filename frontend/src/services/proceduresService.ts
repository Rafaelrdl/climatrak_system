/**
 * Service para CRUD de Procedimentos via API
 */

import { api } from '@/lib/api';
import type { 
  ApiProcedure, 
  ApiProcedureListItem, 
  ApiProcedureCategory, 
  ApiProcedureVersion,
  ApiProcedureStats 
} from '@/types/api';

// ============================================
// Categorias de Procedimentos
// ============================================

export interface ProcedureCategoryInput {
  name: string;
  description?: string;
  color?: string;
}

export async function listProcedureCategories(): Promise<ApiProcedureCategory[]> {
  const response = await api.get('/cmms/procedure-categories/');
  // A API usa paginação global, então os dados podem estar em `results`
  const data = response.data;
  return Array.isArray(data) ? data : (data.results || []);
}

export async function getProcedureCategory(id: number): Promise<ApiProcedureCategory> {
  const response = await api.get(`/cmms/procedure-categories/${id}/`);
  return response.data;
}

export async function createProcedureCategory(data: ProcedureCategoryInput): Promise<ApiProcedureCategory> {
  const response = await api.post('/cmms/procedure-categories/', data);
  return response.data;
}

export async function updateProcedureCategory(id: number, data: Partial<ProcedureCategoryInput>): Promise<ApiProcedureCategory> {
  const response = await api.patch(`/cmms/procedure-categories/${id}/`, data);
  return response.data;
}

export async function deleteProcedureCategory(id: number): Promise<void> {
  await api.delete(`/cmms/procedure-categories/${id}/`);
}

// ============================================
// Procedimentos
// ============================================

export interface ProcedureFilters {
  category?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';
  file_type?: 'PDF' | 'MARKDOWN' | 'DOCX';
  search?: string;
  ordering?: string;
}

export interface ProcedureInput {
  title: string;
  description?: string;
  category: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';
  file_type: 'PDF' | 'MARKDOWN' | 'DOCX';
  file?: File;
  tags?: string[];
}

export interface ProcedureUpdateInput {
  title?: string;
  description?: string;
  category?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';
  file_type?: 'PDF' | 'MARKDOWN' | 'DOCX';
  file?: File;
  tags?: string[];
  create_version?: boolean;
  version_changes?: string;
}

export async function listProcedures(filters?: ProcedureFilters): Promise<ApiProcedureListItem[]> {
  const params = new URLSearchParams();
  
  if (filters?.category) params.append('category', String(filters.category));
  if (filters?.status) params.append('status', filters.status);
  if (filters?.file_type) params.append('file_type', filters.file_type);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.ordering) params.append('ordering', filters.ordering);
  
  const queryString = params.toString();
  const url = queryString ? `/cmms/procedures/?${queryString}` : '/cmms/procedures/';
  
  const response = await api.get(url);
  // A API usa paginação global, então os dados podem estar em `results`
  const data = response.data;
  return Array.isArray(data) ? data : (data.results || []);
}

export async function getProcedure(id: number): Promise<ApiProcedure> {
  const response = await api.get(`/cmms/procedures/${id}/`);
  return response.data;
}

export async function createProcedure(data: ProcedureInput): Promise<ApiProcedure> {
  const formData = new FormData();
  
  formData.append('title', data.title);
  formData.append('category', String(data.category));
  formData.append('file_type', data.file_type);
  
  if (data.description) formData.append('description', data.description);
  if (data.status) formData.append('status', data.status);
  if (data.file) formData.append('file', data.file);
  if (data.tags && data.tags.length > 0) formData.append('tags', JSON.stringify(data.tags));
  
  const response = await api.post('/cmms/procedures/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function updateProcedure(id: number, data: ProcedureUpdateInput): Promise<ApiProcedure> {
  const formData = new FormData();
  
  if (data.title) formData.append('title', data.title);
  if (data.description !== undefined) formData.append('description', data.description || '');
  if (data.category) formData.append('category', String(data.category));
  if (data.status) formData.append('status', data.status);
  if (data.file_type) formData.append('file_type', data.file_type);
  if (data.file) formData.append('file', data.file);
  if (data.tags !== undefined) formData.append('tags', JSON.stringify(data.tags || []));
  if (data.create_version !== undefined) formData.append('create_version', String(data.create_version));
  if (data.version_changes) formData.append('version_changes', data.version_changes);
  
  const response = await api.patch(`/cmms/procedures/${id}/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function deleteProcedure(id: number): Promise<void> {
  await api.delete(`/cmms/procedures/${id}/`);
}

// ============================================
// Ações de Procedimentos
// ============================================

export async function approveProcedure(id: number, approved: boolean, rejectionReason?: string): Promise<{ status: string; message: string; reason?: string }> {
  const response = await api.post(`/cmms/procedures/${id}/approve/`, {
    approved,
    rejection_reason: rejectionReason || '',
  });
  return response.data;
}

export async function submitProcedureForReview(id: number): Promise<{ status: string; message: string }> {
  const response = await api.post(`/cmms/procedures/${id}/submit_for_review/`);
  return response.data;
}

export async function archiveProcedure(id: number): Promise<{ status: string; message: string }> {
  const response = await api.post(`/cmms/procedures/${id}/archive/`);
  return response.data;
}

// ============================================
// Versões de Procedimentos
// ============================================

export interface CreateVersionInput {
  changelog?: string;
  file?: File;
}

export async function listProcedureVersions(procedureId: number): Promise<ApiProcedureVersion[]> {
  const response = await api.get(`/cmms/procedures/${procedureId}/versions/`);
  // A API pode retornar formato paginado ou array direto
  const data = response.data;
  return Array.isArray(data) ? data : (data.results || []);
}

export async function createProcedureVersion(procedureId: number, data: CreateVersionInput): Promise<ApiProcedureVersion> {
  const formData = new FormData();
  
  if (data.changelog) formData.append('changelog', data.changelog);
  if (data.file) formData.append('file', data.file);
  
  const response = await api.post(`/cmms/procedures/${procedureId}/create_version/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function restoreProcedureVersion(procedureId: number, versionId: number): Promise<{ status: string; message: string }> {
  const response = await api.post(`/cmms/procedures/${procedureId}/versions/${versionId}/restore/`);
  return response.data;
}

// ============================================
// Estatísticas
// ============================================

export async function getProcedureStats(): Promise<ApiProcedureStats> {
  const response = await api.get('/cmms/procedures/stats/');
  return response.data;
}
