/**
 * React Query Hooks para Tipos de Ativo
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetTypesService, CreateAssetTypeData } from '@/services/assetTypesService';
import { isUserAuthenticated } from '@/hooks/useAuth';

// Query Keys
export const assetTypeKeys = {
  all: ['assetTypes'] as const,
  list: () => [...assetTypeKeys.all, 'list'] as const,
};

/**
 * Hook para listar todos os tipos de ativo
 */
export function useAssetTypes() {
  return useQuery({
    queryKey: assetTypeKeys.list(),
    queryFn: () => assetTypesService.getAll(),
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: isUserAuthenticated(),
  });
}

/**
 * Hook para criar um novo tipo de ativo
 */
export function useCreateAssetType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssetTypeData) => assetTypesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetTypeKeys.list() });
    },
  });
}

/**
 * Hook para deletar um tipo de ativo
 */
export function useDeleteAssetType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => assetTypesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetTypeKeys.list() });
    },
  });
}
