/**
 * React Query Hooks para Requests (Solicitações)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsService, type RequestFilters, type CreateRequestData, type ConvertToWorkOrderData } from '@/services/requestsService';
import { isUserAuthenticated } from '@/hooks/useAuth';
import { workOrderKeys } from './useWorkOrdersQuery';

// ============================================
// Query Keys
// ============================================

export const requestKeys = {
  all: ['requests'] as const,
  lists: () => [...requestKeys.all, 'list'] as const,
  list: (filters?: RequestFilters) => [...requestKeys.lists(), filters] as const,
  details: () => [...requestKeys.all, 'detail'] as const,
  detail: (id: string) => [...requestKeys.details(), id] as const,
  counts: () => [...requestKeys.all, 'counts'] as const,
};

// ============================================
// Query Hooks
// ============================================

/**
 * Lista todas as solicitações
 */
export function useRequests(filters?: RequestFilters) {
  return useQuery({
    queryKey: requestKeys.list(filters),
    queryFn: () => requestsService.getAll(filters),
    staleTime: 1000 * 60 * 2,
    enabled: isUserAuthenticated(),
  });
}

/**
 * Detalhes de uma solicitação
 */
export function useRequest(id: string | null | undefined) {
  return useQuery({
    queryKey: requestKeys.detail(id!),
    queryFn: () => requestsService.getById(id!),
    enabled: !!id && isUserAuthenticated(),
  });
}

/**
 * Contagem por status
 */
export function useRequestStatusCounts() {
  return useQuery({
    queryKey: requestKeys.counts(),
    queryFn: () => requestsService.getStatusCounts(),
    staleTime: 1000 * 60 * 2,
    enabled: isUserAuthenticated(),
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Cria nova solicitação
 */
export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRequestData) => requestsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestKeys.counts() });
    },
  });
}

/**
 * Atualiza status
 */
export function useUpdateRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'NEW' | 'TRIAGING' | 'REJECTED' }) =>
      requestsService.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestKeys.counts() });
    },
  });
}

/**
 * Converte para Ordem de Serviço
 */
export function useConvertRequestToWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConvertToWorkOrderData }) =>
      requestsService.convertToWorkOrder(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestKeys.counts() });
      // Invalida também as work orders
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.stats() });
    },
  });
}

/**
 * Adiciona item
 */
export function useAddRequestItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, itemId, quantity }: { requestId: string; itemId: string; quantity: number }) =>
      requestsService.addItem(requestId, itemId, quantity),
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) });
    },
  });
}

/**
 * Remove item
 */
export function useRemoveRequestItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, itemId }: { requestId: string; itemId: string }) =>
      requestsService.removeItem(requestId, itemId),
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) });
    },
  });
}

// ============================================
// Aliases para compatibilidade com frontend
// ============================================

/**
 * Alias para useRequests - mantém compatibilidade com código que usa Solicitation
 */
export const useSolicitations = useRequests;
export const useSolicitationStatusCounts = useRequestStatusCounts;
export const useCreateSolicitation = useCreateRequest;
export const useUpdateSolicitationStatus = useUpdateRequestStatus;
export const useConvertSolicitationToWorkOrder = useConvertRequestToWorkOrder;
