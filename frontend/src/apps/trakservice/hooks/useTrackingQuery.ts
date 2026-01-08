/**
 * TrakService Tracking Hooks
 * 
 * React Query hooks for tracking operations.
 */

import { useQuery } from '@tanstack/react-query';
import {
  trackingKeys,
  getCurrentLocations,
  getTechnicianLocation,
  getLocationHistory,
  getTrackingSummary,
} from '../services/trackingService';
import type { TrackingFilters } from '../types';

/**
 * Hook to get current locations of all active technicians
 */
export function useCurrentLocations() {
  return useQuery({
    queryKey: trackingKeys.locationList(),
    queryFn: getCurrentLocations,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook to get current location of a specific technician
 */
export function useTechnicianLocation(technicianId: string) {
  return useQuery({
    queryKey: trackingKeys.locationDetail(technicianId),
    queryFn: () => getTechnicianLocation(technicianId),
    enabled: !!technicianId,
    refetchInterval: 30000,
  });
}

/**
 * Hook to get location history for a technician
 */
export function useLocationHistory(
  technicianId: string,
  startDate?: string,
  endDate?: string
) {
  const filters: TrackingFilters | undefined = startDate || endDate 
    ? { date_from: startDate, date_to: endDate }
    : undefined;
    
  return useQuery({
    queryKey: trackingKeys.historyByTechnician(technicianId, filters),
    queryFn: () => getLocationHistory(technicianId, startDate, endDate),
    enabled: !!technicianId,
  });
}

/**
 * Hook to get tracking summary
 */
export function useTrackingSummary() {
  return useQuery({
    queryKey: trackingKeys.summary(),
    queryFn: getTrackingSummary,
    refetchInterval: 60000, // Refresh every minute
  });
}
