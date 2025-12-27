/**
 * React Query Hooks para Work Orders (Ordens de Serviço)
 * 
 * Hooks para gerenciamento de OS com:
 * - Cache automático
 * - Refetch inteligente
 * - Invalidação de queries relacionadas
 * - Optimistic updates
 * 
 * NOTA: Todas as OSs são gerenciadas exclusivamente via API.
 * A geração automática de OSs a partir de planos é responsabilidade do backend.
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { workOrdersService, type WorkOrderFilters, type CompleteWorkOrderData, type WorkOrderStats } from '@/services/workOrdersService';
import { isUserAuthenticated } from '@/hooks/useAuth';
import type { WorkOrder } from '@/types';

// ============================================
// Query Keys
// ============================================

export const workOrderKeys = {
  all: ['workOrders'] as const,
  lists: () => [...workOrderKeys.all, 'list'] as const,
  list: (filters?: WorkOrderFilters) => [...workOrderKeys.lists(), filters] as const,
  details: () => [...workOrderKeys.all, 'detail'] as const,
  detail: (id: string) => [...workOrderKeys.details(), id] as const,
  stats: () => [...workOrderKeys.all, 'stats'] as const,
  byAsset: (assetId: string) => [...workOrderKeys.all, 'byAsset', assetId] as const,
  overdue: () => [...workOrderKeys.all, 'overdue'] as const,
  upcoming: (days?: number) => [...workOrderKeys.all, 'upcoming', days] as const,
};

// ============================================
// Query Hooks
// ============================================

/**
 * Lista todas as ordens de serviço com filtros
 * Todas as OSs vêm exclusivamente da API
 */
export function useWorkOrders(filters?: WorkOrderFilters) {
  return useQuery({
    queryKey: workOrderKeys.list(filters),
    queryFn: () => workOrdersService.getAll(filters),
    staleTime: 1000 * 60 * 2, // 2 minutos
    enabled: isUserAuthenticated(),
  });
}

/**
 * Lista paginada de ordens de serviço
 */
export function useWorkOrdersPaginated(filters?: WorkOrderFilters) {
  return useQuery({
    queryKey: [...workOrderKeys.list(filters), 'paginated'],
    queryFn: () => workOrdersService.getAllPaginated(filters),
    staleTime: 1000 * 60 * 2,
    enabled: isUserAuthenticated(),
  });
}

/**
 * Lista infinita para scroll infinito
 */
export function useWorkOrdersInfinite(filters?: Omit<WorkOrderFilters, 'page'>) {
  return useInfiniteQuery({
    queryKey: [...workOrderKeys.list(filters), 'infinite'],
    queryFn: ({ pageParam = 1 }) => 
      workOrdersService.getAllPaginated({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.next) {
        return allPages.length + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 2,
    enabled: isUserAuthenticated(),
  });
}

/**
 * Detalhes de uma ordem de serviço
 */
export function useWorkOrder(id: string | null | undefined) {
  return useQuery({
    queryKey: workOrderKeys.detail(id!),
    queryFn: () => workOrdersService.getById(id!),
    enabled: !!id && isUserAuthenticated(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Estatísticas das ordens de serviço
 */
export function useWorkOrderStats() {
  return useQuery({
    queryKey: workOrderKeys.stats(),
    queryFn: () => workOrdersService.getStats(),
    staleTime: 1000 * 60 * 5,
    enabled: isUserAuthenticated(),
  });
}

/**
 * Ordens de serviço de um equipamento específico
 */
export function useWorkOrdersByAsset(assetId: string | null | undefined) {
  return useQuery({
    queryKey: workOrderKeys.byAsset(assetId!),
    queryFn: () => workOrdersService.getByAsset(assetId!),
    enabled: !!assetId && isUserAuthenticated(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Ordens de serviço atrasadas
 */
export function useOverdueWorkOrders() {
  return useQuery({
    queryKey: workOrderKeys.overdue(),
    queryFn: () => workOrdersService.getOverdue(),
    staleTime: 1000 * 60 * 5,
    enabled: isUserAuthenticated(),
  });
}

/**
 * Próximas ordens de serviço
 */
export function useUpcomingWorkOrders(days: number = 7) {
  return useQuery({
    queryKey: workOrderKeys.upcoming(days),
    queryFn: () => workOrdersService.getUpcoming(days),
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Cria uma nova ordem de serviço
 */
export function useCreateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<WorkOrder>) => workOrdersService.create(data),
    onSuccess: () => {
      // Invalida todas as listas
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.stats() });
    },
  });
}

/**
 * Atualiza uma ordem de serviço
 */
export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkOrder> }) =>
      workOrdersService.update(id, data),
    onSuccess: (updatedWO, { id }) => {
      // Atualiza cache do item específico
      queryClient.setQueryData(workOrderKeys.detail(id), updatedWO);
      // Invalida listas
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
    },
  });
}

/**
 * Deleta uma ordem de serviço
 */
export function useDeleteWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workOrdersService.delete(id),
    onSuccess: (_, id) => {
      // Remove do cache
      queryClient.removeQueries({ queryKey: workOrderKeys.detail(id) });
      // Invalida listas
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.stats() });
    },
  });
}

/**
 * Inicia uma ordem de serviço
 */
export function useStartWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, technicianId }: { id: string; technicianId?: string }) => 
      workOrdersService.start(id, technicianId),
    onSuccess: (updatedWO, { id }) => {
      queryClient.setQueryData(workOrderKeys.detail(id), updatedWO);
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.stats() });
    },
  });
}

/**
 * Conclui uma ordem de serviço
 */
export function useCompleteWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompleteWorkOrderData }) =>
      workOrdersService.complete(id, data),
    onSuccess: (updatedWO, { id }) => {
      queryClient.setQueryData(workOrderKeys.detail(id), updatedWO);
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.stats() });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.overdue() });
    },
  });
}

/**
 * Cancela uma ordem de serviço
 */
export function useCancelWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      workOrdersService.cancel(id, reason),
    onSuccess: (updatedWO, { id }) => {
      queryClient.setQueryData(workOrderKeys.detail(id), updatedWO);
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.stats() });
    },
  });
}

/**
 * Upload de foto
 */
export function useUploadWorkOrderPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file, caption }: { id: string; file: File; caption?: string }) =>
      workOrdersService.uploadPhoto(id, file, caption),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.detail(id) });
    },
  });
}

/**
 * Remove foto
 */
export function useDeleteWorkOrderPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workOrderId, photoId }: { workOrderId: string; photoId: string }) =>
      workOrdersService.deletePhoto(workOrderId, photoId),
    onSuccess: (_, { workOrderId }) => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.detail(workOrderId) });
    },
  });
}

/**
 * Adiciona item de estoque
 */
export function useAddWorkOrderStockItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workOrderId, itemId, quantity }: { workOrderId: string; itemId: string; quantity: number }) =>
      workOrdersService.addStockItem(workOrderId, itemId, quantity),
    onSuccess: (_, { workOrderId }) => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.detail(workOrderId) });
    },
  });
}

/**
 * Remove item de estoque
 */
export function useRemoveWorkOrderStockItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workOrderId, itemId }: { workOrderId: string; itemId: string }) =>
      workOrdersService.removeStockItem(workOrderId, itemId),
    onSuccess: (_, { workOrderId }) => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.detail(workOrderId) });
    },
  });
}

// ============================================
// Prefetch Helpers
// ============================================

/**
 * Prefetch de detalhes de uma OS (para hover/preload)
 */
export function usePrefetchWorkOrder() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: workOrderKeys.detail(id),
      queryFn: () => workOrdersService.getById(id),
      staleTime: 1000 * 60 * 5,
    });
  };
}
