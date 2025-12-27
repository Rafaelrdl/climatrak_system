/**
 * React Query Hooks para Maintenance Plans (Planos de Manutenção)
 * 
 * Integração completa com API do backend para gerenciamento de planos.
 * Todas as operações (CRUD e geração de OS) são feitas via API.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plansService, type PlanFilters, type CreatePlanData } from '@/services/plansService';
import { workOrderKeys } from '@/hooks/useWorkOrdersQuery';
import { isUserAuthenticated } from '@/hooks/useAuth';
import type { MaintenancePlan } from '@/types';

// ============================================
// Query Keys
// ============================================

export const planKeys = {
  all: ['maintenancePlans'] as const,
  lists: () => [...planKeys.all, 'list'] as const,
  list: (filters?: PlanFilters) => [...planKeys.lists(), filters] as const,
  details: () => [...planKeys.all, 'detail'] as const,
  detail: (id: string) => [...planKeys.details(), id] as const,
  stats: () => [...planKeys.all, 'stats'] as const,
};

// Re-exportar tipos para compatibilidade
export type { PlanFilters, CreatePlanData };

// ============================================
// Query Hooks
// ============================================

/**
 * Lista todos os planos de manutenção
 */
export function usePlans(filters?: PlanFilters) {
  return useQuery({
    queryKey: planKeys.list(filters),
    queryFn: () => plansService.getAll(filters),
    staleTime: 1000 * 60 * 2, // 2 minutos
    enabled: isUserAuthenticated(),
  });
}

/**
 * Lista planos ativos
 */
export function useActivePlans() {
  return usePlans({ is_active: true });
}

/**
 * Detalhes de um plano específico
 */
export function usePlan(id: string | null | undefined) {
  return useQuery({
    queryKey: planKeys.detail(id!),
    queryFn: () => plansService.getById(id!),
    enabled: !!id && isUserAuthenticated(),
  });
}

/**
 * Estatísticas dos planos
 */
export function usePlanStats() {
  return useQuery({
    queryKey: planKeys.stats(),
    queryFn: () => plansService.getStats(),
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: isUserAuthenticated(),
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Cria novo plano de manutenção
 */
export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlanData) => plansService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: planKeys.stats() });
    },
  });
}

/**
 * Atualiza plano de manutenção
 */
export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePlanData> }) => 
      plansService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
    },
  });
}

/**
 * Deleta plano de manutenção
 */
export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => plansService.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: planKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: planKeys.stats() });
    },
  });
}

/**
 * Toggle ativo/inativo do plano
 */
export function useTogglePlanActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      plansService.toggleActive(id, isActive),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: planKeys.stats() });
    },
  });
}

/**
 * Gera ordens de serviço a partir de um plano de manutenção
 * 
 * Usa o endpoint POST /cmms/plans/{id}/generate/ do backend.
 * As OSs são criadas diretamente no banco de dados com IDs válidos.
 */
export function useGenerateWorkOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      console.log('[useGenerateWorkOrders] Gerando OSs via API para plano:', planId);
      
      const result = await plansService.generateWorkOrders(planId);
      
      console.log('[useGenerateWorkOrders] Resultado:', result);
      
      return {
        work_orders_created: result.work_orders_created,
        work_order_ids: result.work_order_ids,
        next_execution_date: result.next_execution || null,
      };
    },
    onSuccess: (data, planId) => {
      console.log('[useGenerateWorkOrders] Sucesso! OSs criadas:', data.work_orders_created);
      
      // Invalidar queries de planos
      queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) });
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: planKeys.stats() });
      
      // Invalidar queries de work orders para carregar as novas OSs
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.stats() });
    },
    onError: (error) => {
      console.error('[useGenerateWorkOrders] Erro ao gerar OSs:', error);
    }
  });
}

/**
 * Adiciona ativo a um plano
 */
export function useAddAssetToPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, assetId }: { planId: string; assetId: string }) => 
      plansService.addAsset(planId, assetId),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) });
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
    },
  });
}

/**
 * Remove ativo de um plano
 */
export function useRemoveAssetFromPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, assetId }: { planId: string; assetId: string }) => 
      plansService.removeAsset(planId, assetId),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) });
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
    },
  });
}

// ============================================
// Aliases para compatibilidade
// ============================================

/**
 * Alias para usePlans - mantém compatibilidade com código existente
 */
export const useMaintenancePlans = usePlans;
