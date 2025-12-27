/**
 * React Query Hooks para Locations (Empresas, Setores, Subsetores)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationsService } from '@/services/locationsService';
import { isUserAuthenticated } from '@/hooks/useAuth';
import type { Company, Sector, SubSection } from '@/types';

// ============================================
// Query Keys
// ============================================

export const locationKeys = {
  all: ['locations'] as const,
  
  // Companies
  companies: () => [...locationKeys.all, 'companies'] as const,
  companiesList: () => [...locationKeys.companies(), 'list'] as const,
  companyDetail: (id: string) => [...locationKeys.companies(), 'detail', id] as const,
  
  // Sectors
  sectors: () => [...locationKeys.all, 'sectors'] as const,
  sectorsList: (companyId?: string) => [...locationKeys.sectors(), 'list', companyId] as const,
  sectorDetail: (id: string) => [...locationKeys.sectors(), 'detail', id] as const,
  
  // Subsections
  subsections: () => [...locationKeys.all, 'subsections'] as const,
  subsectionsList: (sectorId?: string) => [...locationKeys.subsections(), 'list', sectorId] as const,
  subsectionDetail: (id: string) => [...locationKeys.subsections(), 'detail', id] as const,
  
  // Tree & Counts
  tree: () => [...locationKeys.all, 'tree'] as const,
  counts: () => [...locationKeys.all, 'counts'] as const,
};

// ============================================
// Company Hooks
// ============================================

export function useCompanies() {
  return useQuery({
    queryKey: locationKeys.companiesList(),
    queryFn: () => locationsService.getCompanies(),
    staleTime: 1000 * 60 * 10, // 10 minutos
    enabled: isUserAuthenticated(),
  });
}

export function useCompany(id: string | null | undefined) {
  return useQuery({
    queryKey: locationKeys.companyDetail(id!),
    queryFn: () => locationsService.getCompany(id!),
    enabled: !!id && isUserAuthenticated(),
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Company, 'id' | 'createdAt'>) => locationsService.createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.companiesList() });
      queryClient.invalidateQueries({ queryKey: locationKeys.tree() });
      queryClient.invalidateQueries({ queryKey: locationKeys.counts() });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) =>
      locationsService.updateCompany(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.companyDetail(id) });
      queryClient.invalidateQueries({ queryKey: locationKeys.companiesList() });
      queryClient.invalidateQueries({ queryKey: locationKeys.tree() });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => locationsService.deleteCompany(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: locationKeys.companyDetail(id) });
      queryClient.invalidateQueries({ queryKey: locationKeys.companiesList() });
      queryClient.invalidateQueries({ queryKey: locationKeys.tree() });
      queryClient.invalidateQueries({ queryKey: locationKeys.counts() });
    },
  });
}

// ============================================
// Sector Hooks
// ============================================

export function useSectors(companyId?: string) {
  return useQuery({
    queryKey: locationKeys.sectorsList(companyId),
    queryFn: () => locationsService.getSectors(companyId),
    staleTime: 1000 * 60 * 10,
    enabled: isUserAuthenticated(),
  });
}

export function useSector(id: string | null | undefined) {
  return useQuery({
    queryKey: locationKeys.sectorDetail(id!),
    queryFn: () => locationsService.getSector(id!),
    enabled: !!id && isUserAuthenticated(),
  });
}

export function useCreateSector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Sector, 'id'>) => locationsService.createSector(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.sectorsList() });
      queryClient.invalidateQueries({ queryKey: locationKeys.sectorsList(data.companyId) });
      queryClient.invalidateQueries({ queryKey: locationKeys.tree() });
      queryClient.invalidateQueries({ queryKey: locationKeys.counts() });
    },
  });
}

export function useUpdateSector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Sector> }) =>
      locationsService.updateSector(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.sectorDetail(id) });
      queryClient.invalidateQueries({ queryKey: locationKeys.sectorsList() });
      queryClient.invalidateQueries({ queryKey: locationKeys.tree() });
    },
  });
}

export function useDeleteSector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => locationsService.deleteSector(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: locationKeys.sectorDetail(id) });
      queryClient.invalidateQueries({ queryKey: locationKeys.sectorsList() });
      queryClient.invalidateQueries({ queryKey: locationKeys.tree() });
      queryClient.invalidateQueries({ queryKey: locationKeys.counts() });
    },
  });
}

// ============================================
// Subsection Hooks
// ============================================

export function useSubsections(sectorId?: string) {
  return useQuery({
    queryKey: locationKeys.subsectionsList(sectorId),
    queryFn: () => locationsService.getSubsections(sectorId),
    staleTime: 1000 * 60 * 10,
    enabled: isUserAuthenticated(),
  });
}

export function useSubsection(id: string | null | undefined) {
  return useQuery({
    queryKey: locationKeys.subsectionDetail(id!),
    queryFn: () => locationsService.getSubsection(id!),
    enabled: !!id && isUserAuthenticated(),
  });
}

export function useCreateSubsection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<SubSection, 'id'>) => locationsService.createSubsection(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.subsectionsList() });
      queryClient.invalidateQueries({ queryKey: locationKeys.subsectionsList(data.sectorId) });
      queryClient.invalidateQueries({ queryKey: locationKeys.tree() });
      queryClient.invalidateQueries({ queryKey: locationKeys.counts() });
    },
  });
}

export function useUpdateSubsection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubSection> }) =>
      locationsService.updateSubsection(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.subsectionDetail(id) });
      queryClient.invalidateQueries({ queryKey: locationKeys.subsectionsList() });
      queryClient.invalidateQueries({ queryKey: locationKeys.tree() });
    },
  });
}

export function useDeleteSubsection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => locationsService.deleteSubsection(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: locationKeys.subsectionDetail(id) });
      queryClient.invalidateQueries({ queryKey: locationKeys.subsectionsList() });
      queryClient.invalidateQueries({ queryKey: locationKeys.tree() });
      queryClient.invalidateQueries({ queryKey: locationKeys.counts() });
    },
  });
}

// ============================================
// Tree & Counts Hooks
// ============================================

export function useLocationTree() {
  return useQuery({
    queryKey: locationKeys.tree(),
    queryFn: () => locationsService.getTree(),
    staleTime: 1000 * 60 * 10,
    enabled: isUserAuthenticated(),
  });
}

export function useLocationCounts() {
  return useQuery({
    queryKey: locationKeys.counts(),
    queryFn: () => locationsService.getCounts(),
    staleTime: 1000 * 60 * 10,
    enabled: isUserAuthenticated(),
  });
}
