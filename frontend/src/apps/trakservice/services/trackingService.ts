/**
 * TrakService Tracking Service
 * 
 * Service for GPS tracking operations.
 * 
 * Backend Endpoints:
 * - GET /api/trakservice/technicians/ - List technicians with location info
 * - GET /api/trakservice/technicians/{id}/location/latest/ - Last known location
 * - GET /api/trakservice/technicians/{id}/location/ - Location trail/history
 * - POST /api/trakservice/location/pings/ - Register location ping
 */

import { api } from '@/lib/api';
import type {
  TechnicianLocation,
  TechnicianStatus,
  LocationHistory,
  LocationPing,
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
// Types for API responses
// =============================================================================

interface TechnicianWithLocation {
  id: string;
  full_name: string;
  phone?: string;
  specialties?: string[];
  is_active: boolean;
  current_latitude?: number;
  current_longitude?: number;
  last_location_update?: string;
  current_assignment_id?: string;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get current locations of all active technicians
 * Uses the technicians endpoint with location data
 */
export async function getCurrentLocations(): Promise<TechnicianLocation[]> {
  const response = await api.get<{ results: TechnicianWithLocation[] } | TechnicianWithLocation[]>(
    '/trakservice/technicians/',
    { params: { is_active: true } }
  );
  
  // Handle both paginated and non-paginated responses
  const technicians = Array.isArray(response.data) 
    ? response.data 
    : response.data.results || [];
  
  // Transform to TechnicianLocation format
  return technicians
    .filter(t => t.current_latitude && t.current_longitude)
    .map(t => ({
      technician_id: t.id,
      technician_name: t.full_name,
      status: determineStatus(t),
      latitude: t.current_latitude!,
      longitude: t.current_longitude!,
      last_seen_at: t.last_location_update || new Date().toISOString(),
      last_known_address: undefined,
      vehicle_plate: undefined,
      battery_level: undefined,
      accuracy: undefined,
    }));
}

/**
 * Determine technician status based on data
 */
function determineStatus(tech: TechnicianWithLocation): TechnicianStatus {
  if (!tech.is_active) return 'inactive';
  if (!tech.last_location_update) return 'offline';
  
  const lastUpdate = new Date(tech.last_location_update);
  const now = new Date();
  const minutesAgo = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
  
  if (minutesAgo > 15) return 'offline';
  if (tech.current_assignment_id) return 'at_site';
  return 'online';
}

/**
 * Get current location of a specific technician
 */
export async function getTechnicianLocation(
  technicianId: string
): Promise<TechnicianLocation> {
  const response = await api.get<{
    latitude: number;
    longitude: number;
    recorded_at: string;
    accuracy?: number;
  }>(
    `/trakservice/technicians/${technicianId}/location/latest/`
  );
  
  const data = response.data;
  return {
    technician_id: technicianId,
    technician_name: '', // Will be filled by caller if needed
    status: 'online',
    latitude: data.latitude,
    longitude: data.longitude,
    last_seen_at: data.recorded_at,
    accuracy: data.accuracy,
  };
}

/**
 * Get location history for a technician
 */
export async function getLocationHistory(
  technicianId: string,
  startDate?: string,
  endDate?: string
): Promise<LocationHistory> {
  const params = new URLSearchParams();
  
  if (startDate) {
    params.append('start_date', startDate);
  }
  if (endDate) {
    params.append('end_date', endDate);
  }
  
  const response = await api.get<LocationPing[] | { results: LocationPing[] }>(
    `/trakservice/technicians/${technicianId}/location/`,
    { params }
  );
  
  const pings = Array.isArray(response.data)
    ? response.data
    : response.data.results || [];
  
  // Calculate total distance from pings
  let totalDistance = 0;
  for (let i = 1; i < pings.length; i++) {
    totalDistance += haversineDistance(
      pings[i-1].latitude, pings[i-1].longitude,
      pings[i].latitude, pings[i].longitude
    );
  }
  
  return {
    technician_id: technicianId,
    technician_name: '',
    date: startDate || new Date().toISOString().split('T')[0],
    pings,
    total_distance_km: totalDistance,
  };
}

/**
 * Calculate distance between two points using Haversine formula
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Get tracking summary (computed from technicians list)
 */
export async function getTrackingSummary(): Promise<TrackingSummary> {
  const locations = await getCurrentLocations();
  
  const onlineCount = locations.filter(l => l.status === 'online' || l.status === 'moving').length;
  const atSiteCount = locations.filter(l => l.status === 'at_site').length;
  const offlineCount = locations.filter(l => l.status === 'offline' || l.status === 'inactive').length;
  
  return {
    total_technicians: locations.length + offlineCount,
    online: onlineCount,
    in_field: atSiteCount,
    offline: offlineCount,
    last_updated: new Date().toISOString(),
  };
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
