import type { Solicitation } from '@/types';
import type { SolicitationFilters } from '@/components/SolicitationFilters';

export function filterSolicitations(
  solicitations: Solicitation[],
  filters: SolicitationFilters
): Solicitation[] {
  return solicitations.filter((solicitation) => {
    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(solicitation.status)) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange && (filters.dateRange.from || filters.dateRange.to)) {
      const solicitationDate = new Date(solicitation.created_at);
      
      if (filters.dateRange.from && solicitationDate < filters.dateRange.from) {
        return false;
      }
      
      if (filters.dateRange.to) {
        // Add 1 day to include the end date
        const toDate = new Date(filters.dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (solicitationDate > toDate) {
          return false;
        }
      }
    }

    // Equipment filter
    if (filters.equipment && solicitation.equipment_id !== filters.equipment) {
      return false;
    }

    // Location filter
    if (filters.location && solicitation.location_id !== filters.location) {
      return false;
    }

    // Requester filter
    if (filters.requester && solicitation.requester_user_id !== filters.requester) {
      return false;
    }

    return true;
  });
}

export function getFilterOptions(solicitations: Solicitation[]) {
  // Extract unique equipment options
  const equipmentOptions = Array.from(
    new Map(
      solicitations.map((s) => [s.equipment_id, { id: s.equipment_id, name: s.equipment_name }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Extract unique location options
  const locationOptions = Array.from(
    new Map(
      solicitations.map((s) => [s.location_id, { id: s.location_id, name: s.location_name }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Extract unique requester options
  const requesterOptions = Array.from(
    new Map(
      solicitations.map((s) => [s.requester_user_id, { id: s.requester_user_id, name: s.requester_user_name }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  return {
    equipmentOptions,
    locationOptions,
    requesterOptions
  };
}