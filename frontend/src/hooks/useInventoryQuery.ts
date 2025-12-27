/**
 * Inventory React Query Hooks
 * 
 * Hooks para gerenciar estado de estoque com React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  inventoryService,
  inventoryCategoriesService,
  inventoryItemsService,
  inventoryMovementsService,
  inventoryCountsService,
  type InventoryItemParams,
  type InventoryMovementParams,
  type CreateMovementData,
  type CreateCountData,
} from '@/services/inventoryService';
import { isUserAuthenticated } from '@/hooks/useAuth';
import type { ApiInventoryItem, ApiInventoryCategory } from '@/types/api';

// ============================================================================
// Query Keys
// ============================================================================

export const inventoryKeys = {
  all: ['inventory'] as const,
  categories: () => [...inventoryKeys.all, 'categories'] as const,
  categoryTree: () => [...inventoryKeys.categories(), 'tree'] as const,
  category: (id: number) => [...inventoryKeys.categories(), id] as const,
  items: () => [...inventoryKeys.all, 'items'] as const,
  itemsList: (params?: InventoryItemParams) => [...inventoryKeys.items(), 'list', params] as const,
  item: (id: number) => [...inventoryKeys.items(), id] as const,
  itemMovements: (id: number) => [...inventoryKeys.item(id), 'movements'] as const,
  lowStock: () => [...inventoryKeys.items(), 'low-stock'] as const,
  critical: () => [...inventoryKeys.items(), 'critical'] as const,
  stats: () => [...inventoryKeys.items(), 'stats'] as const,
  movements: () => [...inventoryKeys.all, 'movements'] as const,
  movementsList: (params?: InventoryMovementParams) => [...inventoryKeys.movements(), 'list', params] as const,
  movementsSummary: (days: number) => [...inventoryKeys.movements(), 'summary', days] as const,
  counts: () => [...inventoryKeys.all, 'counts'] as const,
  count: (id: number) => [...inventoryKeys.counts(), id] as const,
};

// ============================================================================
// CATEGORIES HOOKS
// ============================================================================

export function useInventoryCategories(params?: { is_active?: boolean; parent?: number | null }) {
  return useQuery({
    queryKey: inventoryKeys.categories(),
    queryFn: () => inventoryCategoriesService.getAll(params),
    enabled: isUserAuthenticated(),
  });
}

export function useInventoryCategoryTree() {
  return useQuery({
    queryKey: inventoryKeys.categoryTree(),
    queryFn: () => inventoryCategoriesService.getTree(),
    enabled: isUserAuthenticated(),
  });
}

export function useInventoryCategory(id: number) {
  return useQuery({
    queryKey: inventoryKeys.category(id),
    queryFn: () => inventoryCategoriesService.getById(id),
    enabled: !!id && isUserAuthenticated(),
  });
}

export function useCreateInventoryCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<ApiInventoryCategory>) =>
      inventoryCategoriesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
    },
  });
}

export function useUpdateInventoryCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ApiInventoryCategory> }) =>
      inventoryCategoriesService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.category(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
    },
  });
}

export function useDeleteInventoryCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => inventoryCategoriesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
    },
  });
}

// ============================================================================
// ITEMS HOOKS
// ============================================================================

export function useInventoryItems(params?: InventoryItemParams) {
  return useQuery({
    queryKey: inventoryKeys.itemsList(params),
    queryFn: () => inventoryItemsService.getAll(params),
    enabled: isUserAuthenticated(),
    staleTime: 0, // Always fetch fresh data
  });
}

export function useInventoryItem(id: number) {
  return useQuery({
    queryKey: inventoryKeys.item(id),
    queryFn: () => inventoryItemsService.getById(id),
    enabled: !!id && isUserAuthenticated(),
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: inventoryKeys.lowStock(),
    queryFn: () => inventoryItemsService.getLowStock(),
    enabled: isUserAuthenticated(),
  });
}

export function useCriticalItems() {
  return useQuery({
    queryKey: inventoryKeys.critical(),
    queryFn: () => inventoryItemsService.getCritical(),
    enabled: isUserAuthenticated(),
  });
}

export function useInventoryStats() {
  return useQuery({
    queryKey: inventoryKeys.stats(),
    queryFn: () => inventoryItemsService.getStats(),
    enabled: isUserAuthenticated(),
  });
}

export function useInventoryItemMovements(id: number) {
  return useQuery({
    queryKey: inventoryKeys.itemMovements(id),
    queryFn: () => inventoryItemsService.getMovements(id),
    enabled: !!id && isUserAuthenticated(),
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<ApiInventoryItem>) =>
      inventoryItemsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() });
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ApiInventoryItem> }) =>
      inventoryItemsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.item(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() });
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => inventoryItemsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() });
    },
  });
}

export function useAdjustInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, quantity, note }: { id: number; quantity: number; note?: string }) =>
      inventoryItemsService.adjust(id, quantity, note),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.item(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movements() });
    },
  });
}

// ============================================================================
// MOVEMENTS HOOKS
// ============================================================================

export function useInventoryMovements(params?: InventoryMovementParams) {
  return useQuery({
    queryKey: inventoryKeys.movementsList(params),
    queryFn: () => inventoryMovementsService.getAll(params),
    enabled: isUserAuthenticated(),
  });
}

export function useInventoryMovementsSummary(days: number = 30) {
  return useQuery({
    queryKey: inventoryKeys.movementsSummary(days),
    queryFn: () => inventoryMovementsService.getSummary(days),
    enabled: isUserAuthenticated(),
  });
}

export function useConsumptionByCategory(days: number = 90) {
  return useQuery({
    queryKey: ['inventory', 'consumption-by-category', days],
    queryFn: () => inventoryMovementsService.getConsumptionByCategory(days),
    enabled: isUserAuthenticated(),
  });
}

export function useTopConsumedItems(days: number = 90, limit: number = 5) {
  return useQuery({
    queryKey: ['inventory', 'top-consumed-items', days, limit],
    queryFn: () => inventoryMovementsService.getTopConsumedItems(days, limit),
    enabled: isUserAuthenticated(),
  });
}

export function useCreateInventoryMovement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateMovementData) =>
      inventoryMovementsService.create(data),
    onSuccess: (_, { item }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.item(item) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movements() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() });
    },
  });
}

// ============================================================================
// COUNTS HOOKS
// ============================================================================

export function useInventoryCounts(params?: { status?: string }) {
  return useQuery({
    queryKey: inventoryKeys.counts(),
    queryFn: () => inventoryCountsService.getAll(params),
    enabled: isUserAuthenticated(),
  });
}

export function useInventoryCount(id: number) {
  return useQuery({
    queryKey: inventoryKeys.count(id),
    queryFn: () => inventoryCountsService.getById(id),
    enabled: !!id && isUserAuthenticated(),
  });
}

export function useCreateInventoryCount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateCountData) =>
      inventoryCountsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.counts() });
    },
  });
}

export function useStartInventoryCount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => inventoryCountsService.start(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.count(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.counts() });
    },
  });
}

export function useCompleteInventoryCount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, options }: { id: number; options?: { apply_partial?: boolean; apply_adjustments?: boolean } }) =>
      inventoryCountsService.complete(id, options),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.count(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.counts() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() });
    },
  });
}

export function useCancelInventoryCount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => inventoryCountsService.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.count(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.counts() });
    },
  });
}

export function useGenerateInventoryCountItems() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => inventoryCountsService.generateItems(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.count(id) });
    },
  });
}

export function useCountInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      countId,
      itemId,
      counted_quantity,
      note,
    }: {
      countId: number;
      itemId: number;
      counted_quantity: number;
      note?: string;
    }) => inventoryCountsService.countItem(countId, itemId, counted_quantity, note),
    onSuccess: (_, { countId }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.count(countId) });
    },
  });
}

// ============================================================================
// ALIASES para compatibilidade
// ============================================================================

/**
 * Alias para useInventoryItems - mantém compatibilidade com código que usa StockItems
 */
export const useStockItems = useInventoryItems;
