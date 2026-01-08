/**
 * TrakService Dispatch Query Hooks
 * 
 * React Query hooks for technician profiles and service assignments.
 * Provides:
 * - Automatic caching
 * - Smart refetching
 * - Optimistic updates
 * - Query invalidation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isUserAuthenticated } from '@/hooks/useAuth';
import {
  dispatchKeys,
  getTechnicians,
  getActiveTechnicians,
  getTechnician,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  updateAssignmentStatus,
  getTodayAssignments,
  getWeekAssignments,
  getTechnicianAssignments,
} from '../services/dispatchService';
import type {
  TechnicianFilters,
  TechnicianCreateInput,
  AssignmentFilters,
  AssignmentCreateInput,
  AssignmentUpdateInput,
  AssignmentStatusInput,
} from '../types';

// =============================================================================
// Technician Query Hooks
// =============================================================================

/**
 * List technician profiles with optional filters
 */
export function useTechnicians(filters?: TechnicianFilters) {
  return useQuery({
    queryKey: dispatchKeys.technicianList(filters),
    queryFn: () => getTechnicians(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: isUserAuthenticated(),
  });
}

/**
 * Get active technicians (for dropdowns)
 */
export function useActiveTechnicians() {
  return useQuery({
    queryKey: dispatchKeys.technicianActive(),
    queryFn: getActiveTechnicians,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: isUserAuthenticated(),
  });
}

/**
 * Get a single technician profile
 */
export function useTechnician(id: string | null | undefined) {
  return useQuery({
    queryKey: dispatchKeys.technicianDetail(id!),
    queryFn: () => getTechnician(id!),
    enabled: !!id && isUserAuthenticated(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Create a new technician profile
 */
export function useCreateTechnician() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: TechnicianCreateInput) => createTechnician(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dispatchKeys.technicians() });
    },
  });
}

/**
 * Update a technician profile
 */
export function useUpdateTechnician() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TechnicianCreateInput> }) =>
      updateTechnician(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dispatchKeys.technicians() });
      queryClient.setQueryData(dispatchKeys.technicianDetail(data.id), data);
    },
  });
}

/**
 * Delete a technician profile
 */
export function useDeleteTechnician() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteTechnician(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dispatchKeys.technicians() });
    },
  });
}

// =============================================================================
// Assignment Query Hooks
// =============================================================================

/**
 * List service assignments with optional filters
 */
export function useAssignments(filters?: AssignmentFilters) {
  return useQuery({
    queryKey: dispatchKeys.assignmentList(filters),
    queryFn: () => getAssignments(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes (more dynamic data)
    enabled: isUserAuthenticated(),
  });
}

/**
 * Get a single service assignment
 */
export function useAssignment(id: string | null | undefined) {
  return useQuery({
    queryKey: dispatchKeys.assignmentDetail(id!),
    queryFn: () => getAssignment(id!),
    enabled: !!id && isUserAuthenticated(),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Get today's assignments
 */
export function useTodayAssignments() {
  return useQuery({
    queryKey: dispatchKeys.assignmentToday(),
    queryFn: getTodayAssignments,
    staleTime: 1000 * 60 * 2,
    enabled: isUserAuthenticated(),
  });
}

/**
 * Get this week's assignments
 */
export function useWeekAssignments() {
  return useQuery({
    queryKey: dispatchKeys.assignmentWeek(),
    queryFn: getWeekAssignments,
    staleTime: 1000 * 60 * 2,
    enabled: isUserAuthenticated(),
  });
}

/**
 * Get assignments for a specific technician
 */
export function useTechnicianAssignments(
  technicianId: string | null | undefined,
  filters?: AssignmentFilters
) {
  return useQuery({
    queryKey: dispatchKeys.assignmentByTechnician(technicianId!, filters),
    queryFn: () => getTechnicianAssignments(technicianId!, filters),
    enabled: !!technicianId && isUserAuthenticated(),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Create a new service assignment
 */
export function useCreateAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: AssignmentCreateInput) => createAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dispatchKeys.assignments() });
    },
  });
}

/**
 * Update a service assignment
 */
export function useUpdateAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignmentUpdateInput }) =>
      updateAssignment(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dispatchKeys.assignments() });
      queryClient.setQueryData(dispatchKeys.assignmentDetail(data.id), data);
    },
  });
}

/**
 * Delete a service assignment
 */
export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dispatchKeys.assignments() });
    },
  });
}

/**
 * Update assignment status
 */
export function useUpdateAssignmentStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignmentStatusInput }) =>
      updateAssignmentStatus(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dispatchKeys.assignments() });
      queryClient.setQueryData(dispatchKeys.assignmentDetail(data.id), data);
    },
  });
}
