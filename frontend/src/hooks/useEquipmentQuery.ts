/**
 * Hooks para queries de Equipment (CMMS)
 * 
 * React Query hooks para gerenciamento de equipamentos
 * com cache, refetch automático e otimizações.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentService, type EquipmentFilters } from '@/services/equipmentService';
import { isUserAuthenticated } from '@/hooks/useAuth';
import type { Equipment } from '@/types';

// ============================================
// Query Keys
// ============================================

export const equipmentKeys = {
  all: ['equipment'] as const,
  lists: () => [...equipmentKeys.all, 'list'] as const,
  list: (filters?: EquipmentFilters) => [...equipmentKeys.lists(), filters] as const,
  listComplete: (filters?: EquipmentFilters) => [...equipmentKeys.lists(), 'complete', filters] as const,
  details: () => [...equipmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...equipmentKeys.details(), id] as const,
  stats: () => [...equipmentKeys.all, 'stats'] as const,
};

// ============================================
// Query Hooks
// ============================================

/**
 * Lista todos os equipamentos com filtros opcionais
 */
export function useEquipments(filters?: EquipmentFilters) {
  return useQuery({
    queryKey: equipmentKeys.list(filters),
    queryFn: () => equipmentService.getAll(filters),
    staleTime: 0, // Sempre buscar dados frescos
    gcTime: 1000 * 60, // 1 minuto - limpar cache mais rapidamente
    enabled: isUserAuthenticated(),
  });
}

/**
 * Lista equipamentos com dados completos (métricas, alertas)
 */
export function useEquipmentsComplete(filters?: EquipmentFilters) {
  return useQuery({
    queryKey: equipmentKeys.listComplete(filters),
    queryFn: () => equipmentService.getAllComplete(filters),
    staleTime: 1000 * 60 * 2, // 2 minutos (dados mais dinâmicos)
    enabled: isUserAuthenticated(),
  });
}

/**
 * Busca detalhes de um equipamento específico
 */
export function useEquipment(id: string | null | undefined) {
  return useQuery({
    queryKey: equipmentKeys.detail(id!),
    queryFn: () => equipmentService.getById(id!),
    enabled: !!id && isUserAuthenticated(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Estatísticas gerais dos equipamentos
 */
export function useEquipmentStats() {
  return useQuery({
    queryKey: equipmentKeys.stats(),
    queryFn: () => equipmentService.getStats(),
    staleTime: 1000 * 60 * 5,
    enabled: isUserAuthenticated(),
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Atualiza um equipamento
 */
export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Equipment> }) => 
      equipmentService.update(id, data),
    onSuccess: (updatedEquipment) => {
      // Atualiza o cache do item específico
      queryClient.setQueryData(
        equipmentKeys.detail(updatedEquipment.id),
        updatedEquipment
      );
      
      // Atualiza o equipamento na lista em cache (otimistic update)
      queryClient.setQueriesData(
        { queryKey: equipmentKeys.lists() },
        (oldData: Equipment[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(eq => 
            eq.id === updatedEquipment.id ? updatedEquipment : eq
          );
        }
      );
      
      // Invalida e refetch imediato para garantir dados atualizados
      queryClient.invalidateQueries({ 
        queryKey: equipmentKeys.lists(),
        refetchType: 'all'
      });
      queryClient.invalidateQueries({ queryKey: equipmentKeys.stats() });
    },
  });
}

/**
 * Prefetch de equipamentos para navegação otimizada
 */
export function usePrefetchEquipments(queryClient: ReturnType<typeof useQueryClient>) {
  return (filters?: EquipmentFilters) => {
    queryClient.prefetchQuery({
      queryKey: equipmentKeys.list(filters),
      queryFn: () => equipmentService.getAll(filters),
      staleTime: 1000 * 60 * 5,
    });
  };
}

export default {
  useEquipments,
  useEquipmentsComplete,
  useEquipment,
  useEquipmentStats,
  useUpdateEquipment,
};
