/**
 * React Query Hooks para Métricas
 * 
 * Hooks para gerenciamento de dados de métricas e indicadores de desempenho.
 */

import { useQuery } from '@tanstack/react-query';
import { metricsService } from '@/services/metricsService';
import { isUserAuthenticated } from '@/hooks/useAuth';
import type { MetricFilter } from '@/types/metrics';

// ============================================
// Query Keys
// ============================================

export const metricKeys = {
  all: ['metrics'] as const,
  kpis: (filters?: MetricFilter) => [...metricKeys.all, 'kpis', filters] as const,
  trend: (metric: string, filters?: MetricFilter) => [...metricKeys.all, 'trend', metric, filters] as const,
  distribution: (filters?: MetricFilter) => [...metricKeys.all, 'distribution', filters] as const,
  health: (filters?: MetricFilter) => [...metricKeys.all, 'equipment-health', filters] as const,
  predictions: (equipmentId?: string) => [...metricKeys.all, 'predictions', equipmentId] as const,
  anomalies: (filters?: MetricFilter) => [...metricKeys.all, 'anomalies', filters] as const,
  team: (filters?: MetricFilter) => [...metricKeys.all, 'team-performance', filters] as const,
  costs: (filters?: MetricFilter) => [...metricKeys.all, 'costs', filters] as const,
  sla: (filters?: MetricFilter) => [...metricKeys.all, 'sla', filters] as const,
  heatmap: (type: string, filters?: MetricFilter) => [...metricKeys.all, 'heatmap', type, filters] as const,
};

// ============================================
// Query Hooks
// ============================================

/**
 * Hook para KPIs principais
 */
export function useKPIs(filters?: MetricFilter) {
  return useQuery({
    queryKey: metricKeys.kpis(filters),
    queryFn: () => metricsService.getKPIs(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchInterval: 1000 * 60 * 5,
    enabled: isUserAuthenticated(),
  });
}

/**
 * Hook para tendências de uma métrica específica
 */
export function useTrend(filters?: MetricFilter, metric?: string) {
  return useQuery({
    queryKey: metricKeys.trend(metric || 'mttr', filters),
    queryFn: () => metricsService.getTrend(metric || 'mttr', filters),
    staleTime: 1000 * 60 * 10,
    enabled: isUserAuthenticated() && !!metric,
  });
}

/**
 * Hook para múltiplas tendências
 */
export function useMultipleTrends(metrics: string[], filters?: MetricFilter) {
  return useQuery({
    queryKey: [...metricKeys.all, 'trends-multiple', metrics, filters],
    queryFn: async () => {
      const results = await Promise.all(
        metrics.map(metric => metricsService.getTrend(metric, filters))
      );
      return results;
    },
    staleTime: 1000 * 60 * 10,
    enabled: isUserAuthenticated() && metrics.length > 0,
  });
}

/**
 * Hook para distribuição de ordens de serviço
 */
export function useWorkOrderDistribution(filters?: MetricFilter) {
  return useQuery({
    queryKey: metricKeys.distribution(filters),
    queryFn: () => metricsService.getWorkOrderDistribution(filters),
    staleTime: 1000 * 60 * 10,
    enabled: isUserAuthenticated(),
  });
}

/**
 * Hook para health score dos equipamentos
 */
export function useEquipmentHealth(filters?: MetricFilter) {
  return useQuery({
    queryKey: metricKeys.health(filters),
    queryFn: () => metricsService.getEquipmentHealth(filters),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
    enabled: isUserAuthenticated(),
  });
}

/**
 * Hook para previsões de ML
 */
export function useMLPredictions(filters?: MetricFilter) {
  return useQuery({
    queryKey: metricKeys.predictions(),
    queryFn: () => metricsService.getMLPredictions(),
    staleTime: 1000 * 60 * 30,
    enabled: isUserAuthenticated(),
  });
}

/**
 * Hook para anomalias detectadas
 */
export function useAnomalies(filters?: MetricFilter) {
  return useQuery({
    queryKey: metricKeys.anomalies(filters),
    queryFn: () => metricsService.getAnomalies(filters),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 2,
    enabled: isUserAuthenticated(),
  });
}

/**
 * Hook para performance da equipe
 */
export function useTeamPerformance(filters?: MetricFilter) {
  return useQuery({
    queryKey: metricKeys.team(filters),
    queryFn: () => metricsService.getTeamPerformance(filters),
    staleTime: 1000 * 60 * 15,
    enabled: isUserAuthenticated(),
  });
}

/**
 * Hook para métricas de custo
 */
export function useCostMetrics(filters?: MetricFilter) {
  return useQuery({
    queryKey: metricKeys.costs(filters),
    queryFn: () => metricsService.getCostMetrics(filters),
    staleTime: 1000 * 60 * 30,
    enabled: isUserAuthenticated(),
  });
}

/**
 * Hook para métricas de SLA
 */
export function useSLAMetrics(filters?: MetricFilter) {
  return useQuery({
    queryKey: metricKeys.sla(filters),
    queryFn: () => metricsService.getSLAMetrics(filters),
    staleTime: 1000 * 60 * 10,
    enabled: isUserAuthenticated(),
  });
}

/**
 * Hook para dados de heatmap
 */
export function useHeatmapData(filters?: MetricFilter) {
  return useQuery({
    queryKey: metricKeys.heatmap('failures', filters),
    queryFn: () => metricsService.getHeatmapData('failures', filters),
    staleTime: 1000 * 60 * 15,
    enabled: isUserAuthenticated(),
  });
}
