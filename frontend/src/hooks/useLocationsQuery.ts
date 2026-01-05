/**
 * React Query Hooks para Locations (Empresas, Unidades, Setores, Subsetores)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationsService } from '@/services/locationsService';
import { isUserAuthenticated } from '@/hooks/useAuth';
import type { Company, Unit, Sector, SubSection } from '@/types';

// ============================================
// Query Keys
// ============================================

export const locationKeys = {
  all: ['locations'] as const,
  
  // Companies
  companies: () => [...locationKeys.all, 'companies'] as const,
  companiesList: () => [...locationKeys.companies(), 'list'] as const,
  companyDetail: (id: string) => [...locationKeys.companies(), 'detail', id] as const,
  
  // Units
  units: () => [...locationKeys.all, 'units'] as const,
  unitsList: (companyId?: string) => [...locationKeys.units(), 'list', companyId] as const,
  unitDetail: (id: string) => [...locationKeys.units(), 'detail', id] as const,
  
  // Sectors
  sectors: () => [...locationKeys.all, 'sectors'] as const,
  sectorsList: (unitId?: string) => [...locationKeys.sectors(), 'list', unitId] as const,
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
// Unit Hooks
// ============================================

export function useUnits(companyId?: string) {
  return useQuery({
    queryKey: locationKeys.unitsList(companyId),
    queryFn: () => locationsService.getUnits(companyId),
    staleTime: 1000 * 60 * 10, // 10 minutos
    enabled: isUserAuthenticated(),
  });
}

export function useUnit(id: string | null | undefined) {
  return useQuery({
    queryKey: locationKeys.unitDetail(id!),
    queryFn: () => locationsService.getUnit(id!),
    enabled: !!id && isUserAuthenticated(),
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Unit, 'id' | 'createdAt'>) => locationsService.createUnit(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.unitsList() });
      queryClient.invalidateQueries({ queryKey: locationKeys.unitsList(data.companyId) });
      queryClient.invalidateQueries({ queryKey: locationKeys.tree() });
      queryClient.invalidateQueries({ queryKey: locationKeys.counts() });
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Unit> }) =>
      locationsService.updateUnit(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.unitDetail(id) });
      queryClient.invalidateQueries({ queryKey: locationKeys.unitsList() });
      queryClient.invalidateQueries({ queryKey: locationKeys.tree() });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => locationsService.deleteUnit(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: locationKeys.unitDetail(id) });
      queryClient.invalidateQueries({ queryKey: locationKeys.unitsList() });
      queryClient.invalidateQueries({ queryKey: locationKeys.tree() });
      queryClient.invalidateQueries({ queryKey: locationKeys.counts() });
    },
  });
}

// ============================================
// Sector Hooks
// ============================================

export function useSectors(unitId?: string) {
  return useQuery({
    queryKey: locationKeys.sectorsList(unitId),
    queryFn: () => locationsService.getSectors(unitId),
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
      queryClient.invalidateQueries({ queryKey: locationKeys.sectorsList(data.unitId) });
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
