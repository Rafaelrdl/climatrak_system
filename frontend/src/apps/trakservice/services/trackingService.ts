/**
 * TrakService Tracking Service
 * 
 * Service for GPS tracking operations.
 * 
 * Endpoints:
 * - GET /api/trakservice/tracking/locations/ - Current locations
 * - GET /api/trakservice/tracking/locations/{technician_id}/ - Technician location
 * - GET /api/trakservice/tracking/history/{technician_id}/ - Location history
 * - GET /api/trakservice/tracking/summary/ - Tracking summary
 */

import { api } from '@/lib/api';
import type {
  TechnicianLocation,
  TechnicianStatus,
  LocationHistory,
  TrackingFilters,
  TrackingSummary,
} from '../types';

// =============================================================================
// Query Keys Factory
// =============================================================================

export const trackingKeys = {
  all: ['trakservice', 'tracking'] as const,
  
  locations: () => [...trackingKeys.all, 'locations'] as const,
  locationList: () => [...trackingKeys.locations(), 'list'] as const,
  locationDetail: (technicianId: string) => 
    [...trackingKeys.locations(), 'detail', technicianId] as const,
  
  history: () => [...trackingKeys.all, 'history'] as const,
  historyByTechnician: (technicianId: string, filters?: TrackingFilters) =>
    [...trackingKeys.history(), technicianId, filters] as const,
  
  summary: () => [...trackingKeys.all, 'summary'] as const,
};

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get current locations of all active technicians
 */
export async function getCurrentLocations(): Promise<TechnicianLocation[]> {
  const response = await api.get<TechnicianLocation[]>(
    '/trakservice/tracking/locations/'
  );
  return response.data;
}

/**
 * Get current location of a specific technician
 */
export async function getTechnicianLocation(
  technicianId: string
): Promise<TechnicianLocation> {
  const response = await api.get<TechnicianLocation>(
    `/trakservice/tracking/locations/${technicianId}/`
  );
  return response.data;
}

/**
 * Get location history for a technician
 */
export async function getLocationHistory(
  technicianId: string,
  filters?: TrackingFilters
): Promise<LocationHistory> {
  const params = new URLSearchParams();
  
  if (filters?.date) {
    params.append('date', filters.date);
  }
  if (filters?.date_from) {
    params.append('date_from', filters.date_from);
  }
  if (filters?.date_to) {
    params.append('date_to', filters.date_to);
  }
  
  const response = await api.get<LocationHistory>(
    `/trakservice/tracking/history/${technicianId}/`,
    { params }
  );
  return response.data;
}

/**
 * Get tracking summary (active technicians, in field, etc.)
 */
export async function getTrackingSummary(): Promise<TrackingSummary> {
  const response = await api.get<TrackingSummary>(
    '/trakservice/tracking/summary/'
  );
  return response.data;
}

// =============================================================================
// Utility Functions
// =============================================================================

export function getStatusColor(status: TechnicianStatus): string {
  const colors: Record<TechnicianStatus, string> = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    moving: 'bg-blue-500',
    stationary: 'bg-yellow-500',
    at_site: 'bg-orange-500',
    inactive: 'bg-red-400',
  };
  return colors[status] || 'bg-gray-400';
}

export function getStatusLabel(status: TechnicianStatus): string {
  const labels: Record<TechnicianStatus, string> = {
    online: 'Online',
    offline: 'Offline',
    moving: 'Em Movimento',
    stationary: 'Parado',
    at_site: 'No Cliente',
    inactive: 'Inativo',
  };
  return labels[status] || status;
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}
