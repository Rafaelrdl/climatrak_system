/**
 * Hook para queries de Sites
 * 
 * Usa React Query para buscar e cachear dados de sites
 */

import { useQuery } from '@tanstack/react-query';
import { sitesService } from '../services/sitesService';
import { isUserAuthenticated } from '@/hooks/useAuth';
import type { SiteFilters } from '../types/site';

/**
 * Query hook para listar sites
 * 
 * Configurado com:
 * - Cache de 5 minutos (staleTime)
 * - Refetch automático ao focar janela
 */
export const useSitesQuery = (filters?: SiteFilters) => {
  return useQuery({
    queryKey: ['sites', filters],
    queryFn: () => sitesService.list(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: isUserAuthenticated(),
  });
};

/**
 * Query hook para buscar site por ID
 */
export const useSiteQuery = (siteId: number | null | undefined) => {
  return useQuery({
    queryKey: ['sites', siteId],
    queryFn: () => sitesService.getById(siteId!),
    enabled: !!siteId && isUserAuthenticated(),
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Query hook para estatísticas de um site
 */
export const useSiteStatsQuery = (siteId: number | null | undefined) => {
  return useQuery({
    queryKey: ['sites', siteId, 'stats'],
    queryFn: () => sitesService.getStats(siteId!),
    enabled: !!siteId && isUserAuthenticated(),
    staleTime: 1000 * 60, // 1 minuto
    refetchInterval: 1000 * 60, // Auto-refresh a cada 1 minuto
  });
};
