/**
 * TrakService Dispatch Service
 * 
 * Service for managing technician profiles and service assignments.
 * Integrates with Django REST Framework backend.
 * 
 * Endpoints:
 * - GET/POST /api/trakservice/technicians/ - List/Create technicians
 * - GET /api/trakservice/technicians/{id}/ - Technician details
 * - PATCH/DELETE /api/trakservice/technicians/{id}/ - Update/Delete
 * - GET /api/trakservice/technicians/active/ - Active technicians only
 * - GET/POST /api/trakservice/assignments/ - List/Create assignments
 * - GET /api/trakservice/assignments/{id}/ - Assignment details
 * - PATCH /api/trakservice/assignments/{id}/ - Update assignment
 * - POST /api/trakservice/assignments/{id}/status/ - Change status
 * - GET /api/trakservice/assignments/today/ - Today's assignments
 * - GET /api/trakservice/assignments/week/ - This week's assignments
 */

import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types/api';
import type {
  TechnicianProfile,
  TechnicianListItem,
  TechnicianCreateInput,
  TechnicianFilters,
  ServiceAssignment,
  AssignmentCreateInput,
  AssignmentUpdateInput,
  AssignmentStatusInput,
  AssignmentFilters,
  AssignmentStatus,
  DailySummary,
} from '../types';

// =============================================================================
// Query Keys Factory
// =============================================================================

export const dispatchKeys = {
  all: ['trakservice', 'dispatch'] as const,
  
  // Technicians
  technicians: () => [...dispatchKeys.all, 'technicians'] as const,
  technicianList: (filters?: TechnicianFilters) => 
    [...dispatchKeys.technicians(), 'list', filters] as const,
  technicianActive: () => [...dispatchKeys.technicians(), 'active'] as const,
  technicianDetail: (id: string) => 
    [...dispatchKeys.technicians(), 'detail', id] as const,
  
  // Assignments
  assignments: () => [...dispatchKeys.all, 'assignments'] as const,
  assignmentList: (filters?: AssignmentFilters) => 
    [...dispatchKeys.assignments(), 'list', filters] as const,
  assignmentDetail: (id: string) => 
    [...dispatchKeys.assignments(), 'detail', id] as const,
  assignmentToday: () => [...dispatchKeys.assignments(), 'today'] as const,
  assignmentWeek: () => [...dispatchKeys.assignments(), 'week'] as const,
  assignmentByTechnician: (technicianId: string, filters?: AssignmentFilters) =>
    [...dispatchKeys.assignments(), 'by-technician', technicianId, filters] as const,
};

// =============================================================================
// Technician API Functions
// =============================================================================

/**
 * List all technician profiles with optional filters
 */
export async function getTechnicians(
  filters?: TechnicianFilters
): Promise<PaginatedResponse<TechnicianProfile>> {
  const params = new URLSearchParams();
  
  if (filters?.is_active !== undefined) {
    params.append('is_active', String(filters.is_active));
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }
  
  const response = await api.get<PaginatedResponse<TechnicianProfile>>(
    '/trakservice/technicians/',
    { params }
  );
  return response.data;
}

/**
 * Get only active technicians (for dropdowns)
 */
export async function getActiveTechnicians(): Promise<TechnicianListItem[]> {
  const response = await api.get<TechnicianListItem[]>(
    '/trakservice/technicians/active/'
  );
  return response.data;
}

/**
 * Get a single technician profile by ID
 */
export async function getTechnician(id: string): Promise<TechnicianProfile> {
  const response = await api.get<TechnicianProfile>(
    `/trakservice/technicians/${id}/`
  );
  return response.data;
}

/**
 * Create a new technician profile
 */
export async function createTechnician(
  data: TechnicianCreateInput
): Promise<TechnicianProfile> {
  const response = await api.post<TechnicianProfile>(
    '/trakservice/technicians/',
    data
  );
  return response.data;
}

/**
 * Update an existing technician profile
 */
export async function updateTechnician(
  id: string,
  data: Partial<TechnicianCreateInput>
): Promise<TechnicianProfile> {
  const response = await api.patch<TechnicianProfile>(
    `/trakservice/technicians/${id}/`,
    data
  );
  return response.data;
}

/**
 * Delete a technician profile
 */
export async function deleteTechnician(id: string): Promise<void> {
  await api.delete(`/trakservice/technicians/${id}/`);
}

// =============================================================================
// Assignment API Functions
// =============================================================================

/**
 * Build query params for assignment filters
 */
function buildAssignmentParams(filters?: AssignmentFilters): URLSearchParams {
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
  if (filters?.technician_id) {
    params.append('technician_id', filters.technician_id);
  }
  if (filters?.work_order_id) {
    params.append('work_order_id', String(filters.work_order_id));
  }
  if (filters?.status) {
    const statuses = Array.isArray(filters.status) 
      ? filters.status 
      : [filters.status];
    statuses.forEach(s => params.append('status', s));
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }
  
  return params;
}

/**
 * List service assignments with optional filters
 */
export async function getAssignments(
  filters?: AssignmentFilters
): Promise<PaginatedResponse<ServiceAssignment>> {
  const params = buildAssignmentParams(filters);
  
  const response = await api.get<PaginatedResponse<ServiceAssignment>>(
    '/trakservice/assignments/',
    { params }
  );
  return response.data;
}

/**
 * Get a single service assignment by ID
 */
export async function getAssignment(id: string): Promise<ServiceAssignment> {
  const response = await api.get<ServiceAssignment>(
    `/trakservice/assignments/${id}/`
  );
  return response.data;
}

/**
 * Create a new service assignment
 */
export async function createAssignment(
  data: AssignmentCreateInput
): Promise<ServiceAssignment> {
  const response = await api.post<ServiceAssignment>(
    '/trakservice/assignments/',
    data
  );
  return response.data;
}

/**
 * Update an existing service assignment
 */
export async function updateAssignment(
  id: string,
  data: AssignmentUpdateInput
): Promise<ServiceAssignment> {
  const response = await api.patch<ServiceAssignment>(
    `/trakservice/assignments/${id}/`,
    data
  );
  return response.data;
}

/**
 * Delete a service assignment
 */
export async function deleteAssignment(id: string): Promise<void> {
  await api.delete(`/trakservice/assignments/${id}/`);
}

/**
 * Change assignment status
 */
export async function updateAssignmentStatus(
  id: string,
  data: AssignmentStatusInput
): Promise<ServiceAssignment> {
  const response = await api.post<ServiceAssignment>(
    `/trakservice/assignments/${id}/status/`,
    data
  );
  return response.data;
}

/**
 * Get today's assignments
 */
export async function getTodayAssignments(): Promise<ServiceAssignment[]> {
  const response = await api.get<ServiceAssignment[]>(
    '/trakservice/assignments/today/'
  );
  return response.data;
}

/**
 * Get this week's assignments
 */
export async function getWeekAssignments(): Promise<ServiceAssignment[]> {
  const response = await api.get<ServiceAssignment[]>(
    '/trakservice/assignments/week/'
  );
  return response.data;
}

/**
 * Get assignments for a specific technician
 */
export async function getTechnicianAssignments(
  technicianId: string,
  filters?: AssignmentFilters
): Promise<PaginatedResponse<ServiceAssignment>> {
  const params = buildAssignmentParams(filters);
  
  const response = await api.get<PaginatedResponse<ServiceAssignment>>(
    `/trakservice/assignments/by-technician/${technicianId}/`,
    { params }
  );
  return response.data;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get status display configuration
 */
export function getStatusConfig(status: AssignmentStatus): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
} {
  const configs: Record<AssignmentStatus, ReturnType<typeof getStatusConfig>> = {
    scheduled: {
      label: 'Agendado',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      icon: 'Calendar',
    },
    en_route: {
      label: 'A Caminho',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      icon: 'Car',
    },
    on_site: {
      label: 'No Local',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      icon: 'MapPin',
    },
    done: {
      label: 'Concluído',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: 'CheckCircle',
    },
    canceled: {
      label: 'Cancelado',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      icon: 'XCircle',
    },
  };
  
  return configs[status];
}

/**
 * Get all status options for filters
 */
export function getStatusOptions(): { value: AssignmentStatus; label: string }[] {
  return [
    { value: 'scheduled', label: 'Agendado' },
    { value: 'en_route', label: 'A Caminho' },
    { value: 'on_site', label: 'No Local' },
    { value: 'done', label: 'Concluído' },
    { value: 'canceled', label: 'Cancelado' },
  ];
}

/**
 * Get valid next statuses for a given status
 */
export function getNextStatuses(
  currentStatus: AssignmentStatus
): AssignmentStatus[] {
  const transitions: Record<AssignmentStatus, AssignmentStatus[]> = {
    scheduled: ['en_route', 'canceled'],
    en_route: ['on_site', 'canceled'],
    on_site: ['done', 'canceled'],
    done: [],
    canceled: [],
  };
  
  return transitions[currentStatus];
}

/**
 * Format date for display
 */
export function formatScheduledDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Format time for display
 */
export function formatTime(time: string | null): string {
  if (!time) return '--:--';
  
  // If it's a full datetime, extract time
  if (time.includes('T')) {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(time));
  }
  
  // If it's just time (HH:MM:SS), format it
  return time.slice(0, 5);
}

/**
 * Calculate summary from assignments list
 */
export function calculateSummary(assignments: ServiceAssignment[]): DailySummary {
  return assignments.reduce(
    (acc, a) => {
      acc.total++;
      acc[a.status]++;
      return acc;
    },
    {
      total: 0,
      scheduled: 0,
      en_route: 0,
      on_site: 0,
      done: 0,
      canceled: 0,
    }
  );
}
