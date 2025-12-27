/**
 * Hooks para queries de Assets
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsService } from '../services/assetsService';
import { isUserAuthenticated } from '@/hooks/useAuth';
import type { AssetFilters, Asset } from '../types/asset';

/**
 * Query hook para listar assets
 */
export const useAssetsQuery = (filters: AssetFilters = {}) => {
  return useQuery({
    queryKey: ['monitor-assets', filters],
    queryFn: () => assetsService.getAllComplete(filters),
    staleTime: 1000 * 60 * 10, // 10 minutos
    enabled: isUserAuthenticated(),
  });
};

/**
 * Query hook para detalhes de um asset específico
 */
export const useAssetDetailsQuery = (assetId: number | null) => {
  return useQuery({
    queryKey: ['monitor-assets', assetId],
    queryFn: () => assetsService.getById(assetId!),
    enabled: !!assetId && isUserAuthenticated(),
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Query hook para sensores de um asset
 */
export const useAssetSensorsQuery = (assetId: number | null) => {
  return useQuery({
    queryKey: ['monitor-assets', assetId, 'sensors'],
    queryFn: () => assetsService.getSensors(assetId!),
    enabled: !!assetId && isUserAuthenticated(),
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Mutation hook para criar asset
 */
export const useCreateAssetMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: assetsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor-assets'] });
    },
  });
};

/**
 * Mutation hook para atualizar asset
 */
export const useUpdateAssetMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Asset> }) => 
      assetsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor-assets'] });
    },
  });
};

/**
 * Mutation hook para deletar asset
 */
export const useDeleteAssetMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: assetsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor-assets'] });
    },
  });
};
