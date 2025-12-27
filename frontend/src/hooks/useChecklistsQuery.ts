/**
 * React Query hooks para Checklists
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  listChecklists, 
  listChecklistCategories,
  getChecklistStats,
  createChecklist,
  updateChecklist,
  deleteChecklist,
  duplicateChecklist,
  toggleChecklistActive,
} from '@/data/checklistsStore';
import { ChecklistTemplate } from '@/models/checklist';

export function useChecklists(filters?: any) {
  return useQuery({
    queryKey: ['checklists', filters],
    queryFn: () => Promise.resolve(listChecklists()),
  });
}

export function useChecklistCategories() {
  return useQuery({
    queryKey: ['checklist-categories'],
    queryFn: () => Promise.resolve(listChecklistCategories()),
  });
}

export function useChecklistStats() {
  return useQuery({
    queryKey: ['checklist-stats'],
    queryFn: () => Promise.resolve(getChecklistStats()),
  });
}

export function useCreateChecklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'>) => 
      Promise.resolve(createChecklist(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-stats'] });
    },
  });
}

export function useUpdateChecklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<ChecklistTemplate, 'id' | 'created_at'>> }) => 
      Promise.resolve(updateChecklist(id, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-stats'] });
    },
  });
}

export function useDeleteChecklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => Promise.resolve(deleteChecklist(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-stats'] });
    },
  });
}

export function useDuplicateChecklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => Promise.resolve(duplicateChecklist(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-stats'] });
    },
  });
}

export function useToggleChecklistActive() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      Promise.resolve(toggleChecklistActive(id, isActive)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-stats'] });
    },
  });
}
