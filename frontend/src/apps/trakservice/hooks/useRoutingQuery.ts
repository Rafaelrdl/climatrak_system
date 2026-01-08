/**
 * TrakService Routing Hooks
 * 
 * React Query hooks for routing and KM operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  routingKeys,
  getRoutes,
  getRoute,
  getRouteByTechnician,
  optimizeRoute,
  startRoute,
  completeRoute,
  updateStopStatus,
  getKmSummary,
  getKmReport,
} from '../services/routingService';
import type { RouteFilters, RouteOptimizeInput, RouteStop, KmFilters } from '../types';

// =============================================================================
// Route Queries
// =============================================================================

/**
 * Hook to list routes with filters
 */
export function useRoutes(filters?: RouteFilters) {
  return useQuery({
    queryKey: routingKeys.routeList(filters),
    queryFn: () => getRoutes(filters),
  });
}

/**
 * Hook to get a single route
 */
export function useRoute(id: string) {
  return useQuery({
    queryKey: routingKeys.routeDetail(id),
    queryFn: () => getRoute(id),
    enabled: !!id,
  });
}

/**
 * Hook to get route for a technician on a specific date
 */
export function useRouteByTechnician(technicianId: string, date: string) {
  return useQuery({
    queryKey: routingKeys.routeByTechnician(technicianId, date),
    queryFn: () => getRouteByTechnician(technicianId, date),
    enabled: !!technicianId && !!date,
  });
}

// =============================================================================
// Route Mutations
// =============================================================================

/**
 * Hook to optimize a route
 */
export function useOptimizeRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: RouteOptimizeInput) => optimizeRoute(data),
    onSuccess: (data) => {
      toast.success('Rota otimizada com sucesso');
      queryClient.invalidateQueries({ queryKey: routingKeys.routes() });
      queryClient.setQueryData(routingKeys.routeDetail(data.id), data);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao otimizar rota: ${error.message}`);
    },
  });
}

/**
 * Hook to start a route
 */
export function useStartRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => startRoute(id),
    onSuccess: (data) => {
      toast.success('Rota iniciada');
      queryClient.invalidateQueries({ queryKey: routingKeys.routes() });
      queryClient.setQueryData(routingKeys.routeDetail(data.id), data);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao iniciar rota: ${error.message}`);
    },
  });
}

/**
 * Hook to complete a route
 */
export function useCompleteRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => completeRoute(id),
    onSuccess: (data) => {
      toast.success('Rota concluída');
      queryClient.invalidateQueries({ queryKey: routingKeys.routes() });
      queryClient.setQueryData(routingKeys.routeDetail(data.id), data);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao concluir rota: ${error.message}`);
    },
  });
}

/**
 * Hook to update stop status
 */
export function useUpdateStopStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ routeId, stopId, status }: { 
      routeId: string; 
      stopId: string; 
      status: RouteStop['status'];
    }) => updateStopStatus(routeId, stopId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: routingKeys.routeDetail(variables.routeId) 
      });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar parada: ${error.message}`);
    },
  });
}

// =============================================================================
// KM Queries
// =============================================================================

/**
 * Hook to get KM summary for a technician
 */
export function useKmSummary(technicianId: string, date: string) {
  return useQuery({
    queryKey: routingKeys.kmSummary(technicianId, date),
    queryFn: () => getKmSummary(technicianId, date),
    enabled: !!technicianId && !!date,
  });
}

/**
 * Hook to get KM report
 */
export function useKmReport(filters: KmFilters) {
  return useQuery({
    queryKey: routingKeys.kmReport(filters),
    queryFn: () => getKmReport(filters),
    enabled: !!filters.date_from && !!filters.date_to,
  });
}
