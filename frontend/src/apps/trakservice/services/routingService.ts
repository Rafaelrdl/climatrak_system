/**
 * TrakService Routing Service
 * 
 * Service for route optimization and daily routes.
 * 
 * Endpoints:
 * - GET /api/trakservice/routes/ - List daily routes
 * - GET /api/trakservice/routes/{id}/ - Route details
 * - POST /api/trakservice/routes/optimize/ - Optimize route
 * - POST /api/trakservice/routes/{id}/start/ - Start route
 * - POST /api/trakservice/routes/{id}/complete/ - Complete route
 * - GET /api/trakservice/km/summary/ - KM summary
 * - GET /api/trakservice/km/report/ - KM report
 */

import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types/api';
import type {
  DailyRoute,
  RouteStop,
  RouteOptimizeInput,
  RouteFilters,
  RouteStatus,
  KmSummary,
  KmReport,
  KmFilters,
} from '../types';

// =============================================================================
// Query Keys Factory
// =============================================================================

export const routingKeys = {
  all: ['trakservice', 'routing'] as const,
  
  routes: () => [...routingKeys.all, 'routes'] as const,
  routeList: (filters?: RouteFilters) => 
    [...routingKeys.routes(), 'list', filters] as const,
  routeDetail: (id: string) => 
    [...routingKeys.routes(), 'detail', id] as const,
  routeByTechnician: (technicianId: string, date: string) =>
    [...routingKeys.routes(), 'by-technician', technicianId, date] as const,
  
  km: () => [...routingKeys.all, 'km'] as const,
  kmSummary: (technicianId: string, date: string) =>
    [...routingKeys.km(), 'summary', technicianId, date] as const,
  kmReport: (filters: KmFilters) =>
    [...routingKeys.km(), 'report', filters] as const,
};

// =============================================================================
// Route API Functions
// =============================================================================

/**
 * List daily routes with optional filters
 */
export async function getRoutes(
  filters?: RouteFilters
): Promise<PaginatedResponse<DailyRoute>> {
  const params = new URLSearchParams();
  
  if (filters?.technician_id) {
    params.append('technician_id', filters.technician_id);
  }
  if (filters?.date) {
    params.append('date', filters.date);
  }
  if (filters?.date_from) {
    params.append('date_from', filters.date_from);
  }
  if (filters?.date_to) {
    params.append('date_to', filters.date_to);
  }
  if (filters?.status) {
    params.append('status', filters.status);
  }
  
  const response = await api.get<PaginatedResponse<DailyRoute>>(
    '/trakservice/routes/',
    { params }
  );
  return response.data;
}

/**
 * Get a single route by ID
 */
export async function getRoute(id: string): Promise<DailyRoute> {
  const response = await api.get<DailyRoute>(
    `/trakservice/routes/${id}/`
  );
  return response.data;
}

/**
 * Get route for a technician on a specific date
 */
export async function getRouteByTechnician(
  technicianId: string,
  date: string
): Promise<DailyRoute | null> {
  try {
    const response = await api.get<DailyRoute>(
      `/trakservice/routes/by-technician/${technicianId}/`,
      { params: { date } }
    );
    return response.data;
  } catch {
    return null;
  }
}

/**
 * Optimize route for a technician
 */
export async function optimizeRoute(
  data: RouteOptimizeInput
): Promise<DailyRoute> {
  const response = await api.post<DailyRoute>(
    '/trakservice/routes/optimize/',
    data
  );
  return response.data;
}

/**
 * Start a route
 */
export async function startRoute(id: string): Promise<DailyRoute> {
  const response = await api.post<DailyRoute>(
    `/trakservice/routes/${id}/start/`
  );
  return response.data;
}

/**
 * Complete a route
 */
export async function completeRoute(id: string): Promise<DailyRoute> {
  const response = await api.post<DailyRoute>(
    `/trakservice/routes/${id}/complete/`
  );
  return response.data;
}

/**
 * Update stop status
 */
export async function updateStopStatus(
  routeId: string,
  stopId: string,
  status: RouteStop['status']
): Promise<RouteStop> {
  const response = await api.post<RouteStop>(
    `/trakservice/routes/${routeId}/stops/${stopId}/status/`,
    { status }
  );
  return response.data;
}

// =============================================================================
// KM API Functions
// =============================================================================

/**
 * Get KM summary for a technician on a specific date
 * Backend: GET /api/trakservice/km/?date=YYYY-MM-DD&technician_id=uuid
 */
export async function getKmSummary(
  technicianId: string,
  date: string
): Promise<KmSummary> {
  const response = await api.get<{
    date: string;
    technician_id: string;
    technician_name: string;
    estimated_km: number;
    actual_km: number;
    variance_km: number;
    variance_percent: number;
    routes_count: number;
  }>(
    '/trakservice/km/',
    { params: { date, technician_id: technicianId } }
  );
  
  const data = response.data;
  return {
    total_km_reported: data.estimated_km,
    total_km_tracked: data.actual_km,
    total_cost: data.estimated_km * 1.2, // R$ 1.20/km default
    average_per_technician: data.estimated_km,
    total_routes: data.routes_count,
    variance_percent: data.variance_percent,
  };
}

/**
 * Get KM report for a period
 * Uses routes data since there's no dedicated report endpoint
 */
export async function getKmReport(filters: KmFilters): Promise<KmReport[]> {
  // Use routes endpoint to get KM data
  const params: Record<string, string> = {};
  
  if (filters.date_from) {
    params.date_from = filters.date_from;
  }
  if (filters.date_to) {
    params.date_to = filters.date_to;
  }
  if (filters.technician_id) {
    params.technician_id = filters.technician_id;
  }
  
  const response = await api.get<{ results: DailyRoute[] } | DailyRoute[]>(
    '/trakservice/routes/',
    { params }
  );
  
  const routes = Array.isArray(response.data) 
    ? response.data 
    : response.data.results || [];
  
  // Aggregate by technician
  const technicianMap = new Map<string, {
    technician_id: string;
    technician_name: string;
    total_routes: number;
    km_reported: number;
    km_tracked: number;
  }>();
  
  for (const route of routes) {
    const existing = technicianMap.get(route.technician_id);
    if (existing) {
      existing.total_routes += 1;
      existing.km_reported += route.estimated_km || route.total_distance || 0;
      existing.km_tracked += route.actual_km || route.estimated_km || route.total_distance || 0;
    } else {
      technicianMap.set(route.technician_id, {
        technician_id: route.technician_id,
        technician_name: route.technician_name || 'Técnico',
        total_routes: 1,
        km_reported: route.estimated_km || route.total_distance || 0,
        km_tracked: route.actual_km || route.estimated_km || route.total_distance || 0,
      });
    }
  }
  
  return Array.from(technicianMap.values());
}

// =============================================================================
// Utility Functions
// =============================================================================

export function getRouteStatusConfig(status: RouteStatus) {
  const configs = {
    draft: {
      label: 'Rascunho',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    optimized: {
      label: 'Otimizada',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    in_progress: {
      label: 'Em Andamento',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    completed: {
      label: 'Concluída',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  };
  return configs[status] || configs.draft;
}

export function getStopStatusConfig(status: RouteStop['status']) {
  const configs = {
    pending: {
      label: 'Pendente',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    arrived: {
      label: 'Chegou',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    completed: {
      label: 'Concluído',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    skipped: {
      label: 'Pulado',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  };
  return configs[status] || configs.pending;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

export function formatKm(km: number): string {
  return `${km.toFixed(1)} km`;
}

export function calculateKmDifferenceClass(percentDiff: number): { bg: string; text: string } {
  const absDiff = Math.abs(percentDiff);
  if (absDiff > 20) {
    return { bg: 'bg-red-100', text: 'text-red-700' };
  }
  if (absDiff > 10) {
    return { bg: 'bg-orange-100', text: 'text-orange-700' };
  }
  if (absDiff > 5) {
    return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
  }
  return { bg: 'bg-green-100', text: 'text-green-700' };
}
