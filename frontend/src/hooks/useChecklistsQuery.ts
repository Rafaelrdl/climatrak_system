/**
 * React Query hooks para Checklists - Integração com Backend
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  listChecklistTemplates, 
  listChecklistCategories,
  getChecklistStats,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  duplicateChecklistTemplate,
  toggleChecklistTemplateActive,
  type ChecklistFilters,
  type ChecklistTemplateInput,
  type ApiChecklistTemplate,
  type ApiChecklistCategory,
} from '@/services/checklistsService';
import { ChecklistTemplate, ChecklistCategory } from '@/models/checklist';

// Conversores de tipos da API para o modelo local
function apiToLocalChecklist(api: ApiChecklistTemplate): ChecklistTemplate {
  return {
    id: String(api.id),
    name: api.name,
    description: api.description || '',
    category_id: api.category ? String(api.category) : null,
    items: api.items.map((item, index) => ({
      id: item.id,
      order: item.order || index + 1,
      description: item.label,
      type: item.type,
      required: item.required,
      // Converter options de string para objeto se necessário
      options: item.options?.map(opt => ({ value: opt, label: opt })),
    })),
    is_active: api.is_active,
    created_at: api.created_at,
    updated_at: api.updated_at,
    created_by: api.created_by_name || undefined,
    usage_count: api.usage_count,
  };
}

function apiToLocalCategory(api: ApiChecklistCategory): ChecklistCategory {
  return {
    id: String(api.id),
    name: api.name,
    color: api.color || '#6b7280',
    description: api.description,
  };
}

// Conversor de modelo local para input da API
function localToApiInput(data: Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'>): ChecklistTemplateInput {
  return {
    name: data.name,
    description: data.description,
    category: data.category_id ? Number(data.category_id) : null,
    items: data.items.map((item, index) => ({
      id: item.id,
      label: item.description,
      type: item.type,
      required: item.required,
      order: item.order || index + 1,
      // Converter options de objeto para string se necessário
      options: item.options?.map(opt => typeof opt === 'string' ? opt : opt.value),
    })),
    is_active: data.is_active,
  };
}

export function useChecklists(filters?: ChecklistFilters) {
  return useQuery({
    queryKey: ['checklists', filters],
    queryFn: async () => {
      const data = await listChecklistTemplates(filters);
      return data.map(apiToLocalChecklist);
    },
  });
}

export function useChecklistCategories() {
  return useQuery({
    queryKey: ['checklist-categories'],
    queryFn: async () => {
      const data = await listChecklistCategories();
      return data.map(apiToLocalCategory);
    },
  });
}

export function useChecklistStats() {
  return useQuery({
    queryKey: ['checklist-stats'],
    queryFn: () => getChecklistStats(),
  });
}

export function useCreateChecklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const apiData = localToApiInput(data);
      const result = await createChecklistTemplate(apiData);
      return apiToLocalChecklist(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-stats'] });
    },
  });
}

export function useUpdateChecklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<ChecklistTemplate, 'id' | 'created_at'>> }) => {
      const apiData: Partial<ChecklistTemplateInput> = {};
      
      if (data.name !== undefined) apiData.name = data.name;
      if (data.description !== undefined) apiData.description = data.description;
      if (data.category_id !== undefined) apiData.category = data.category_id ? Number(data.category_id) : null;
      if (data.is_active !== undefined) apiData.is_active = data.is_active;
      if (data.items !== undefined) {
        apiData.items = data.items.map((item, index) => ({
          id: item.id,
          label: item.description,
          type: item.type,
          required: item.required,
          order: item.order || index + 1,
          options: item.options,
        }));
      }
      
      const result = await updateChecklistTemplate(Number(id), apiData);
      return apiToLocalChecklist(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-stats'] });
    },
  });
}

export function useDeleteChecklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteChecklistTemplate(Number(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-stats'] });
    },
  });
}

export function useDuplicateChecklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await duplicateChecklistTemplate(Number(id));
      return apiToLocalChecklist(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-stats'] });
    },
  });
}

export function useToggleChecklistActive() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const result = await toggleChecklistTemplateActive(Number(id), isActive);
      return apiToLocalChecklist(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-stats'] });
    },
  });
}
