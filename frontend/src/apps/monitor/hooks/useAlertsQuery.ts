/**
 * Hooks para queries de Alertas do módulo Monitor
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsService } from '../services/alertsService';
import { isUserAuthenticated } from '@/hooks/useAuth';
import type { AlertFilters, AcknowledgeAlertRequest, ResolveAlertRequest } from '../types/alert';

/**
 * Query hook para listar alertas
 */
export const useAlertsQuery = (filters: AlertFilters = {}) => {
  return useQuery({
    queryKey: ['monitor-alerts', filters],
    queryFn: async () => {
      const response = await alertsService.list(filters);
      return response.results || [];
    },
    staleTime: 1000 * 30, // 30 segundos (alertas precisam ser atualizados mais frequentemente)
    refetchInterval: 1000 * 60, // Refetch a cada 1 minuto
    enabled: isUserAuthenticated(),
  });
};

/**
 * Query hook para um alerta específico
 */
export const useAlertQuery = (alertId: number | null) => {
  return useQuery({
    queryKey: ['monitor-alerts', alertId],
    queryFn: () => alertsService.get(alertId!),
    enabled: !!alertId && isUserAuthenticated(),
  });
};

/**
 * Query hook para estatísticas de alertas
 */
export const useAlertsStatisticsQuery = () => {
  return useQuery({
    queryKey: ['monitor-alerts', 'statistics'],
    queryFn: alertsService.statistics,
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: 1000 * 60, // Refetch a cada 1 minuto
    enabled: isUserAuthenticated(),
  });
};

/**
 * Mutation hook para reconhecer um alerta
 */
export const useAcknowledgeAlertMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: AcknowledgeAlertRequest }) => 
      alertsService.acknowledge(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['monitor-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['monitor-alerts', variables.id] });
    },
  });
};

/**
 * Mutation hook para resolver um alerta
 */
export const useResolveAlertMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: ResolveAlertRequest }) => 
      alertsService.resolve(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['monitor-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['monitor-alerts', variables.id] });
    },
  });
};

/**
 * Mutation hook para vincular uma ordem de serviço a um alerta
 * Também reconhece o alerta automaticamente
 */
export const useLinkWorkOrderMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ alertId, workOrderId }: { alertId: number; workOrderId: number }) => 
      alertsService.linkWorkOrder(alertId, workOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor-alerts'] });
    },
  });
};

/**
 * Mutation hook para excluir um alerta
 */
export const useDeleteAlertMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => alertsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-notifications'] });
    },
  });
};
