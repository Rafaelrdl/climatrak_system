/**
 * Service para CRUD de Checklists via API
 */

import { api } from '@/lib/api';

// ============================================
// Types da API
// ============================================

export interface ApiChecklistCategory {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
  checklist_count: number;
  created_at: string;
  updated_at: string;
}

export interface ApiChecklistItem {
  id: string;
  label: string;
  type: 'checkbox' | 'text' | 'number' | 'select' | 'photo';
  required: boolean;
  order: number;
  options?: string[];
}

export interface ApiChecklistTemplate {
  id: number;
  name: string;
  description: string;
  category: number | null;
  category_name: string | null;
  category_color: string | null;
  items: ApiChecklistItem[];
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  is_active: boolean;
  version: number;
  usage_count: number;
  estimated_time: number | null;
  items_count: number;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiChecklistStats {
  total: number;
  active: number;
  inactive: number;
  total_items: number;
  total_usage: number;
  by_category: Record<string, number>;
}

// ============================================
// Categorias de Checklists
// ============================================

export interface ChecklistCategoryInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
}

export async function listChecklistCategories(): Promise<ApiChecklistCategory[]> {
  const response = await api.get('/cmms/checklist-categories/');
  const data = response.data;
  return Array.isArray(data) ? data : (data.results || []);
}

export async function getChecklistCategory(id: number): Promise<ApiChecklistCategory> {
  const response = await api.get(`/cmms/checklist-categories/${id}/`);
  return response.data;
}

export async function createChecklistCategory(data: ChecklistCategoryInput): Promise<ApiChecklistCategory> {
  const response = await api.post('/cmms/checklist-categories/', data);
  return response.data;
}

export async function updateChecklistCategory(id: number, data: Partial<ChecklistCategoryInput>): Promise<ApiChecklistCategory> {
  const response = await api.patch(`/cmms/checklist-categories/${id}/`, data);
  return response.data;
}

export async function deleteChecklistCategory(id: number): Promise<void> {
  await api.delete(`/cmms/checklist-categories/${id}/`);
}

// ============================================
// Templates de Checklists
// ============================================

export interface ChecklistFilters {
  category?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  is_active?: boolean;
  search?: string;
}

export interface ChecklistTemplateInput {
  name: string;
  description?: string;
  category?: number | null;
  items?: ApiChecklistItem[];
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  is_active?: boolean;
  estimated_time?: number | null;
}

export async function listChecklistTemplates(filters?: ChecklistFilters): Promise<ApiChecklistTemplate[]> {
  const params: Record<string, string> = {};
  
  if (filters?.category) {
    params.category = String(filters.category);
  }
  if (filters?.status) {
    params.status = filters.status;
  }
  if (filters?.is_active !== undefined) {
    params.is_active = String(filters.is_active);
  }
  if (filters?.search) {
    params.search = filters.search;
  }
  
  const response = await api.get('/cmms/checklist-templates/', { params });
  const data = response.data;
  return Array.isArray(data) ? data : (data.results || []);
}

export async function getChecklistTemplate(id: number): Promise<ApiChecklistTemplate> {
  const response = await api.get(`/cmms/checklist-templates/${id}/`);
  return response.data;
}

export async function createChecklistTemplate(data: ChecklistTemplateInput): Promise<ApiChecklistTemplate> {
  const response = await api.post('/cmms/checklist-templates/', data);
  return response.data;
}

export async function updateChecklistTemplate(id: number, data: Partial<ChecklistTemplateInput>): Promise<ApiChecklistTemplate> {
  const response = await api.patch(`/cmms/checklist-templates/${id}/`, data);
  return response.data;
}

export async function deleteChecklistTemplate(id: number): Promise<void> {
  await api.delete(`/cmms/checklist-templates/${id}/`);
}

// ============================================
// Ações Especiais
// ============================================

export async function getChecklistStats(): Promise<ApiChecklistStats> {
  const response = await api.get('/cmms/checklist-templates/stats/');
  return response.data;
}

export async function duplicateChecklistTemplate(id: number): Promise<ApiChecklistTemplate> {
  const response = await api.post(`/cmms/checklist-templates/${id}/duplicate/`);
  return response.data;
}

export async function toggleChecklistTemplateActive(id: number, isActive: boolean): Promise<ApiChecklistTemplate> {
  const response = await api.post(`/cmms/checklist-templates/${id}/toggle_active/`, { is_active: isActive });
  return response.data;
}

export async function incrementChecklistUsage(id: number): Promise<{ usage_count: number }> {
  const response = await api.post(`/cmms/checklist-templates/${id}/increment_usage/`);
  return response.data;
}
